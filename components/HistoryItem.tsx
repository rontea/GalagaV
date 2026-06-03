
import React, { useState } from 'react';
import { AlertOctagon, ChevronUp, ChevronDown } from 'lucide-react';
import { StepVersion } from '../types';

export const HistoryItem: React.FC<{ version: StepVersion; index: number }> = ({ version, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative pl-6 pb-2">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-800"></div>
      <div className="absolute left-0 top-4 w-4 h-px bg-slate-300 dark:bg-slate-800"></div>

      <div 
        onClick={() => setExpanded(!expanded)}
        className={`
          group rounded-md border cursor-pointer transition-all duration-200 relative overflow-hidden
          ${expanded 
            ? 'bg-white dark:bg-slate-900 border-rose-500/40 shadow-lg' 
            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800/60'}
        `}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${expanded ? 'bg-rose-500' : 'bg-rose-200 dark:bg-rose-900/50 group-hover:bg-rose-400 dark:group-hover:bg-rose-800'}`} />
        <div className="p-3 pl-4">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`p-1.5 rounded-full flex-shrink-0 ${expanded ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                <AlertOctagon size={12} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  {version.failureReason ? `Revision: ${version.failureReason}` : `Failed Attempt #${index + 1}`}
                </span>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                   {new Date(version.timestamp).toLocaleString()} • ARCHIVED
                </div>
              </div>
            </div>
            <div className="text-slate-400">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
          <div className={`grid transition-all duration-300 ${expanded ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden min-h-0">
               {version.failureReason && (
                  <div className="mb-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded p-2 text-xs text-rose-800 dark:text-rose-200 italic">
                    "{version.failureReason}"
                  </div>
               )}
               <div 
                 className="rich-content bg-slate-50 dark:bg-black/30 rounded p-2 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400"
                 dangerouslySetInnerHTML={{ __html: version.content }}
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
