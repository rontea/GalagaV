
import React, { useState } from 'react';
import { Archive, ChevronDown, ChevronRight, RefreshCw, Trash2 } from 'lucide-react';
import { Step } from '../types';

interface ArchivedTasksProps {
  steps: Step[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export const ArchivedTasks: React.FC<ArchivedTasksProps> = ({ steps, onRestore, onPermanentDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (steps.length === 0) return null;

  return (
    <div className="mb-24 border-t border-slate-200 dark:border-slate-800 pt-8">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Decommissioned Tasks (Archive)
        <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs py-0.5 px-2 rounded-full">{steps.length}</span>
      </button>

      {isOpen && (
          <div className="mt-6 space-y-3 animate-in slide-in-from-top-2">
            {steps.map(step => (
              <div key={step.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-white dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <Archive size={14} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-400 line-through decoration-slate-400">{step.title}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Archived: {step.archivedAt ? new Date(step.archivedAt).toLocaleString() : 'Unknown'}
                        </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onRestore(step.id)} className="p-2 text-emerald-600 hover:bg-slate-100 rounded transition-colors" title="Restore"><RefreshCw size={16} /></button>
                    <button onClick={() => onPermanentDelete(step.id)} className="p-2 text-rose-600 hover:bg-slate-100 rounded transition-colors" title="Delete Permanently"><Trash2 size={16} /></button>
                  </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );
};
