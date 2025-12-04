import React, { useState } from 'react';
import { Settings, X, Terminal, Circle, Plus, Trash2, Power, AlertCircle, Upload } from 'lucide-react';
import { GlobalConfig, PluginConfig } from '../types';
import { FULL_ICON_MAP, DEFAULT_PROJECT_KEYS, DEFAULT_STATUS_KEYS } from './ProjectList';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GlobalConfig;
  onUpdateConfig: (newConfig: GlobalConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onUpdateConfig }) => {
  const [activeTab, setActiveTab] = useState<'project' | 'status' | 'plugins'>('project');
  
  // Plugin Form State
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginUrl, setNewPluginUrl] = useState('');
  const [newPluginGlobal, setNewPluginGlobal] = useState('');

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

  // --- Plugin Handlers ---
  const handleAddPlugin = () => {
    if (!newPluginName || !newPluginUrl || !newPluginGlobal) return;

    const newPlugin: PluginConfig = {
      id: `plugin-${Date.now()}`,
      name: newPluginName,
      url: newPluginUrl,
      globalName: newPluginGlobal,
      enabled: true
    };

    onUpdateConfig({
      ...config,
      plugins: [...(config.plugins || []), newPlugin]
    });

    setNewPluginName('');
    setNewPluginUrl('');
    setNewPluginGlobal('');
  };

  const handleTogglePlugin = (id: string) => {
    const updatedPlugins = (config.plugins || []).map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    onUpdateConfig({ ...config, plugins: updatedPlugins });
  };

  const handleDeletePlugin = (id: string) => {
    if (confirm("Uninstall this plugin?")) {
        const updatedPlugins = (config.plugins || []).filter(p => p.id !== id);
        onUpdateConfig({ ...config, plugins: updatedPlugins });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a blob URL for the file to simulate a hosted URL
    const objectUrl = URL.createObjectURL(file);
    setNewPluginUrl(objectUrl);
    
    // Auto-fill name if empty
    if (!newPluginName) {
        // Remove extension and capitalize first letter
        const name = file.name.replace(/\.[^/.]+$/, "");
        setNewPluginName(name.charAt(0).toUpperCase() + name.slice(1));
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
            <div className="bg-cyan-50 dark:bg-cyan-950/20 p-4 rounded-lg border border-cyan-100 dark:border-cyan-900/50 text-xs text-cyan-800 dark:text-cyan-300">
                <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                        <strong>Experimental Feature:</strong> Install external modules (UMD) to extend functionality.
                        Only install plugins from trusted sources.
                    </div>
                </div>
            </div>

            {/* Install Form */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3">Install New Plugin</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input 
                        placeholder="Display Name (e.g. Schema Builder)"
                        value={newPluginName}
                        onChange={e => setNewPluginName(e.target.value)}
                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs"
                    />
                    <input 
                        placeholder="Global Var Name (e.g. GalagaPlugin_Schema)"
                        value={newPluginGlobal}
                        onChange={e => setNewPluginGlobal(e.target.value)}
                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono"
                    />
                    <div className="flex gap-2">
                        <input 
                            placeholder="Script URL or Upload ->"
                            value={newPluginUrl}
                            onChange={e => setNewPluginUrl(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono"
                        />
                         <label className="flex items-center justify-center px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer border border-slate-300 dark:border-slate-700 transition-colors" title="Upload local .js build">
                            <Upload size={14} />
                            <input type="file" accept=".js" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>
                </div>
                <button 
                    onClick={handleAddPlugin}
                    disabled={!newPluginName || !newPluginUrl || !newPluginGlobal}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded text-xs font-bold uppercase transition-colors disabled:opacity-50"
                >
                    <Plus size={14} /> Install Module
                </button>
            </div>

            {/* Installed List */}
            <div className="space-y-2">
                {(config.plugins || []).length === 0 && (
                    <p className="text-center text-xs text-slate-400 italic py-4">No plugins installed.</p>
                )}
                {(config.plugins || []).map(plugin => (
                    <div key={plugin.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${plugin.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Power size={14} />
                            </div>
                            <div>
                                <h4 className={`text-sm font-bold ${plugin.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{plugin.name}</h4>
                                <code className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded truncate max-w-[150px] inline-block" title={plugin.url}>{plugin.url.startsWith('blob:') ? '(Local File Upload)' : plugin.url}</code>
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
                ))}
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