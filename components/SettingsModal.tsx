
import React, { useState, useEffect } from 'react';
import { Settings, X, Terminal, Circle, Plus, Trash2, Power, AlertCircle, Upload, Package, FileCode, RefreshCw, Download, HardDrive, Check, Ban, Loader2, Play, Eye, Skull } from 'lucide-react';
import { GlobalConfig, PluginConfig, PluginManifest } from '../types';
import { FULL_ICON_MAP, DEFAULT_PROJECT_KEYS, DEFAULT_STATUS_KEYS } from './ProjectList';
import { getJiraPlugin, JIRA_CSS, JIRA_JS, JIRA_MANIFEST } from '../data/defaultPlugins';
import JSZip from 'jszip';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GlobalConfig;
  onUpdateConfig: (newConfig: GlobalConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onUpdateConfig }) => {
  const [activeTab, setActiveTab] = useState<'project' | 'status' | 'plugins'>('project');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Simulation State
  const [shutdownState, setShutdownState] = useState<'none' | 'stopping' | 'stopped' | 'booting'>('none');
  const [targetPluginId, setTargetPluginId] = useState<string | null>(null);

  // State for blocked plugins
  const [blockedPlugins, setBlockedPlugins] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('galaga_blocked_plugins') || '[]')
  );

  // State for destroyed plugins (permanently hidden)
  const [destroyedPlugins, setDestroyedPlugins] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('galaga_destroyed_plugins') || '[]')
  );

  // State for plugins actually available on disk (verified by backend)
  const [diskPlugins, setDiskPlugins] = useState<PluginConfig[]>([]);

  // Fetch disk state when opening plugins tab
  useEffect(() => {
    if (isOpen && activeTab === 'plugins') {
        fetchPlugins();
    }
  }, [isOpen, activeTab]);

  const fetchPlugins = () => {
     fetch(`/__system/list-plugins?t=${Date.now()}`)
        .then(res => {
            if (!res.ok) throw new Error("System endpoint missing");
            return res.json();
        })
        .then((serverPlugins: PluginConfig[]) => {
            const defaultPlugins = [getJiraPlugin()];
            const combinedMap = new Map<string, PluginConfig>();
            
            // Filter out destroyed plugins from the repository fetch
            const currentDestroyed = JSON.parse(localStorage.getItem('galaga_destroyed_plugins') || '[]');
            
            defaultPlugins.forEach(p => {
              if (!currentDestroyed.includes(p.id)) {
                combinedMap.set(p.id, p);
              }
            });

            serverPlugins.forEach(p => {
              if (!currentDestroyed.includes(p.id)) {
                combinedMap.set(p.id, p);
              }
            });
            
            setDiskPlugins(Array.from(combinedMap.values()));
        })
        .catch(err => {
            console.warn("Plugin system offline, falling back to defaults.", err);
            const currentDestroyed = JSON.parse(localStorage.getItem('galaga_destroyed_plugins') || '[]');
            const defaults = [getJiraPlugin()].filter(p => !currentDestroyed.includes(p.id));
            setDiskPlugins(defaults);
        });
  };

  if (!isOpen && shutdownState === 'none') return null;

  const handleAddIcon = (type: 'project' | 'status', key: string) => {
    if (type === 'project') {
      if (!config.projectIcons.includes(key)) {
        onUpdateConfig({ ...config, projectIcons: [...config.projectIcons, key] });
      }
    } else {
      if (!config.statusIcons.includes(key)) {
        onUpdateConfig({ ...config, statusIcons: [...config.statusIcons, key] });
      }
    }
  };

  const handleRemoveIcon = (type: 'project' | 'status', key: string) => {
    if (type === 'project') {
      onUpdateConfig({ ...config, projectIcons: config.projectIcons.filter(k => k !== key) });
    } else {
      onUpdateConfig({ ...config, statusIcons: config.statusIcons.filter(k => k !== key) });
    }
  };

  const handleTogglePlugin = (id: string) => {
    const updatedPlugins = (config.plugins || []).map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    onUpdateConfig({ ...config, plugins: updatedPlugins });
  };

  const handleDeletePlugin = (id: string) => {
    if (confirm("Uninstall this plugin? The system will reload to clean up resources.")) {
        const currentConfigStr = localStorage.getItem('galaga_global_config_v1');
        if (currentConfigStr) {
            const currentConfig = JSON.parse(currentConfigStr) as GlobalConfig;
            const updatedPlugins = (currentConfig.plugins || []).filter(p => p.id !== id);
            const newConfig = { ...currentConfig, plugins: updatedPlugins };
            localStorage.setItem('galaga_global_config_v1', JSON.stringify(newConfig));
        }
        window.location.reload();
    }
  };

  const handleSoftBlockPlugin = (id: string) => {
    const isInstalled = (config.plugins || []).some(p => p.id === id);
    if (isInstalled) {
        alert("Cannot delete an installed plugin. Please uninstall it from the 'Installed Plugins' list first.");
        return;
    }

    if (confirm("Remove this plugin from the Repository? It will be moved to the 'Blocked / Deleted' list below.")) {
        const newBlocked = [...blockedPlugins];
        if (!newBlocked.includes(id)) {
            newBlocked.push(id);
            localStorage.setItem('galaga_blocked_plugins', JSON.stringify(newBlocked));
            setBlockedPlugins(newBlocked);
        }
    }
  };

  const handleHardDeletePlugin = async (id: string) => {
    if (confirm("WARNING: This will initiate a SYSTEM HALT to permanently scrub this plugin from the disk. This action cannot be undone. Proceed?")) {
        setTargetPluginId(id);
        setShutdownState('stopping');
        
        // 1. Scrub from local storage immediately so it's gone after reboot
        try {
            // Remove from blocked list
            const newBlocked = blockedPlugins.filter((bid: string) => bid !== id);
            setBlockedPlugins(newBlocked);
            localStorage.setItem('galaga_blocked_plugins', JSON.stringify(newBlocked));

            // Add to destroyed list so it never reappears in Repository
            const newDestroyed = [...destroyedPlugins, id];
            setDestroyedPlugins(newDestroyed);
            localStorage.setItem('galaga_destroyed_plugins', JSON.stringify(newDestroyed));

            const currentConfigStr = localStorage.getItem('galaga_global_config_v1');
            if (currentConfigStr) {
                const currentConfig = JSON.parse(currentConfigStr) as GlobalConfig;
                const updatedPlugins = (currentConfig.plugins || []).filter(p => p.id !== id);
                localStorage.setItem('galaga_global_config_v1', JSON.stringify({ ...currentConfig, plugins: updatedPlugins }));
            }
            
            const syncedPlugins = (config.plugins || []).filter(p => p.id !== id);
            onUpdateConfig({ ...config, plugins: syncedPlugins });

        } catch (e) {
            console.error("Storage cleanup error:", e);
        }

        // 2. Call Backend for disk destruction
        try {
            await fetch(`/__system/destroy-plugin?id=${encodeURIComponent(id)}`, { method: 'POST' });
        } catch (e) {
            console.log("Destruction request acknowledged (server halting).");
        }
            
        // 3. UI Sequence
        setTimeout(() => {
            setShutdownState('stopped');
            setTimeout(() => {
                 window.location.reload(); 
            }, 3000);
        }, 2000);
    }
  };

  const handleRestorePlugin = (id: string) => {
      const newBlocked = blockedPlugins.filter((bid: string) => bid !== id);
      setBlockedPlugins(newBlocked);
      localStorage.setItem('galaga_blocked_plugins', JSON.stringify(newBlocked));
  };

  const handleInstallFromRepo = (plugin: PluginConfig) => {
    const newPlugin = { ...plugin, enabled: true };
    const otherPlugins = (config.plugins || []).filter(p => p.id !== plugin.id);
    onUpdateConfig({
        ...config,
        plugins: [...otherPlugins, newPlugin]
    });
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsProcessing(true);

    try {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);

        const manifestFile = content.file("manifest.json");
        if (!manifestFile) throw new Error("Invalid Plugin: Missing 'manifest.json'");

        const manifestStr = await manifestFile.async("string");
        const manifest = JSON.parse(manifestStr);

        if (!manifest.id || !manifest.name || !manifest.main || !manifest.globalVar) {
            throw new Error("Invalid Manifest: Missing required fields.");
        }

        const filesPayload: Record<string, string> = {};
        const mainContent = await (content.file(manifest.main)?.async("string"));
        if (!mainContent) throw new Error(`Entry file '${manifest.main}' not found.`);
        filesPayload[manifest.main] = mainContent;

        if (manifest.style) {
            const styleContent = await (content.file(manifest.style)?.async("string"));
            if (styleContent) filesPayload[manifest.style] = styleContent;
        }

        const response = await fetch('/__system/upload-plugin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: manifest.id,
                manifest: manifest,
                files: filesPayload
            })
        });

        if (!response.ok) throw new Error("Upload failed");

        // If it was blocked or destroyed, clear those flags on re-upload
        const newBlocked = blockedPlugins.filter(id => id !== manifest.id);
        setBlockedPlugins(newBlocked);
        localStorage.setItem('galaga_blocked_plugins', JSON.stringify(newBlocked));

        const newDestroyed = destroyedPlugins.filter(id => id !== manifest.id);
        setDestroyedPlugins(newDestroyed);
        localStorage.setItem('galaga_destroyed_plugins', JSON.stringify(newDestroyed));

        fetchPlugins();

    } catch (err: any) {
        setUploadError(err.message || "Failed to process plugin file.");
    } finally {
        setIsProcessing(false);
        e.target.value = '';
    }
  };

  const renderIconGrid = (type: 'project' | 'status') => {
    const activeKeys = type === 'project' ? config.projectIcons : config.statusIcons;
    const defaultKeys = type === 'project' ? DEFAULT_PROJECT_KEYS : DEFAULT_STATUS_KEYS;
    const availableKeys = Object.keys(FULL_ICON_MAP).filter(k => !activeKeys.includes(k));

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            Active Icons <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">{activeKeys.length}</span>
          </h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 bg-slate-100 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            {activeKeys.map(key => {
              const Icon = FULL_ICON_MAP[key] || Terminal;
              const isDefault = defaultKeys.includes(key);
              return (
                <div key={key} className="group relative flex items-center justify-center p-2 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 shadow-sm">
                  <Icon size={20} className="text-slate-600 dark:text-slate-300" />
                  {!isDefault && (
                    <button
                      onClick={() => handleRemoveIcon(type, key)}
                      className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3">Available Library</h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
            {availableKeys.map(key => {
              const Icon = FULL_ICON_MAP[key];
              return (
                <button
                  key={key}
                  onClick={() => handleAddIcon(type, key)}
                  className="flex items-center justify-center p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-500 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all"
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderPlugins = () => {
    // Repository plugins: verified to be on disk AND not blocked AND not destroyed
    const repoPlugins = diskPlugins.filter(p => !blockedPlugins.includes(p.id) && !destroyedPlugins.includes(p.id));

    return (
        <div className="space-y-8">
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-800 dark:text-indigo-300">
                <div className="flex items-start gap-2">
                    <Package size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                        <strong>Plugin Manager:</strong> 
                        <br/>
                        Plugins are sandboxed React components. You can install official default plugins or upload your own <code>.zip</code> bundles.
                    </div>
                </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors text-center relative">
                {isProcessing ? (
                     <div className="flex flex-col items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-xs font-bold uppercase text-slate-500">Extracting & Uploading...</span>
                     </div>
                ) : (
                    <>
                        <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Upload New Plugin</h3>
                        <p className="text-xs text-slate-500 mb-4">Drag and drop a <strong>.zip</strong> file here or click to browse.</p>
                        
                        <div className="flex justify-center gap-3 relative z-20">
                            <input 
                                type="file" 
                                accept=".zip" 
                                onChange={handleZipUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold uppercase shadow-sm pointer-events-none">
                                Select Zip
                            </button>
                        </div>
                    </>
                )}
                {uploadError && (
                    <div className="mt-4 p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs rounded border border-rose-200 dark:border-rose-900 font-mono">
                        {uploadError}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                     <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                        <Terminal size={14} /> Installed Plugins
                     </span>
                </div>
                {(config.plugins || []).length === 0 && (
                    <p className="text-center text-xs text-slate-400 italic py-4">No plugins installed.</p>
                )}
                {(config.plugins || []).map(plugin => {
                    const isTheme = plugin.manifest.type === 'theme';
                    return (
                        <div key={plugin.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm animate-in fade-in slide-in-from-right-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${plugin.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Power size={14} />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${plugin.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                        {plugin.manifest?.name || plugin.id} 
                                        <span className={`ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded border ${isTheme ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                            {isTheme ? 'Theme' : 'Tool'}
                                        </span>
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <code>{plugin.manifest?.main}</code>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleTogglePlugin(plugin.id)}
                                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors ${plugin.enabled ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {plugin.enabled ? 'Active' : 'Disabled'}
                                </button>
                                <button 
                                    onClick={() => handleDeletePlugin(plugin.id)}
                                    disabled={plugin.enabled}
                                    className={`p-2 rounded ${plugin.enabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-rose-500'}`}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                     <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                        <HardDrive size={14} /> Local Repository (plugins/)
                     </span>
                </div>
                {repoPlugins.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 italic py-4">Repository is empty.</p>
                ) : (
                    repoPlugins.map(repoPlugin => {
                        const isInstalled = (config.plugins || []).some(p => p.id === repoPlugin.id);
                        return (
                            <div key={repoPlugin.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
                                        <Package size={14} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{repoPlugin.manifest.name}</h4>
                                        <p className="text-xs text-slate-500">{repoPlugin.manifest.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isInstalled ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded">
                                            <Check size={12} /> Installed
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => handleInstallFromRepo(repoPlugin)}
                                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold uppercase transition-colors"
                                        >
                                            Install
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleSoftBlockPlugin(repoPlugin.id)}
                                        disabled={isInstalled}
                                        className={`p-2 rounded ${isInstalled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600'}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {blockedPlugins.length > 0 && (
                <div className="space-y-2 pt-8 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                            <Ban size={14} /> Blocked / Deleted Plugins
                        </span>
                    </div>
                    {blockedPlugins.map(bid => {
                        const knownPlugin = diskPlugins.find(p => p.id === bid) || [getJiraPlugin()].find(p => p.id === bid);
                        return (
                            <div key={bid} className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/20 text-rose-500">
                                        <Ban size={14} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">{knownPlugin ? knownPlugin.manifest.name : bid}</h4>
                                        <p className="text-[10px] text-slate-400">Archived from active protocols.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleRestorePlugin(bid)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold uppercase transition-colors"
                                    >
                                        <Eye size={12} /> Restore
                                    </button>
                                    <button 
                                        onClick={() => handleHardDeletePlugin(bid)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 text-rose-500 hover:text-rose-700 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold uppercase transition-colors"
                                    >
                                        <Skull size={12} /> Destroy
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
  }

  return (
    <>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in" role="dialog">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono">
                <Settings size={18} className="text-cyan-600 dark:text-cyan-500" />
                SYSTEM CONFIGURATION
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <X size={20} />
            </button>
            </div>

            <div className="flex border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <button 
                onClick={() => setActiveTab('project')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'project' ? 'bg-slate-100 dark:bg-slate-800 text-cyan-700 border-b-2 border-cyan-500' : 'text-slate-500'}`}
            >
                Project Icons
            </button>
            <button 
                onClick={() => setActiveTab('status')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'status' ? 'bg-slate-100 dark:bg-slate-800 text-cyan-700 border-b-2 border-cyan-500' : 'text-slate-500'}`}
            >
                Status Icons
            </button>
            <button 
                onClick={() => setActiveTab('plugins')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'plugins' ? 'bg-slate-100 dark:bg-slate-800 text-fuchsia-700 border-b-2 border-fuchsia-500' : 'text-slate-500'}`}
            >
                Plugins
            </button>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar flex-1">
            {activeTab === 'plugins' ? renderPlugins() : renderIconGrid(activeTab)}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 text-right flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded text-xs font-bold uppercase">
                Done
            </button>
            </div>
        </div>
        </div>

        {shutdownState !== 'none' && (
            <div className="fixed inset-0 z-[9999] bg-black text-white font-mono flex flex-col items-center justify-center p-8 cursor-wait">
                {shutdownState === 'stopping' && (
                    <>
                        <Loader2 size={64} className="text-red-600 animate-spin mb-8" />
                        <h1 className="text-4xl font-bold mb-4 text-red-600 tracking-widest animate-pulse">SYSTEM HALT</h1>
                        <div className="text-left space-y-2 text-slate-400 font-mono text-sm w-96">
                            <p className="animate-pulse">&gt; [SYSTEM] Initializing Wipe Protocol...</p>
                            <p>&gt; [SERVER] Terminating file streams...</p>
                            <p className="text-red-500">&gt; [DISK] Destroying: {targetPluginId}</p>
                        </div>
                    </>
                )}
                {shutdownState === 'stopped' && (
                     <>
                        <div className="w-16 h-16 rounded-full border-4 border-slate-800 mb-8" />
                        <h1 className="text-4xl font-bold mb-4 text-slate-700 tracking-widest">SERVER STOPPED</h1>
                        <p className="text-slate-600 font-mono text-sm">&gt; Rebooting to synchronize disk state...</p>
                    </>
                )}
            </div>
        )}
    </>
  );
};

export default SettingsModal;
