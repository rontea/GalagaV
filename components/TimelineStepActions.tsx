
import React from 'react';
import { StickyNote, Check, Copy, AppWindow, Files, GitBranch, Edit2, Archive, ListTodo, GitCommit } from 'lucide-react';
import { Step } from '../types';

interface TimelineStepActionsProps {
  step: Step;
  activeNoteId: string | null;
  isCopied: boolean;
  onEditClick: (s: Step) => void;
  handlers: {
    setActiveNoteId: (id: string | null) => void;
    handleUpdateNote: (id: string, note: string) => void;
    handleSmartCopy: (s: Step) => void;
    handleToggleTab: (id: string) => void;
    handleDuplicateStep: (id: string) => void;
    handleAddSubStep: (id: string) => void;
    handleDeleteStep: (id: string) => void;
    handleGenerateToTodo?: (s: Step) => void;
    loadingStepToTodo?: string | null;
    handleCommitStep?: (s: Step) => void;
  };
}

export const TimelineStepActions: React.FC<TimelineStepActionsProps> = ({
  step, activeNoteId, isCopied, onEditClick, handlers
}) => {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/50">
      <div className="relative">
        <button 
          onClick={() => handlers.setActiveNoteId(activeNoteId === step.id ? null : step.id)} 
          className={`p-2 rounded-lg ${step.notes ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <StickyNote size={18} />
          {step.notes && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          )}
        </button>
        {activeNoteId === step.id && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => handlers.setActiveNoteId(null)}></div>
            <div className="absolute bottom-full left-0 mb-2 w-64 sm:w-72 bg-amber-50 dark:bg-slate-800 border border-amber-200 p-3 rounded-lg z-50 animate-in fade-in zoom-in-95 shadow-xl">
              <textarea 
                className="w-full h-32 bg-transparent border-0 p-0 text-sm font-mono resize-none leading-relaxed" 
                value={step.notes || ''} 
                onChange={e => handlers.handleUpdateNote(step.id, e.target.value)} 
                autoFocus 
                placeholder="Add a note..." 
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button 
          onClick={() => handlers.handleSmartCopy(step)} 
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase transition-all flex-shrink-0 ${isCopied ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-500' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400'}`}
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
        <button 
          onClick={() => handlers.handleToggleTab(step.id)} 
          className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 transition-all border border-transparent flex-shrink-0 ${step.isTab ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <AppWindow size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">{step.isTab ? 'Tab Active' : 'Tab'}</span>
        </button>
        <button 
          onClick={() => handlers.handleDuplicateStep(step.id)} 
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all flex-shrink-0"
        >
          <Files size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">Duplicate</span>
        </button>
        {handlers.handleGenerateToTodo && (
          <button 
            onClick={() => handlers.handleGenerateToTodo?.(step)} 
            disabled={handlers.loadingStepToTodo === step.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 transition-all border border-transparent flex-shrink-0 ${handlers.loadingStepToTodo === step.id ? 'opacity-50 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-500'}`}
          >
            <ListTodo size={16} className={handlers.loadingStepToTodo === step.id ? 'animate-pulse' : ''} />
            <span className="text-xs font-bold uppercase hidden sm:inline">
              {handlers.loadingStepToTodo === step.id ? 'Syncing...' : (step.todoId ? 'Update Todo' : 'Send to Todo')}
            </span>
          </button>
        )}
        <button 
          onClick={() => handlers.handleAddSubStep(step.id)} 
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 flex-shrink-0"
        >
          <GitBranch size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">Sub-Task</span>
        </button>
        {handlers.handleCommitStep && (
          <button 
            onClick={() => handlers.handleCommitStep?.(step)} 
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-500 transition-all flex-shrink-0"
          >
            <GitCommit size={16} />
            <span className="text-xs font-bold uppercase hidden sm:inline">Commit</span>
          </button>
        )}
        <button 
          onClick={() => onEditClick(step)} 
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-cyan-600 dark:hover:bg-cyan-500 flex-shrink-0"
        >
          <Edit2 size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">Edit</span>
        </button>
        <button 
          onClick={() => handlers.handleDeleteStep(step.id)} 
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-all flex-shrink-0"
        >
          <Archive size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">Archive</span>
        </button>
      </div>
    </div>
  );
};
