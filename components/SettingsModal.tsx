
import React, { useState } from 'react';
import { Settings, X, Terminal, Circle, Plus, Trash2, Power, AlertCircle, Upload, Package, FileCode, RefreshCw, Download } from 'lucide-react';
import { GlobalConfig, PluginConfig, PluginManifest } from '../types';
import { FULL_ICON_MAP, DEFAULT_PROJECT_KEYS, DEFAULT_STATUS_KEYS } from './ProjectList';
import { getJiraPlugin } from '../data/defaultPlugins';
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

  if (!isOpen) return null;

  // --- Icon Handlers ---
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

  // --- Plugin Handlers (Zip Based) ---

  const handleTogglePlugin = (id: string) => {
    const updatedPlugins = (config.plugins || []).map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    onUpdateConfig({ ...config, plugins: updatedPlugins });
  };

  const handleDeletePlugin = (id: string) => {
    if (confirm("Uninstall this plugin? This will remove the plugin files from storage.")) {
        const updatedPlugins = (config.plugins || []).filter(p => p.id !== id);
        onUpdateConfig({ ...config, plugins: updatedPlugins });
    }
  };

  const handleReinstallDefaults = () => {
     const defaults = [getJiraPlugin()];
     let addedCount = 0;
     const currentPlugins = [...(config.plugins || [])];
     
     defaults.forEach(def => {
         const exists = currentPlugins.find(p => p.id === def.id);
         if (!exists) {
             currentPlugins.push(def);
             addedCount++;
         }
     });

     if (addedCount > 0) {
         onUpdateConfig({ ...config, plugins: currentPlugins });
         alert(`Restored ${addedCount} default plugin(s).`);
     } else {
         alert("All default plugins are already installed.");
     }
  };

  const handleDownloadSampleZip = async () => {
    try {
      const zip = new JSZip();

      // 1. Manifest
      const manifest = {
        id: "com.galagav.theme.jira.sample",
        name: "Jira Theme (Sample)",
        version: "1.0.0",
        description: "A sample zip plugin for testing upload functionality.",
        main: "index.js",
        style: "style.css",
        globalVar: "GalagaPlugin_JiraSample",
        type: "theme"
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      // 2. CSS
      const cssContent = `
/* JIRA / Enterprise Theme Overrides (Sample) */
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif !important;
  background-color: #F4F5F7 !important;
}
.dark body { background-color: #172B4D !important; }

/* Header */
header {
  background-color: #FFFFFF !important;
  border-bottom: 1px solid #DFE1E6 !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
}
.dark header {
  background-color: #091E42 !important;
  border-bottom: 1px solid #253858 !important;
}

/* Project Cards */
.group.relative.rounded-xl {
  border-radius: 3px !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
  border: 1px solid #DFE1E6 !important;
}

/* Typography & Elements */
h1, h2, h3, h4, h5, h6, button, input, textarea, select {
  font-family: 'Roboto', sans-serif !important;
  letter-spacing: normal !important;
}

/* Buttons */
button {
  border-radius: 3px !important;
  font-weight: 500 !important;
  text-transform: none !important;
}

/* Primary Actions (Blue) */
button.bg-cyan-600, button.bg-emerald-600 {
  background-color: #0052CC !important;
}
button.bg-cyan-600:hover, button.bg-emerald-600:hover {
  background-color: #0747A6 !important;
}

/* Remove Arcade Effects */
.scanlines { display: none !important; }
.font-mono { font-family: 'Roboto', sans-serif !important; }
`;
      zip.file("style.css", cssContent);

      // 3. JS (UMD Wrapper)
      const jsContent = `
(function(global) {
  const React = global.React;
  
  const JiraThemeInfo = () => {
    return React.createElement('div', { className: "p-8 flex flex-col items-center justify-center h-full text-center" },
      React.createElement('div', { className: "bg-[#DEEBFF] p-4 rounded-full mb-4" },
        React.createElement(global.Lucide.Briefcase, { size: 32, className: "text-[#0052CC]" })
      ),
      React.createElement('h1', { className: "text-2xl font-bold text-[#172B4D] mb-4" }, "Enterprise Theme (Sample)"),
      React.createElement('p', { className: "text-[#5E6C84] max-w-md" }, 
        "This is a sample plugin loaded via Zip upload. It applies the Enterprise Design System styles."
      )
    );
  };

  global.GalagaPlugin_JiraSample = {
    Component: JiraThemeInfo
  };
})(window);
`;
      zip.file("index.js", jsContent);

      // Generate Blob
      const blob = await zip.generateAsync({ type: "blob" });
      const href = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = href;
      link.download = "jira-theme-sample.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);

    } catch (err) {
      console.error("Failed to generate sample zip", err);
      alert("Error generating sample zip file.");
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsProcessing(true);

    try {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);

        // 1. Look for manifest.json
        const manifestFile = content.file("manifest.json");
        if (!manifestFile) {
            throw new Error("Invalid Plugin: Missing 'manifest.json' in the root of the zip file.");
        }

        const manifestStr = await manifestFile.async("string");
        let manifest: PluginManifest;
        try {
            manifest = JSON.parse(manifestStr);
        } catch (e) {
            throw new Error("Invalid Plugin: 'manifest.json' is not valid JSON.");
        }

        // Validate Manifest
        if (!manifest.id || !manifest.name || !manifest.main || !manifest.globalVar) {
            throw new Error("Invalid Manifest: Missing required fields (id, name, main, globalVar).");
        }

        // 2. Read 'main' entry script (JS)
        const scriptFile = content.file(manifest.main);
        if (!scriptFile) {
            throw new Error(`Invalid Plugin: Entry file '${manifest.main}' not found in zip.`);
        }
        const scriptBlob = await scriptFile.async("blob");
        
        // Convert to Data URI for storage
        const scriptReader = new FileReader();
        const scriptDataUri = await new Promise<string>((resolve, reject) => {
            scriptReader.onload = () => resolve(scriptReader.result as string);
            scriptReader.onerror = reject;
            scriptReader.readAsDataURL(scriptBlob);
        });

        // 3. Read 'style' css (Optional)
        let styleDataUri = '';
        if (manifest.style) {
            const styleFile = content.file(manifest.style);
            if (styleFile) {
                const styleBlob = await styleFile.async("blob");
                 const styleReader = new FileReader();
                 styleDataUri = await new Promise<string>((resolve, reject) => {
                    styleReader.onload = () => resolve(styleReader.result as string);
                    styleReader.onerror = reject;
                    styleReader.readAsDataURL(styleBlob);
                });
            }
        }

        // 4. Create Virtual "Folder" Object
        const newPlugin: PluginConfig = {
            id: manifest.id,
            manifest: manifest,
            files: {
                [manifest.main]: scriptDataUri,
                ...(styleDataUri ? { [manifest.style!]: styleDataUri } : {})
            },
            enabled: true
        };

        // 5. Save/Update Global Config
        // Remove existing version if present
        const otherPlugins = (config.plugins || []).filter(p => p.id !== manifest.id);
        
        onUpdateConfig({
            ...config,
            plugins: [...otherPlugins, newPlugin]
        });

        alert(`Plugin "${manifest.name}" (v${manifest.version}) installed successfully!`);

    } catch (err: any) {
        console.error("Plugin Install Error:", err);
        setUploadError(err.message || "Failed to parse plugin file.");
    } finally {
        setIsProcessing(false);
        // Clear input
        e.target.value = '';
    }
  };

  // --- Render Helpers ---
  const renderIconGrid = (type: 'project' | 'status') => {
    const activeKeys = type === 'project' ? config.projectIcons : config.statusIcons;
    const defaultKeys = type === 'project' ? DEFAULT_PROJECT_KEYS : DEFAULT_STATUS_KEYS;
    const availableKeys = Object.keys(FULL_ICON_MAP).filter(k => !activeKeys.includes(k));

    return (
      <div className="space-y-6">
        {/* Active Icons */}
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

        {/* Library */}
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
    return (
        <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-800 dark:text-indigo-300">
                <div className="flex items-start gap-2">
                    <Package size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                        <strong>Plugin Manager (Zip Support):</strong> 
                        <br/>
                        Plugins must be a <code>.zip</code> file containing a <code>manifest.json</code> and the entry <code>.js</code> file.
                        This allows plugins to be self-contained and share host dependencies (React, Lucide) for tiny file sizes.
                    </div>
                </div>
            </div>

            {/* Install Area */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors text-center relative">
                {isProcessing ? (
                     <div className="flex flex-col items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-xs font-bold uppercase text-slate-500">Extracting Plugin Package...</span>
                     </div>
                ) : (
                    <>
                        <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Install New Plugin</h3>
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
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadSampleZip(); }}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold uppercase shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 pointer-events-auto relative z-30"
                            >
                                <Download size={14} /> Sample
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

            {/* Installed List */}
            <div className="space-y-2">
                <div className="flex items-center justify-between pb-2">
                     <span className="text-xs font-bold uppercase text-slate-500">Installed Plugins</span>
                     <button 
                        onClick={handleReinstallDefaults}
                        className="text-[10px] text-cyan-600 hover:text-cyan-700 flex items-center gap-1 font-bold uppercase"
                     >
                         <RefreshCw size={12} /> Reinstall Defaults
                     </button>
                </div>
                {(config.plugins || []).length === 0 && (
                    <p className="text-center text-xs text-slate-400 italic py-4">No plugins installed.</p>
                )}
                {(config.plugins || []).map(plugin => {
                    const isTheme = plugin.manifest.type === 'theme';
                    return (
                        <div key={plugin.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${plugin.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Power size={14} />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${plugin.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                        {plugin.manifest?.name || plugin.id} 
                                        <span className="text-[10px] text-slate-400 font-normal ml-2">v{plugin.manifest?.version || '0.0.0'}</span>
                                        <span className={`ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded border ${isTheme ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:border-fuchsia-900' : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900'}`}>
                                            {isTheme ? 'Theme' : 'Tool'}
                                        </span>
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <FileCode size={10} />
                                        <code>{plugin.manifest?.main}</code>
                                        {plugin.manifest?.style && <span className="text-indigo-500">+ Styles</span>}
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
                                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in" role="dialog">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono">
            <Settings size={18} className="text-cyan-600 dark:text-cyan-500" />
            SYSTEM CONFIGURATION
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button 
            onClick={() => setActiveTab('project')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'project' ? 'bg-slate-100 dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            Project Icons
          </button>
          <button 
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'status' ? 'bg-slate-100 dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            Status Icons
          </button>
          <button 
            onClick={() => setActiveTab('plugins')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'plugins' ? 'bg-slate-100 dark:bg-slate-800 text-fuchsia-700 dark:text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            Plugins
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'plugins' ? renderPlugins() : renderIconGrid(activeTab)}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 text-right flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-bold uppercase rounded border border-slate-300 dark:border-slate-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
