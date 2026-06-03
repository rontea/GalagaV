import { Request, Response } from 'express';
import { spawn, execSync } from 'child_process';
import path from 'path';

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

export class TerminalController {
  static execute(req: Request, res: Response) {
    let { command, cwd, sync } = req.body;
    if (!command) {
      res.status(400).json({ error: 'Command is required' });
      return;
    }

    cwd = normalizeWindowsPath(cwd);

    const resolvedCwd = (() => {
      if (!cwd) return process.cwd();
      if (path.isAbsolute(cwd) || /^[a-zA-Z]:[/\\]/.test(cwd) || cwd.startsWith('/') || cwd.startsWith('\\')) {
        return cwd;
      }
      const relativePart = cwd.replace(/^[/\\]+/, '');
      const siblingProjectPath = path.resolve(process.cwd(), '..', relativePart);
      return siblingProjectPath;
    })();

    if (sync) {
      try {
        const output = execSync(command, { cwd: resolvedCwd, encoding: 'utf-8', shell: true } as any);
        res.json({ success: true, output });
        return;
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, output: err.stdout?.toString(), stderr: err.stderr?.toString() });
        return;
      }
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      const child = spawn(command, { 
        shell: true, 
        cwd: resolvedCwd 
      });

      child.stdout.on('data', (data) => {
        res.write(JSON.stringify({ type: 'stdout', data: data.toString() }) + '\n');
      });

      child.stderr.on('data', (data) => {
        res.write(JSON.stringify({ type: 'stderr', data: data.toString() }) + '\n');
      });

      child.on('error', (error) => {
        res.write(JSON.stringify({ type: 'error', data: error.message }) + '\n');
      });

      child.on('close', (code) => {
        res.write(JSON.stringify({ type: 'close', code }) + '\n');
        res.end();
      });
    } catch (err: any) {
      res.write(JSON.stringify({ type: 'error', data: `Failed to start terminal process: ${err.message}` }) + '\n');
      res.write(JSON.stringify({ type: 'close', code: 1 }) + '\n');
      res.end();
    }
  }
}
