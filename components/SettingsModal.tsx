
import React, { useState, useEffect } from 'react';
import { Settings, X, Terminal, Trash2, Power, Upload, Package, Check, Ban, Loader2, HardDrive, RefreshCw, Eraser } from 'lucide-react';
import { GlobalConfig, PluginConfig, PluginManifest } from '../types';
import ConfirmModal from './ConfirmModal';
import { FULL_ICON_MAP, DEFAULT_PROJECT_KEYS, DEFAULT_STATUS_KEYS } from './ProjectList';
import JSZip from 'jszip';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GlobalConfig;
  onUpdateConfig: (newConfig: GlobalConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onUpdateConfig }) => {
  const [activeTab, setActiveTab] = useState<'project' | 'status' | 'plugins' | 'help'>('project');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uninstallConfirm, setUninstallConfirm] = React.useState<{ isOpen: boolean; id?: string }>({ isOpen: false });
  
  if (!isOpen) return null;

  const handleTogglePlugin = (id: string) => {
    const updatedPlugins = (config.plugins || []).map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    onUpdateConfig({ ...config, plugins: updatedPlugins });
    setTimeout(() => window.location.reload(), 150);
  };

  const handleSyncWithDisk = async () => {
    setIsSyncing(true);
    setUploadError(null);
    setInstallSuccess(null);
    try {
      const response = await fetch('/__system/list-plugins');
      if (response.ok) {
        const diskPlugins: PluginConfig[] = await response.json();
        const updatedPlugins = [...(config.plugins || [])];
        let updateCount = 0;
        let newCount = 0;
        
        diskPlugins.forEach(dp => {
          const idx = updatedPlugins.findIndex(p => p.id === dp.id);
          if (idx === -1) {
            updatedPlugins.push({ ...dp, enabled: true });
            newCount++;
          } else {
            const existing = updatedPlugins[idx];
            // Deep check to see if content changed
            const diskContent = JSON.stringify({ m: dp.manifest, f: dp.files });
            const existingContent = JSON.stringify({ m: existing.manifest, f: existing.files });
            
            if (diskContent !== existingContent) {
              updatedPlugins[idx] = { ...dp, enabled: existing.enabled };
              updateCount++;
            }
          }
        });

        if (updateCount > 0 || newCount > 0) {
          onUpdateConfig({ ...config, plugins: updatedPlugins });
          setInstallSuccess(`Sync Complete: Found ${newCount} new and ${updateCount} updated modules.`);
          // If we updated something currently enabled, a reload might be best, 
          // but hook usePluginLoader should handle it via content-hashing.
        } else {
          setInstallSuccess("Sync Complete: No changes found on disk.");
        }
        
        setTimeout(() => setInstallSuccess(null), 4000);
      }
    } catch (e) {
      setUploadError("Disk Sync failed. Are you running the local dev server?");
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Hard Reload: Purges the plugin from the window object and removes DOM elements.
   * Useful during development when the plugin source code has been rebuilt.
   */
  const handleReloadPlugin = (plugin: PluginConfig) => {
    const globalVar = plugin.manifest.globalVar;
    
    // We use wildcard removal because hooks use content-hashes in IDs
    const scriptPrefix = `plugin-script-${plugin.id}-`;
    const stylePrefix = `plugin-style-${plugin.id}-`;

    console.log(`[PLUGIN_SYSTEM] Purging runtime cache for: ${plugin.id}`);

    // 1. Remove from Global Scope
    if ((window as any)[globalVar]) {
        delete (window as any)[globalVar];
    }

    // 2. Remove DOM Elements
    document.querySelectorAll(`script[id^="${scriptPrefix}"]`).forEach(s => s.remove());
    document.querySelectorAll(`link[id^="${stylePrefix}"]`).forEach(s => s.remove());

    // 3. Force UI Update by toggling state or reloading
    setInstallSuccess(`Cache cleared for ${plugin.manifest.name}.`);
    setTimeout(() => {
        setInstallSuccess(null);
        window.location.reload(); // Hard reload is safest to ensure clean state
    }, 500);
  };

  const handleUninstallPlugin = async (id: string) => {
    // open confirm modal instead
    setUninstallConfirm({ isOpen: true, id });
  };

  const performUninstallPlugin = async (id?: string) => {
    if (!id) return;
    setUninstallConfirm({ isOpen: false });
    setProcessingStep('Purging Module...');
    try {
      const response = await fetch('/__system/delete-plugin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        console.warn('[PLUGIN_SYSTEM] Physical deletion failed or bridge unavailable.');
      }

      const updatedPlugins = (config.plugins || []).filter(p => p.id !== id);
      onUpdateConfig({ ...config, plugins: updatedPlugins });

      setInstallSuccess('Module successfully purged.');
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error('[PLUGIN_SYSTEM] Critical Uninstallation Failure:', err);
      setUploadError('Purge failed. Manual file removal required in /plugins/.');
    } finally {
      setProcessingStep(null);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setInstallSuccess(null);
    setProcessingStep("Reading Archive...");

    try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);

        let manifestEntry = Object.values(zipContent.files).find((f: any) => f.name.endsWith('manifest.json') && !f.dir);
        if (!manifestEntry) throw new Error("Manifest Error: 'manifest.json' not found. Ensure your zip contains the build files.");

        setProcessingStep("Decoding Manifest...");
        const manifestStr = await (manifestEntry as any).async("string");
        const manifest = JSON.parse(manifestStr) as PluginManifest;
        
        const manifestPath = (manifestEntry as any).name;
        const basePath = manifestPath.substring(0, manifestPath.lastIndexOf('manifest.json'));

        if (!manifest.id || !manifest.main || !manifest.globalVar) {
            throw new Error("Validation Error: Manifest is missing 'id', 'main', or 'globalVar'.");
        }

        setProcessingStep("Packaging Logic...");
        const filesPayload: Record<string, string> = {};
        
        const mainPath = basePath + manifest.main;
        const mainFile = zipContent.file(mainPath);
        if (!mainFile) throw new Error(`Asset Missing: '${manifest.main}' not found at relative path: ${mainPath}`);
        
        const mainContent = await mainFile.async("string");
        filesPayload[manifest.main] = `data:text/javascript;base64,${btoa(unescape(encodeURIComponent(mainContent)))}`;

        if (manifest.style) {
            const stylePath = basePath + manifest.style;
            const styleFile = zipContent.file(stylePath);
            if (styleFile) {
                const styleContent = await styleFile.async("string");
                filesPayload[manifest.style] = `data:text/css;base64,${btoa(unescape(encodeURIComponent(styleContent)))}`;
            }
        }

        setProcessingStep("Syncing to SQLite...");
        
        const newPlugin: PluginConfig = {
            id: manifest.id,
            enabled: true,
            manifest: manifest,
            files: filesPayload
        };

        const otherPlugins = (config.plugins || []).filter(p => p.id !== manifest.id);
        onUpdateConfig({
            ...config,
            plugins: [...otherPlugins, newPlugin]
        });

        setInstallSuccess(`${manifest.name} v${manifest.version} Installed.`);
        setProcessingStep(null);
        setTimeout(() => window.location.reload(), 800);

    } catch (err: any) {
        console.error("[PLUGIN_SYSTEM] Installation Failed:", err);
        setUploadError(err.message || "Failed to process zip archive.");
        setProcessingStep(null);
    } finally {
        e.target.value = '';
    }
  };

  const renderPlugins = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-cyan-500 transition-all text-center relative group">
                {processingStep ? (
                    <div className="flex flex-col items-center py-4">
                        <Loader2 size={32} className="animate-spin text-cyan-500 mb-3" />
                        <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest">{processingStep}</span>
                    </div>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform">
                            <Upload size={28} className="text-slate-400 group-hover:text-cyan-500" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Upload Plugin Archive</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Select a <code>.zip</code> file containing your UMD build.</p>
                        
                        <div className="flex justify-center relative">
                            <input 
                                type="file" 
                                accept=".zip" 
                                onChange={handleZipUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button className="px-8 py-3 bg-slate-900 dark:bg-cyan-600 text-white rounded-xl text-xs font-bold uppercase shadow-xl hover:bg-slate-800 dark:hover:bg-cyan-500 pointer-events-none flex items-center gap-2">
                                <Package size={16} /> Choose File
                            </button>
                        </div>
                    </>
                )}

                {uploadError && (
                    <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-900 font-mono text-left animate-in shake-2">
                        <div className="flex items-center gap-2 mb-1 font-bold">
                            <Ban size={14} /> INSTALLATION_HALTED
                        </div>
                        {uploadError}
                    </div>
                )}

                {installSuccess && (
                    <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl border border-emerald-200 dark:border-emerald-900 font-bold uppercase flex items-center justify-center gap-2 animate-in zoom-in-95">
                        <Check size={18} /> {installSuccess}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em] flex items-center gap-2">
                        <HardDrive size={12} className="text-cyan-500" /> Persistent Modules
                    </h4>
                    <button 
                      onClick={handleSyncWithDisk}
                      disabled={isSyncing}
                      className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Sync with Disk
                    </button>
                </div>
                
                {(config.plugins || []).length === 0 ? (
                    <div className="py-12 text-center text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/50">
                        <p className="text-xs italic">No external modules found in Local Storage.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {(config.plugins || []).map(plugin => (
                            <div key={plugin.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${plugin.enabled ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                                        <Power size={20} />
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold ${plugin.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                            {plugin.manifest.name}
                                            <span className="ml-2 text-[9px] text-slate-400 font-normal">v{plugin.manifest.version}</span>
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">{plugin.id}</span>
                                            {plugin.manifest.type === 'theme' && (
                                                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Theme Engine</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button 
                                        onClick={() => handleTogglePlugin(plugin.id)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${plugin.enabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {plugin.enabled ? 'Active' : 'Disabled'}
                                    </button>
                                    
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleReloadPlugin(plugin)}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 rounded-lg transition-all"
                                            title="Reload & Clear Cache"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleUninstallPlugin(plugin.id)}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                                            title="Purge from Disk & Database"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderIconGrid = (type: 'project' | 'status') => {
    const activeKeys = type === 'project' ? config.projectIcons : config.statusIcons;
    const availableKeys = Object.keys(FULL_ICON_MAP).filter(k => !activeKeys.includes(k));

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div>
          <h3 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 tracking-[0.2em]">
            Active Icons <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-mono">{activeKeys.length}</span>
          </h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 p-5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
            {activeKeys.map(key => {
              const Icon = FULL_ICON_MAP[key] || Terminal;
              return (
                <div key={key} className="flex items-center justify-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 shadow-sm transition-transform hover:scale-110">
                  <Icon size={20} />
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 tracking-[0.2em]">Library</h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-[260px] overflow-y-auto custom-scrollbar p-1">
            {availableKeys.map(key => {
              const Icon = FULL_ICON_MAP[key];
              return (
                <button
                  key={key}
                  onClick={() => {
                      const newConfig = { ...config };
                      if (type === 'project') newConfig.projectIcons = [...config.projectIcons, key];
                      else newConfig.statusIcons = [...config.statusIcons, key];
                      onUpdateConfig(newConfig);
                  }}
                  className="flex items-center justify-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-slate-500 dark:text-slate-400 hover:text-cyan-500 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>
        </div>
        {uninstallConfirm.isOpen && (
          <ConfirmModal
            isOpen={uninstallConfirm.isOpen}
            title="Purge Module?"
            message={<span>DANGER: This will permanently delete the module's code from <strong>/plugins</strong> and the system database. Proceed?</span>}
            confirmLabel="Purge"
            isDanger={true}
            onConfirm={() => performUninstallPlugin(uninstallConfirm.id)}
            onCancel={() => setUninstallConfirm({ isOpen: false })}
          />
        )}
      </div>
    );
  };

  const renderHelp = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div>
          <h3 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 tracking-[0.2em]">Running Locally</h3>
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed font-mono">
            <p className="flex gap-2"><span>1.</span><span> Ensure you have Node.js installed.</span></p>
            <p className="flex gap-2"><span>2.</span><span> Download the project code (via Settings menu &gt; Export, or download from your hosted environment).</span></p>
            <p className="flex gap-2"><span>3.</span><span> Extract the downloaded archive to a local folder.</span></p>
            <p className="flex gap-2"><span>4.</span><span> Open your terminal and navigate to the project directory.</span></p>
            <p className="flex gap-2"><span>5.</span><span> Run <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">npm install</code> to install dependencies.</span></p>
            <p className="flex gap-2"><span>6.</span><span> (Optional) Fill out <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">.env</code> based on <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">.env.example</code> with needed keys.</span></p>
            <p className="flex gap-2"><span>7.</span><span> Run <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">npm run dev</code> to start the development server.</span></p>
            <p className="mt-4 italic text-cyan-600 dark:text-cyan-400">The application handles its own local data persistence utilizing local file system bridging when running natively outside the sandbox proxy.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md" role="dialog">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] shadow-2xl w-[80vw] h-[80vh] overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono tracking-tight">
                <Settings size={22} className="text-cyan-600 dark:text-cyan-500" />
                SYSTEM_CONFIGURATION
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Core Environment Manager</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-4 bg-slate-50 dark:bg-slate-950/50 overflow-x-auto">
          {['project', 'status', 'plugins', 'help'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 rounded-t-xl ${activeTab === tab ? 'bg-white dark:bg-slate-900 text-cyan-600 border-cyan-500 shadow-sm' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900">
          {activeTab === 'plugins' ? renderPlugins() : activeTab === 'help' ? renderHelp() : renderIconGrid(activeTab as any)}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 flex justify-between items-center px-8">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">DB_VERSION: v1.1.0_LSC</p>
          <button onClick={onClose} className="px-8 py-3 bg-slate-800 dark:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-lg active:scale-95">
            Commit Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

  // Confirm modal for uninstall
  // Rendered at component level by state in the component above via `uninstallConfirm`.
