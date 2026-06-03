import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const projectName = args[0];
const missionBrief = args[1] || 'A new project.';
const activeContext = args[2] || '';

if (!projectName) {
  console.error('Usage: node init-project.js <project-name> [mission-brief] [active-context]');
  process.exit(1);
}

const targetDir = path.join(process.cwd(), 'testP', projectName);

if (fs.existsSync(targetDir)) {
  console.error(`Error: Directory ${targetDir} already exists.`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

console.log(`Initializing project "${projectName}" at ${targetDir}...`);

// Generate README
const readmeContent = `# ${projectName}

> [!NOTE]
> ${missionBrief}

${activeContext ? `### Active Context\n${activeContext}\n` : ''}
Part of Theme_3 Family is a CLI tool that automates project setup and enforces CI/CD workflows. With a single command, it initializes your project by copying essential markdown files and configuring GitHub Actions for CI/CD.

### Workflow Branches CI/CD
- **main**: Push to NPM, merge from \`beta\`.
- **develop**: Create a new branch from \`main\`, merge/create to \`alpha\`.
- **feature**: Clone from \`develop\`. For feature testing, create a branch \`feature/[alpha]\` to test. Once testing is complete, merge back into \`feature/[main]\`. When done with the feature, merge into \`develop\`.
- **alpha**: Create the \`alpha\` branch from \`develop\`. Once \`alpha\` testing is complete, create the \`beta\` branch.
- **beta**: Create the \`beta\` branch from \`alpha\`. After beta testing, merge into \`main\`. Additional settings can be pushed to NPM if the environment variable is set to \`true\`.
`;
fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);

// Generate TODO.md
const todoContent = `# TODO
- [ ] Initialize project configuration
- [ ] Add basic features
`;
fs.writeFileSync(path.join(targetDir, 'TODO.md'), todoContent);

// Generate package.json
const packageJson = {
  name: projectName,
  version: "0.0.0",
  description: missionBrief,
  main: "src/index.js",
  scripts: {
    "test": "echo \"Error: no test specified\" && exit 1",
    "commit": "git-cz",
    "release:semver": "semantic-release --extends ./.releaserc-semver.js",
    "release:npm": "semantic-release --extends ./.releaserc-npm.js",
    "npm-publish-if-true": 'if [ "$NPM_PUBLISH" = "true" ]; then npm publish; else echo "NPM_PUBLISH is not true, skipping publish"; fi'
  },
  dependencies: {},
  devDependencies: {
    "@semantic-release/changelog": "^6.0.3",
    "@semantic-release/commit-analyzer": "^13.0.0",
    "@semantic-release/exec": "^6.0.3",
    "@semantic-release/git": "^10.0.1",
    "@semantic-release/github": "^10.3.3",
    "@semantic-release/npm": "^12.0.1",
    "@semantic-release/release-notes-generator": "^14.0.1",
    "commitizen": "^4.3.0",
    "conventional-changelog-conventionalcommits": "^8.0.0",
    "cross-env": "^7.0.3",
    "cz-conventional-changelog": "^3.3.0",
    "semantic-release": "^24.1.1"
  },
  config: {
    commitizen: {
      path: "./node_modules/cz-conventional-changelog"
    }
  }
};
fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));

// Generate basic CI/CD files
const releasercSemver = `module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: false }],
    '@semantic-release/git'
  ]
};`;
fs.writeFileSync(path.join(targetDir, '.releaserc-semver.js'), releasercSemver);

const releasercNpm = `module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    '@semantic-release/git'
  ]
};`;
fs.writeFileSync(path.join(targetDir, '.releaserc-npm.js'), releasercNpm);

// Markdown files
const mds = [
  'CHANGELOG.md', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 
  'DEVELOPMENT.md', 'INSTALL.md', 'SECURITY.md', 'TEST.md'
];

mds.forEach(file => {
  fs.writeFileSync(path.join(targetDir, file), `# ${file.replace('.md', '')}\n`);
});

// Directories
const dirs = ['src', 'testsrc', 'config', 'public', '.github', '.github/workflows'];
dirs.forEach(dir => {
  fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
});

// Github action
const actionContent = `name: Semantic Release
on:
  push:
    branches:
      - main
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Semantic Release
        run: npm run release:semver
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
fs.writeFileSync(path.join(targetDir, '.github', 'workflows', 'release.yml'), actionContent);

// Add empty .gitignore
fs.writeFileSync(path.join(targetDir, '.gitignore'), 'node_modules/\\ndist/\\n.env\\n');
fs.writeFileSync(path.join(targetDir, 'LICENSE'), 'MIT License');

console.log('Project initialization complete.');
console.log('');
console.log(`To get started:
  cd ${projectName}
  npm install`);
