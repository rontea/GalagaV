import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Custom middleware to handle System Halt and Disk Operations
const galagaSystemPlugin = () => ({
  name: 'galaga-system',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      
      const rootDir = (process as any).cwd();
      const pluginsDir = path.resolve(rootDir, 'plugins');

      // 1. ENDPOINT: LIST PLUGINS
      if (req.url?.startsWith('/__system/list-plugins') && req.method === 'GET') {
        const loadedPlugins: any[] = [];

        if (fs.existsSync(pluginsDir)) {
          try {
            const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                const publicDir = path.join(pluginsDir, entry.name, 'public');
                const manifestPath = path.join(publicDir, 'manifest.json');
                
                if (fs.existsSync(manifestPath)) {
                  try {
                    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
                    const manifest = JSON.parse(manifestContent);
                    const files: Record<string, string> = {};
                    
                    const readFile = (filename: string, mime: string) => {
                        const filePath = path.join(publicDir, filename);
                        if (fs.existsSync(filePath)) {
                            const content = fs.readFileSync(filePath, 'utf-8');
                            const b64 = (globalThis as any).Buffer.from(content).toString('base64');
                            files[filename] = `data:${mime};base64,${b64}`;
                        }
                    };

                    if (manifest.main) readFile(manifest.main, 'text/javascript');
                    if (manifest.style) readFile(manifest.style, 'text/css');

                    loadedPlugins.push({
                        id: manifest.id,
                        folderName: entry.name, // Tracking actual folder name for deletion precision
                        manifest: manifest,
                        files: files,
                        enabled: false
                    });
                  } catch (e) {
                    console.error(`Error loading plugin ${entry.name}:`, e);
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error scanning plugins dir:", e);
          }
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(loadedPlugins));
        return;
      }

      // 2. ENDPOINT: UPLOAD PLUGIN
      if (req.url?.startsWith('/__system/upload-plugin') && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { id, manifest, files } = JSON.parse(body);
                if (!id || !manifest) throw new Error("Missing ID or Manifest");

                const safeId = id.replace(/[^a-zA-Z0-9.-]/g, '_');
                const pluginDir = path.join(pluginsDir, safeId);
                const publicDir = path.join(pluginDir, 'public');

                if (fs.existsSync(pluginDir)) {
                    fs.rmSync(pluginDir, { recursive: true, force: true });
                }
                
                fs.mkdirSync(publicDir, { recursive: true });
                fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

                if (files) {
                    for (const [filename, content] of Object.entries(files)) {
                        const safeName = path.basename(filename);
                        fs.writeFileSync(path.join(publicDir, safeName), content as string);
                    }
                }

                console.log(`\x1b[32m [SYSTEM] Plugin installed: ${safeId} \x1b[0m`);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
            } catch (e: any) {
                console.error("Upload failed:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
      }

      // 3. ENDPOINT: DESTROY PLUGIN (Delete Disk)
      if (req.url?.startsWith('/__system/destroy-plugin')) {
        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const pluginId = urlObj.searchParams.get('id');
          
          if (pluginId) {
            console.log(`\n\x1b[41m\x1b[37m [SYSTEM] DESTRUCTION REQUEST FOR: ${pluginId} \x1b[0m`);
            
            // 1. Send acknowledgement
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ status: 'halting', id: pluginId }));
            
            // 2. Schedule Halt
            setTimeout(async () => {
               try {
                   console.log(`\x1b[33m [SERVER] Releasing file watchers... \x1b[0m`);
                   await server.close(); 

                   // 3. Scan for the specific folder belonging to this ID
                   // We don't rely solely on sanitized ID; we look for the manifest.
                   let targetPath: string | null = null;
                   
                   if (fs.existsSync(pluginsDir)) {
                       const entries = fs.readdirSync(pluginsDir);
                       for (const folder of entries) {
                           const mPath = path.join(pluginsDir, folder, 'public', 'manifest.json');
                           if (fs.existsSync(mPath)) {
                               const mData = JSON.parse(fs.readFileSync(mPath, 'utf-8'));
                               if (mData.id === pluginId) {
                                   targetPath = path.join(pluginsDir, folder);
                                   break;
                               }
                           }
                       }
                   }

                   // Fallback: use sanitized ID logic if manifest scan failed
                   if (!targetPath) {
                       const safeId = pluginId.replace(/[^a-zA-Z0-9.-]/g, '_');
                       targetPath = path.join(pluginsDir, safeId);
                   }

                   console.log(`\x1b[33m [DISK] Absolute Target: ${targetPath} \x1b[0m`);
                   
                   if (fs.existsSync(targetPath)) {
                      await new Promise(r => setTimeout(r, 1000)); // Buffer for OS file locks
                      
                      // Aggressive removal
                      fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
                      
                      if (!fs.existsSync(targetPath)) {
                        console.log(`\x1b[32m [DISK] SUCCESS: Deleted ${targetPath} \x1b[0m`);
                      } else {
                        console.error(`\x1b[31m [ERROR] Directory still exists after deletion attempt. \x1b[0m`);
                      }
                   } else {
                      console.log(`\x1b[33m [DISK] Target path not found. Already clean. \x1b[0m`);
                   }
               } catch (err) {
                   console.error(`\x1b[31m [FATAL] Destruction error: ${err} \x1b[0m`);
               } finally {
                   console.log('\x1b[41m\x1b[37m [SYSTEM] HALTED. \x1b[0m\n');
                   (process as any).exit(0);
               }
            }, 500);
            
            return;
          }
        } catch (e) {
            console.error("Destroy handler error:", e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Internal Server Error" }));
            return;
        }
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), galagaSystemPlugin()],
  server: {
    port: 5173, 
    host: true, 
  }
});