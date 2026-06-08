
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
    <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-slate-200 dark:border-slate-700/50">
      <div className="relative">
        <button 
          onClick={() => handlers.setActiveNoteId(activeNoteId === step.id ? null : step.id)} 
          className={`p-2.5 rounded-lg transition-all duration-200 transform hover:scale-110 ${step.notes ? 'text-amber-600 dark:text-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-300 dark:border-amber-800/50 shadow-md hover:shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-300 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
          title="Add note"
        >
          <StickyNote size={18} />
          {step.notes && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 shadow-md"></span>
          )}
        </button>
        {activeNoteId === step.id && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => handlers.setActiveNoteId(null)}></div>
            <div className="absolute bottom-full left-0 mb-3 w-64 sm:w-80 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 border-2 border-amber-300 dark:border-slate-700 p-4 rounded-xl z-50 animate-in fade-in zoom-in-95 shadow-2xl">
              <textarea 
                className="w-full h-36 bg-white dark:bg-slate-950 border-2 border-amber-200 dark:border-slate-700 p-3 text-sm font-mono resize-none leading-relaxed rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400" 
                value={step.notes || ''} 
                onChange={e => handlers.handleUpdateNote(step.id, e.target.value)} 
                autoFocus 
                placeholder="Add a note..." 
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button 
          onClick={() => handlers.handleSmartCopy(step)} 
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border-2 text-xs font-bold uppercase transition-all transform hover:scale-105 flex-shrink-0 ${isCopied ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 shadow-md' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-950/40 dark:hover:to-blue-950/40 hover:border-cyan-300 dark:hover:border-cyan-800/50 hover:text-cyan-700 dark:hover:text-cyan-400'}`}
          title="Copy to clipboard"
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
        <button 
          onClick={() => handlers.handleToggleTab(step.id)} 
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border-2 transition-all transform hover:scale-105 flex-shrink-0 ${step.isTab ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/50 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
          title={step.isTab ? 'Tab is active' : 'Make tab active'}
        >
          <AppWindow size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">{step.isTab ? 'Tab Active' : 'Tab'}</span>
        </button>
        <button 
          onClick={() => handlers.handleDuplicateStep(step.id)} 
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-300 transition-all transform hover:scale-105 flex-shrink-0"
          title="Duplicate step"
        >
          <Files size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">Duplicate</span>
        </button>
        {handlers.handleGenerateToTodo && (
          <button 
            onClick={() => handlers.handleGenerateToTodo?.(step)} 
            disabled={handlers.loadingStepToTodo === step.id}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border-2 transition-all transform hover:scale-105 flex-shrink-0 ${handlers.loadingStepToTodo === step.id ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-800/50'}`}
            title="Sync with todo list"
          >
            <ListTodo size={16} className={handlers.loadingStepToTodo === step.id ? 'animate-spin' : ''} />
            <span className="text-xs font-bold uppercase hidden sm:inline">
              {handlers.loadingStepToTodo === step.id ? 'Syncing...' : (step.todoId ? 'Update Todo' : 'Send to Todo')}
            </span>
          </button>
        )}
        <button 
          onClick={() => handlers.handleAddSubStep(step.id)} 
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-300 transition-all transform hover:scale-105 flex-shrink-0"
          title="Add sub-task"
        >
          <GitBranch size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">Sub-Task</span>
        </button>
        {handlers.handleCommitStep && (
          <button 
            onClick={() => handlers.handleCommitStep?.(step)} 
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-800/50 transition-all transform hover:scale-105 flex-shrink-0"
            title="Commit this step"
          >
            <GitCommit size={16} />
            <span className="text-xs font-bold uppercase hidden sm:inline">Commit</span>
          </button>
        )}
        <button 
          onClick={() => onEditClick(step)} 
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-500 dark:to-blue-500 text-white hover:from-cyan-700 hover:to-blue-700 dark:hover:from-cyan-600 dark:hover:to-blue-600 border-2 border-transparent hover:border-cyan-400 dark:hover:border-cyan-600 transition-all transform hover:scale-105 flex-shrink-0 shadow-md hover:shadow-lg font-bold"
          title="Edit step"
        >
          <Edit2 size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">Edit</span>
        </button>
        <button 
          onClick={() => handlers.handleDeleteStep(step.id)} 
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-700/50 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800/50 transition-all transform hover:scale-105 flex-shrink-0"
          title="Archive step"
        >
          <Archive size={16} />
          <span className="text-xs font-bold uppercase hidden sm:inline">Archive</span>
        </button>
      </div>
    </div>
  );
};
