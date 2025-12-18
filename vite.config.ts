
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
            const pluginFolders = fs.readdirSync(pluginsDir, { withFileTypes: true });
            
            for (const folder of pluginFolders) {
              if (folder.isDirectory()) {
                const pluginPath = path.join(pluginsDir, folder.name);
                
                // Search for manifest.json in root, public, or dist
                const searchPaths = [
                    path.join(pluginPath, 'public', 'manifest.json'),
                    path.join(pluginPath, 'dist', 'manifest.json'),
                    path.join(pluginPath, 'manifest.json')
                ];

                let manifestPath = searchPaths.find(p => fs.existsSync(p));
                
                if (manifestPath) {
                  try {
                    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
                    const manifest = JSON.parse(manifestContent);
                    const manifestBaseDir = path.dirname(manifestPath);
                    const files: Record<string, string> = {};
                    
                    const tryReadFile = (filename: string, mime: string) => {
                        // 1. Try relative to manifest
                        let filePath = path.join(manifestBaseDir, filename);
                        
                        // 2. Fallback: try relative to plugin root
                        if (!fs.existsSync(filePath)) {
                            filePath = path.join(pluginPath, filename);
                        }
                        
                        // 3. Fallback: try in dist or public if manifest was elsewhere
                        if (!fs.existsSync(filePath)) {
                            const altPaths = [
                                path.join(pluginPath, 'dist', filename),
                                path.join(pluginPath, 'public', filename),
                                path.join(pluginPath, 'src', filename) // support dev src
                            ];
                            filePath = altPaths.find(p => fs.existsSync(p)) || filePath;
                        }

                        if (fs.existsSync(filePath)) {
                            const content = fs.readFileSync(filePath);
                            const b64 = content.toString('base64');
                            files[filename] = `data:${mime};base64,${b64}`;
                            return true;
                        }
                        return false;
                    };

                    const mainFound = manifest.main ? tryReadFile(manifest.main, 'text/javascript') : false;
                    const styleFound = manifest.style ? tryReadFile(manifest.style, 'text/css') : false;

                    if (mainFound) {
                        loadedPlugins.push({
                            id: manifest.id,
                            folderName: folder.name,
                            manifest: manifest,
                            files: files,
                            enabled: false
                        });
                    } else {
                        console.warn(`[SYSTEM] Plugin '${manifest.name}' ignored: Main entry file '${manifest.main}' not found.`);
                    }
                  } catch (e) {
                    console.error(`Error loading plugin ${folder.name}:`, e);
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
                if (!id || !manifest) throw new Error("Missing ID or Manifest data in payload");

                const safeId = id.replace(/[^a-zA-Z0-9.-]/g, '_');
                const pluginDir = path.join(pluginsDir, safeId);
                const publicDir = path.join(pluginDir, 'public');

                if (fs.existsSync(pluginDir)) {
                    fs.rmSync(pluginDir, { recursive: true, force: true });
                }
                
                fs.mkdirSync(publicDir, { recursive: true });
                
                // Write Manifest
                fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

                // Write Files
                if (files) {
                    for (const [filename, content] of Object.entries(files)) {
                        const safeName = path.basename(filename);
                        fs.writeFileSync(path.join(publicDir, safeName), content as string);
                        console.log(`[SYSTEM] Written asset to disk: ${safeName}`);
                    }
                }

                console.log(`\x1b[32m [SYSTEM] Plugin installed successfully: ${safeId} \x1b[0m`);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
            } catch (e: any) {
                console.error("[SYSTEM] Upload failed:", e);
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
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ status: 'halting', id: pluginId }));
            
            setTimeout(async () => {
               try {
                   console.log(`\x1b[33m [SERVER] Releasing file watchers... \x1b[0m`);
                   await server.close(); 

                   let targetPath: string | null = null;
                   
                   if (fs.existsSync(pluginsDir)) {
                       const entries = fs.readdirSync(pluginsDir);
                       for (const folder of entries) {
                           const pluginFolderPath = path.join(pluginsDir, folder);
                           // Check multiple manifest locations for the ID
                           const possibleManifests = [
                               path.join(pluginFolderPath, 'public', 'manifest.json'),
                               path.join(pluginFolderPath, 'dist', 'manifest.json'),
                               path.join(pluginFolderPath, 'manifest.json')
                           ];

                           for (const mPath of possibleManifests) {
                               if (fs.existsSync(mPath)) {
                                   const mData = JSON.parse(fs.readFileSync(mPath, 'utf-8'));
                                   if (mData.id === pluginId) {
                                       targetPath = pluginFolderPath;
                                       break;
                                   }
                               }
                           }
                           if (targetPath) break;
                       }
                   }

                   if (!targetPath) {
                       const safeId = pluginId.replace(/[^a-zA-Z0-9.-]/g, '_');
                       targetPath = path.join(pluginsDir, safeId);
                   }

                   console.log(`\x1b[33m [DISK] Absolute Target: ${targetPath} \x1b[0m`);
                   
                   if (fs.existsSync(targetPath)) {
                      await new Promise(r => setTimeout(r, 1000));
                      fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
                      console.log(`\x1b[32m [DISK] SUCCESS: Deleted ${targetPath} \x1b[0m`);
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
