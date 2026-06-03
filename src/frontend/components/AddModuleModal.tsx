import React, { useState } from 'react';
import { X, Save, Plus } from 'lucide-react';

export default function AddModuleModal({ onClose, existingModules, onAdded }: { onClose: () => void, existingModules: string[], onAdded: () => void }) {
  const [moduleName, setModuleName] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmedName = moduleName.trim();
    if (!trimmedName) {
      setError('Module name cannot be empty');
      return;
    }

    if (existingModules.includes(trimmedName)) {
      setError('Module already exists');
      return;
    }

    // Only alphanumeric and dashes allowed for file structure compatibility
    if (!/^[a-zA-Z0-9-]+$/.test(trimmedName)) {
      setError('Only letters, numbers, and dashes are allowed');
      return;
    }

    try {
      const updatedModules = [...existingModules, trimmedName];
      const res = await fetch('/api/addcollections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: updatedModules })
      });
      
      const data = await res.json();
      if (data.success) {
        onAdded();
        onClose();
      } else {
        setError(data.error || 'Failed to create module');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create Module</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Module Name</label>
            <input 
              value={moduleName} 
              onChange={e => {
                setModuleName(e.target.value);
                setError('');
              }} 
              placeholder="e.g. auth-system, ui-components" 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm outline-none"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
              Modules group your TODOs into separate folders and files (e.g. <code>todo-name.md</code>).
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 font-medium text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 font-medium text-sm text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 shadow-sm flex items-center gap-2 transition-colors">
            <Plus size={16} /> Create Module
          </button>
        </div>
      </div>
    </div>
  );
}
