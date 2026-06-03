import React from 'react';
import { usePluginLoader } from '../hooks/usePluginLoader';
import { PluginConfig, Project } from '../types';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PluginViewProps {
  config: PluginConfig;
  project: Project;
  onSave: (updatedProject: Project) => void;
  theme: 'light' | 'dark';
}

const PluginView: React.FC<PluginViewProps> = ({ config, project, onSave, theme }) => {
  // Now passing the full config object, not just URL
  const { plugin, loading, error } = usePluginLoader(config);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <Loader2 size={48} className="animate-spin mb-4 text-cyan-500" />
        <p className="font-mono text-xs uppercase tracking-widest">Initializing Module: {config.manifest?.name || 'Unknown'}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-rose-500 p-8 text-center">
        <AlertTriangle size={48} className="mb-4" />
        <h3 className="text-lg font-bold mb-2">Module Load Failure</h3>
        <p className="font-mono text-xs bg-rose-50 dark:bg-rose-950/30 p-4 rounded border border-rose-200 dark:border-rose-900">
          {error}
        </p>
      </div>
    );
  }

  if (!plugin || !plugin.Component) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <p>Plugin loaded, but no Entry Component found.</p>
      </div>
    );
  }

  const ExternalComponent = plugin.Component;

  // Error Boundary for the External Component could go here
  return (
    <div className="w-full h-[calc(100vh-200px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <ExternalComponent 
        project={project} 
        onSave={onSave} 
        theme={theme}
        onNotify={(msg: string) => console.log(`[Plugin ${config.manifest.name}]: ${msg}`)}
      />
    </div>
  );
};

export default PluginView;