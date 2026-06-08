import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { execSync, exec, execFileSync } from "child_process";
import JSZip from "jszip";
import net from "net";
import { TodoController } from "./src/backend/controllers/TodoController";
import { TodosMiddleware } from "./src/backend/middleware/TodosMiddleware";
import { TerminalController } from "./src/backend/controllers/TerminalController";
import chokidar from "chokidar";
import { TodoService } from "./src/backend/services/TodoService";

function normalizeWindowsPath(p: string | undefined): string | undefined {
  if (!p) return p;
  if (process.platform === 'win32') {
    const msysRegex = /^\/([a-zA-Z])(\/.*)?$/;
    const match = p.match(msysRegex);
    if (match) {
      const drive = match[1].toUpperCase();
      const rest = match[2] ? match[2].replace(/\//g, '\\') : '';
      return `${drive}:${rest || '\\'}`;
    }
  }
  return p;
}

function resolveProjectPath(rawPath: string | undefined): string {
  const normalizedPath = normalizeWindowsPath(rawPath) || process.cwd();
  if (isAbsoluteSystemPath(normalizedPath)) {
    return normalizedPath;
  }

  const relativePart = normalizedPath.replace(/^[/\\]+/, '');
  const siblingProjectPath = path.resolve(process.cwd(), '..', relativePart);
  return siblingProjectPath;
}

function isAbsoluteSystemPath(p: string): boolean {
  return (
    path.isAbsolute(p) ||
    /^[a-zA-Z]:[/\\]/.test(p) ||
    p.startsWith('/') ||
    p.startsWith('\\')
  );
}

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 15000,
    windowsHide: true,
  }).trim();
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, '0.0.0.0');
  });
}

function getSemverReleaseConfigContent(): string {
  return `module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: false }],
    ['@semantic-release/git', {
      assets: ['package.json', 'package-lock.json', 'CHANGELOG.md'],
      message: 'chore(release): \${nextRelease.version} [skip ci]\\n\\n\${nextRelease.notes}'
    }]
  ]
};
`;
}

function getSemverWorkflowContent(branch = 'main'): string {
  return `name: Semantic Release

on:
  push:
    branches:
      - ${branch}

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run semantic release
        run: npm run release:semver
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
}

function findNearestGitRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }

  return null;
}

function findUp(startDir: string, fileName: string): string | null {
  let dir = startDir;
  while (dir) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }

  return null;
}

function getGitBranchInfo(cwd: string) {
  try {
    const remotes = runGit(cwd, ['remote']).split(/\r?\n/).filter(Boolean);
    if (remotes.length > 0) {
      try {
        runGit(cwd, ['fetch', '--all', '--prune']);
      } catch (e) {
        // Keep listing cached remote refs if the network is unavailable.
      }
    }

    let currentBranch = '';
    try {
      currentBranch = runGit(cwd, ['branch', '--show-current']);
    } catch (e) {}

    const refsOutput = runGit(cwd, [
      'for-each-ref',
      '--format=%(refname:short)',
      'refs/heads',
      'refs/remotes',
    ]);

    const branches = new Set<string>();
    const localBranches = new Set<string>();
    const remoteBranches = new Set<string>();

    refsOutput.split(/\r?\n/).map(ref => ref.trim()).filter(Boolean).forEach(ref => {
      if (ref.endsWith('/HEAD')) return;
      if (remotes.includes(ref)) return;

      const remoteMatch = ref.match(/^([^/]+)\/(.+)$/);
      if (remoteMatch && remotes.includes(remoteMatch[1])) {
        const shortName = remoteMatch[2];
        remoteBranches.add(ref);
        branches.add(shortName);
        return;
      }

      localBranches.add(ref);
      branches.add(ref);
    });

    if (currentBranch) branches.add(currentBranch);

    return {
      success: true,
      currentBranch: currentBranch || 'Unknown',
      branches: Array.from(branches).sort((a, b) => {
        if (a === currentBranch) return -1;
        if (b === currentBranch) return 1;
        return a.localeCompare(b);
      }),
      localBranches: Array.from(localBranches),
      remoteBranches: Array.from(remoteBranches),
    };
  } catch (e: any) {
    return {
      success: false,
      currentBranch: 'Unknown',
      branches: [],
      localBranches: [],
      remoteBranches: [],
      error: e.stderr?.toString() || e.message || 'Failed to read git branches',
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const HMR_PORT = Number(process.env.HMR_PORT || PORT + 21678);

  if (!(await isPortAvailable(PORT))) {
    console.error(`Port ${PORT} is already in use. GalagaV may already be running at http://localhost:${PORT}.`);
    console.error(`Stop the existing Node process or start this server with a different PORT, for example: $env:PORT=3001; npm run dev`);
    process.exit(1);
  }

  // Watch for TODO.md changes
  const watcher = chokidar.watch(path.join(process.cwd(), 'TODO.md'), {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', (filePath) => {
    if (TodoService.getSyncing()) return;
    console.log(`File ${filePath} has been changed, syncing...`);
    try {
      TodoService.syncFromFiles(undefined, undefined, undefined, { allowAppFallback: true });
    } catch (e) {
      console.error('Error syncing from file watcher:', e);
    }
  });

  // Add CORS support so it can run on localhost as well
  app.use(cors());

  // __system routes for local development outside of AI Studio proxy
  app.get('/__system/db-load', (req, res) => {
    const dbPath = path.join(process.cwd(), 'storage', 'galagav.sqlite');
    if (fs.existsSync(dbPath)) {
      res.sendFile(dbPath);
    } else {
      res.status(404).send('Not found');
    }
  });

  app.post('/__system/db-save', express.raw({ type: 'application/octet-stream', limit: '50mb' }), (req, res) => {
    const dbDir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'galagav.sqlite');
    fs.writeFileSync(dbPath, req.body);
    res.send('Saved');
  });

  // Architect save SQL
  app.post('/__system/architect/save-sql', express.json(), (req, res) => {
    const { sql, filename } = req.body;
    if (sql && filename) {
      const dbDir = path.join(process.cwd(), 'storage');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(path.join(dbDir, filename), sql);
    }
    res.send({ status: 'ok' });
  });

  // Mock list plugins
  app.get('/__system/list-plugins', (req, res) => {
    // Basic local mock
    const pluginsPath = path.join(process.cwd(), 'plugins');
    const plugins = [];
    if (fs.existsSync(pluginsPath)) {
       const dirs = fs.readdirSync(pluginsPath);
       for (const d of dirs) {
          const configPath = path.join(pluginsPath, d, 'package.json');
          if(fs.existsSync(configPath)) {
            try {
              const p=JSON.parse(fs.readFileSync(configPath, 'utf8'));
              plugins.push({
                 id: p.name,
                 name: p.name,
                 description: p.description,
                 entryFile: `/plugins/${d}/${p.main || 'src/index.tsx'}`
              });
            } catch(e){}
          }
       }
    }
    res.json(plugins);
  });

  app.post('/__system/delete-plugin', express.json(), (req, res) => {
     res.send({ status: 'ok' });
  });

  // Parses incoming JSON payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API ROUTES (Backend TODO Logic)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get('/api/download/:projectName', async (req, res) => {
    const { projectName: rawProjectName } = req.params;
    const projectName = rawProjectName.trim();

    // Security check: Prevent path traversal
    if (projectName.includes('..') || projectName.includes('/') || projectName.includes('\\')) {
      res.status(400).json({ error: "Invalid project name" });
      return;
    }

    const baseDir = process.cwd();
    const projectDir = path.resolve(baseDir, projectName);

    console.log(`Downloading project: ${projectName}, baseDir: ${baseDir}, projectDir: ${projectDir}`);

    // Ensure the resolved directory is within the base directory
    if (!projectDir.startsWith(baseDir) || !fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    try {
      const zip = new JSZip();

      const addFilesToZip = (dirPath: string, zipFolder: JSZip) => {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file === 'node_modules') continue;
          const filePath = path.join(dirPath, file);
          console.log(`Processing: ${filePath}`);
          if (fs.statSync(filePath).isDirectory()) {
            addFilesToZip(filePath, zipFolder.folder(file)!);
          } else {
            zipFolder.file(file, fs.readFileSync(filePath));
          }
        }
      };

      addFilesToZip(projectDir, zip);
      const content = await zip.generateAsync({ type: "nodebuffer" });
      res.setHeader("Content-Disposition", `attachment; filename=${projectName}.zip`);
      res.setHeader("Content-Type", "application/zip");
      res.send(content);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to zip project" });
    }
  });

  app.get('/api/get/todos', TodoController.getTodos);
  app.post('/api/addtodo', TodoController.addTodo);
  app.post('/api/updatetodo', TodoController.updateTodo);
  
  app.get('/api/get/statuses', TodoController.getStatuses);
  app.post('/api/addstatuses', TodoController.addStatuses);
  
  app.get('/api/get/types', TodoController.getTypes);
  app.post('/api/addtypes', TodoController.addTypes);

  app.get('/api/get/collections', TodoController.getCollections);
  app.post('/api/addcollections', TodoController.addCollections);
  
  app.get('/api/get/contributors', TodoController.getAssign);
  app.post('/api/addContributor', TodosMiddleware.validateContributors, TodoController.addContributor);

  app.get('/api/get/developers', TodoController.getDevelopers);
  app.post('/api/addDeveloper', TodosMiddleware.validateContributors, TodoController.addDeveloper);
  app.post('/api/exporttodo', TodoController.exportTodo);
  app.post('/api/exporttodos', TodoController.exportTodos);
  app.post('/api/syncfromfiles', TodoController.syncFromFiles);
  app.post('/api/deletetodo', TodoController.deleteTodo);
  app.post('/api/archivetodo', TodoController.archiveTodo);
  app.post('/api/viewtodofile', TodoController.viewTodoFile);
  app.post('/api/viewglobaltodofile', TodoController.viewGlobalTodoFile);
  app.post('/api/generate-commit-message', TodoController.generateCommitMessage);

  app.post('/api/terminal/execute', TerminalController.execute);

  app.get('/api/git/branches', (req, res) => {
    const cwd = resolveProjectPath(req.query.cwd as string | undefined);
    res.json(getGitBranchInfo(cwd));
  });

  app.post('/api/git/checkout', (req, res) => {
    try {
      const cwd = resolveProjectPath(req.body.cwd);
      const branch = String(req.body.branch || '').trim();

      if (!branch) {
        res.status(400).json({ success: false, error: 'Branch is required' });
        return;
      }

      const info = getGitBranchInfo(cwd);
      if (!info.success) {
        res.status(500).json(info);
        return;
      }

      const localBranches = new Set(info.localBranches);
      const remoteBranches = new Set(info.remoteBranches);
      const matchingRemote = info.remoteBranches.find(remoteRef => {
        const [, shortName] = remoteRef.match(/^([^/]+)\/(.+)$/) || [];
        return shortName === branch || remoteRef === branch;
      });

      if (localBranches.has(branch)) {
        runGit(cwd, ['switch', branch]);
      } else if (matchingRemote) {
        const [, shortName] = matchingRemote.match(/^([^/]+)\/(.+)$/) || [];
        const localName = shortName || branch;
        if (localBranches.has(localName)) {
          runGit(cwd, ['switch', localName]);
        } else {
          runGit(cwd, ['switch', '--track', matchingRemote]);
        }
      } else {
        runGit(cwd, ['switch', branch]);
      }

      res.json(getGitBranchInfo(cwd));
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: e.stderr?.toString() || e.message || 'Failed to switch branch',
      });
    }
  });

  app.post('/api/git/push', (req, res) => {
    try {
      const cwd = resolveProjectPath(req.body.cwd);
      const branch = String(req.body.branch || '').trim() || runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);

      if (!branch || branch === 'HEAD') {
        res.status(400).json({ success: false, error: 'Cannot determine current branch to push.' });
        return;
      }

      const output = runGit(cwd, ['push', 'origin', branch]);
      res.json({ success: true, branch, output });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: e.stderr?.toString() || e.message || 'Failed to push branch to origin',
      });
    }
  });

  app.post('/api/init-folders', (req, res) => {
    try {
      let { localFolderPath, initGit, todoFolderPath } = req.body;
      localFolderPath = normalizeWindowsPath(localFolderPath);
      todoFolderPath = normalizeWindowsPath(todoFolderPath);
      
      if (localFolderPath && localFolderPath.trim() !== '') {
         const resolvedLocal = resolveProjectPath(localFolderPath);
         if (!fs.existsSync(resolvedLocal)) {
            res.status(400).json({
              success: false,
              error: `Local folder does not exist: ${resolvedLocal}. Add Project links to an existing folder and will not create or copy the project folder.`,
            });
            return;
         }
         if (!fs.statSync(resolvedLocal).isDirectory()) {
            res.status(400).json({
              success: false,
              error: `Local folder path is not a directory: ${resolvedLocal}`,
            });
            return;
         }
         if (initGit) {
           const gitDir = path.join(resolvedLocal, '.git');
           if (!fs.existsSync(gitDir)) {
             execSync('git init -b main', { cwd: resolvedLocal, stdio: 'ignore' });
             execSync('git config user.name "Project Pilot"', { cwd: resolvedLocal, stdio: 'ignore' });
             execSync('git config user.email "pilot@galagav.local"', { cwd: resolvedLocal, stdio: 'ignore' });
           }
         }
         if (todoFolderPath && todoFolderPath.trim() !== '') {
           const resolvedTodo = isAbsoluteSystemPath(todoFolderPath) ? todoFolderPath : path.resolve(resolvedLocal, todoFolderPath);
           if (!fs.existsSync(resolvedTodo)) {
             fs.mkdirSync(resolvedTodo, { recursive: true });
           }
         }
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error('Init folders error:', e);
      res.json({ success: false, error: e.message });
    }
  });

  app.post('/api/semantic-release/configure', (req, res) => {
    try {
      let { localFolderPath, defaultBranch } = req.body;
      localFolderPath = normalizeWindowsPath(localFolderPath);

      if (!localFolderPath || localFolderPath.trim() === '') {
        res.status(400).json({ success: false, error: 'Local Folder Path is required.' });
        return;
      }

      const requestedPath = localFolderPath.trim();
      if (requestedPath === '.' || requestedPath === './' || requestedPath === '.\\') {
        res.status(400).json({
          success: false,
          error: 'Choose a specific project folder path before configuring semantic release.',
        });
        return;
      }

      const resolvedLocal = resolveProjectPath(localFolderPath);
      if (!fs.existsSync(resolvedLocal) || !fs.statSync(resolvedLocal).isDirectory()) {
        res.status(400).json({
          success: false,
          error: `Local folder does not exist or is not a directory: ${resolvedLocal}`,
        });
        return;
      }

      let branch = String(defaultBranch || '').trim();
      if (!branch) {
        try {
          branch = runGit(resolvedLocal, ['branch', '--show-current']);
        } catch (e) {}
      }
      if (!branch || branch === 'Unknown') {
        branch = 'main';
      }

      const packageJsonPath = path.join(resolvedLocal, 'package.json');
      let pkg: any = {
        name: path.basename(resolvedLocal).toLowerCase().replace(/[^a-z0-9._-]+/g, '-'),
        version: '0.0.0',
        private: true,
      };

      if (fs.existsSync(packageJsonPath)) {
        try {
          pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        } catch (e: any) {
          res.status(400).json({
            success: false,
            error: `Could not parse package.json: ${e.message}`,
          });
          return;
        }
      }

      pkg.version = pkg.version || '0.0.0';
      pkg.scripts = {
        ...(pkg.scripts || {}),
        commit: pkg.scripts?.commit || 'git-cz',
        'release:semver': 'semantic-release --extends ./.releaserc-semver.cjs',
      };
      pkg.devDependencies = {
        ...(pkg.devDependencies || {}),
        '@semantic-release/changelog': pkg.devDependencies?.['@semantic-release/changelog'] || '^6.0.3',
        '@semantic-release/commit-analyzer': pkg.devDependencies?.['@semantic-release/commit-analyzer'] || '^13.0.0',
        '@semantic-release/git': pkg.devDependencies?.['@semantic-release/git'] || '^10.0.1',
        '@semantic-release/npm': pkg.devDependencies?.['@semantic-release/npm'] || '^12.0.1',
        '@semantic-release/release-notes-generator': pkg.devDependencies?.['@semantic-release/release-notes-generator'] || '^14.0.1',
        commitizen: pkg.devDependencies?.commitizen || '^4.3.0',
        'conventional-changelog-conventionalcommits': pkg.devDependencies?.['conventional-changelog-conventionalcommits'] || '^8.0.0',
        'cz-conventional-changelog': pkg.devDependencies?.['cz-conventional-changelog'] || '^3.3.0',
        'semantic-release': pkg.devDependencies?.['semantic-release'] || '^24.1.1',
      };
      pkg.config = {
        ...(pkg.config || {}),
        commitizen: {
          ...(pkg.config?.commitizen || {}),
          path: './node_modules/cz-conventional-changelog',
        },
      };

      fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);

      const releasercPath = path.join(resolvedLocal, '.releaserc-semver.cjs');
      fs.writeFileSync(releasercPath, getSemverReleaseConfigContent());

      const workflowsDir = path.join(resolvedLocal, '.github', 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });
      const workflowPath = path.join(workflowsDir, 'release.yml');
      fs.writeFileSync(workflowPath, getSemverWorkflowContent(branch));

      const changelogPath = path.join(resolvedLocal, 'CHANGELOG.md');
      if (!fs.existsSync(changelogPath)) {
        fs.writeFileSync(changelogPath, '# Changelog\n\n');
      }

      res.json({
        success: true,
        localFolderPath: resolvedLocal,
        defaultBranch: branch,
        files: {
          packageJsonPath,
          releasercPath,
          workflowPath,
          changelogPath,
        },
      });
    } catch (e: any) {
      console.error('Semantic release configure error:', e);
      res.status(500).json({ success: false, error: e.message || 'Failed to configure semantic release.' });
    }
  });

  app.get('/api/project-info', async (req, res) => {
    try {
      const rawCwd = (req.query.cwd as string) || process.cwd();
      const baseDir = resolveProjectPath(rawCwd);

      if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
        res.status(404).json({
          systemVersion: 'Unknown',
          currentBranch: 'Unknown',
          error: `Local folder does not exist: ${baseDir}`,
        });
        return;
      }
      
      // Ensure the directory is trusted by git to avoid dubious ownership errors
      try {
        execSync('git config --global --add safe.directory "*"', { stdio: 'ignore' });
      } catch (e) {}

      let systemVersion = 'Unknown';
      let semanticReleaseEnabled = false;
      let packageJsonPath: string | null = null;
      let releaseScript: string | null = null;
      let commitizenConfigured = false;

      packageJsonPath = findUp(baseDir, 'package.json');
      if (packageJsonPath) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          systemVersion = pkg.version || 'Unknown';
          releaseScript = typeof pkg.scripts?.['release:semver'] === 'string' ? pkg.scripts['release:semver'] : null;
          commitizenConfigured = Boolean(pkg.config?.commitizen);
        } catch (e) {}
      }

      const releasercPath = findUp(baseDir, '.releaserc-semver.cjs') || findUp(baseDir, '.releaserc-semver.js');
      const workflowPath = findUp(baseDir, path.join('.github', 'workflows', 'release.yml'));
      const releasercContent = releasercPath ? fs.readFileSync(releasercPath, 'utf8') : '';
      const workflowContent = workflowPath ? fs.readFileSync(workflowPath, 'utf8') : '';

      const semverWorkflow = {
        version: systemVersion,
        packageJsonPath,
        configPath: releasercPath,
        workflowPath,
        releaseScript,
        commitizenConfigured,
        semanticReleaseConfigured: Boolean(releaseScript || releasercPath || commitizenConfigured),
        changelogEnabled: releasercContent.includes('@semantic-release/changelog'),
        packageVersionWritesEnabled: releasercContent.includes('@semantic-release/npm'),
        gitCommitEnabled: releasercContent.includes('@semantic-release/git'),
        githubActionsEnabled: workflowContent.includes('release:semver') || workflowContent.includes('semantic-release'),
      };

      semanticReleaseEnabled = semverWorkflow.semanticReleaseConfigured;

      const gitRoot = findNearestGitRoot(baseDir);
      if (!gitRoot) {
        res.json({
          systemVersion,
          currentBranch: 'Unknown',
          semanticReleaseEnabled,
          semverWorkflow,
          error: `No git repository found at or above: ${baseDir}`,
        });
        return;
      }

      // Native git branch resolver using .git/HEAD
      let currentBranch = 'Unknown';
      const gitHeadPath = path.join(gitRoot, '.git', 'HEAD');
      if (fs.existsSync(gitHeadPath)) {
        try {
          const headContent = fs.readFileSync(gitHeadPath, 'utf8').trim();
          if (headContent.startsWith('ref: ')) {
             currentBranch = headContent.replace('ref: refs/heads/', '').trim();
          } else if (headContent.length === 40 || headContent.length === 64) {
             currentBranch = 'detached (' + headContent.substring(0, 7) + ')';
          }
        } catch (e) {}
      } else {
        try {
          currentBranch = runGit(gitRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
          if (currentBranch === 'HEAD') {
            const commit = runGit(gitRoot, ['rev-parse', '--short', 'HEAD']);
            currentBranch = `detached (${commit})`;
          }
        } catch (e) {
          currentBranch = 'Unknown';
        }
      }

      if (currentBranch === 'Unknown') {
        // Try to get current branch using git cli as backup
        exec('git branch --show-current', { cwd: gitRoot }, (err: any, stdout: string) => {
          let cliBranch = err ? 'Unknown' : stdout.trim();
          
          if (cliBranch === 'Unknown' || !cliBranch) {
            exec('git rev-parse --abbrev-ref HEAD', { cwd: gitRoot }, (err2: any, stdout2: string) => {
              cliBranch = err2 ? 'Unknown' : stdout2.trim();
              res.json({ systemVersion, currentBranch: cliBranch, gitRoot, semanticReleaseEnabled, semverWorkflow });
            });
          } else {
            res.json({ systemVersion, currentBranch: cliBranch, gitRoot, semanticReleaseEnabled, semverWorkflow });
          }
        });
      } else {
        res.json({ systemVersion, currentBranch, gitRoot, semanticReleaseEnabled, semverWorkflow });
      }
    } catch (e) {
      res.json({ systemVersion: 'Unknown', currentBranch: 'Unknown' });
    }
  });

  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { port: HMR_PORT },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. GalagaV may already be running at http://localhost:${PORT}.`);
      console.error(`Stop the existing Node process or start this server with a different PORT, for example: $env:PORT=3001; npm run dev`);
      process.exit(1);
    }

    throw err;
  });
}

startServer();
