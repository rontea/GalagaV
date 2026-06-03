
import React from 'react';
import { Check, AlertOctagon, GitBranch, ChevronUp, ChevronDown } from 'lucide-react';
import { Step, CategoryConfig, StatusConfig, Snippet } from '../types';
import { CategoryStyle, BASE_CATEGORIES } from '../lib/ui-constants';
import { FULL_ICON_MAP } from './ProjectList';
import { SubStepCard } from './SubStepCard';
import { HistoryItem } from './HistoryItem';
import { TimelineStepEditForm } from './TimelineStepEditForm';
import { TimelineStepDisplay } from './TimelineStepDisplay';
import { TimelineStepActions } from './TimelineStepActions';
import { TimelineTodoConnector } from './TimelineTodoConnector';

interface TimelineStepCardProps {
  step: Step;
  index: number;
  isLast: boolean;
  isEditing: boolean;
  editFormData: Partial<Step>;
  allCategories: Record<string, CategoryStyle>;
  allStatuses: Record<string, StatusConfig>;
  isCopied: boolean;
  isDragging: boolean;
  isDragTargetCard: boolean;
  dragTargetGapPosition?: 'before' | 'after';
  isShrunk: boolean;
  isHistoryExpanded: boolean;
  activeNoteId: string | null;
  snippets?: Snippet[];
  handlers: {
    updateField: (field: keyof Step, val: any) => void;
    handleCancelEdit: () => void;
    handleSaveStep: () => void;
    handleMainImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleEditClick: (s: Step) => void;
    toggleCompletedStep: (id: string) => void;
    toggleHistory: (id: string) => void;
    handleSmartCopy: (s: Step) => void;
    handleToggleTab: (id: string) => void;
    handleDuplicateStep: (id: string) => void;
    handleAddSubStep: (id: string) => void;
    handleDeleteStep: (id: string) => void;
    setActiveNoteId: (id: string | null) => void;
    handleUpdateNote: (id: string, note: string) => void;
    handleDragStart: (id: string) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, id: string) => void;
    handleDrop: (id: string) => void;
    setDragTarget: (t: any) => void;
    handleSubTaskDragStart: any;
    handleSubTaskDragOver: any;
    handleSubTaskDrop: any;
    handleSubTaskDragEnd: any;
    draggedSubTask: any;
    dragTargetSubTask: any;
    handlePromoteSubStep: any;
    handleDeleteSubStep: any;
    handleUpdateSubStep: any;
    handleGenerateToTodo?: (step: Step) => void;
    handleLinkTodoToStep?: (stepId: string, todoId: string) => void;
    handleNavigateToTodo?: (todoId: string) => void;
    loadingStepToTodo?: string | null;
  }
}

export const TimelineStepCard: React.FC<TimelineStepCardProps> = ({
  step, index, isLast, isEditing, editFormData, allCategories, allStatuses,
  isCopied, isDragging, isDragTargetCard, dragTargetGapPosition, isShrunk, isHistoryExpanded, activeNoteId,
  snippets, handlers
}) => {
  const displayCategory = isEditing && editFormData.category ? editFormData.category : step.category;
  const style = allCategories[displayCategory] || allCategories.frontend || BASE_CATEGORIES.frontend;
  const Icon = style.icon;
  
  const currentStatusKey = isEditing && editFormData.status ? editFormData.status : step.status;
  const statusConfig = allStatuses[currentStatusKey] || { key: 'pending', label: 'Pending', color: 'slate', icon: 'Circle' };
  const StatusIcon = FULL_ICON_MAP[statusConfig.icon] || Check;

  const iterationCount = (step.history?.length || 0) + 1;
  const isFailed = step.status === 'failed';
  const isCompleted = step.status === 'completed';

  return (
    <div 
      id={`step-${step.id}`}
      draggable={!isEditing}
      onDragStart={() => handlers.handleDragStart(step.id)}
      onDragEnd={handlers.handleDragEnd}
      onDragOver={(e) => handlers.handleDragOver(e, step.id)}
      onDrop={() => handlers.handleDrop(step.id)}
      onDragLeave={() => handlers.setDragTarget(null)}
      className={`relative group transition-opacity duration-200 ${isDragging ? 'opacity-30 cursor-grabbing' : 'cursor-default'} ${dragTargetGapPosition === 'before' ? 'mt-8' : ''} ${dragTargetGapPosition === 'after' ? 'mb-8' : ''}`}
    >
      {dragTargetGapPosition === 'before' && <div className="absolute -top-6 left-0 right-0 h-1 bg-cyan-500/50 rounded-full animate-pulse z-20 pointer-events-none"></div>}
      {dragTargetGapPosition === 'after' && <div className="absolute -bottom-6 left-0 right-0 h-1 bg-cyan-500/50 rounded-full animate-pulse z-20 pointer-events-none"></div>}

      <div className="mb-12 min-w-0">
        <div className={`relative rounded-xl border transition-all duration-300 ${isShrunk ? (isFailed ? 'bg-white dark:bg-slate-950/30 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-slate-950/30 border-emerald-200 dark:border-emerald-900/30') : (isFailed ? 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10' : `${style.border} bg-white dark:bg-slate-900/40`)} ${isEditing ? 'bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-cyan-500/50' : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'} ${isDragTargetCard ? 'border-indigo-500' : ''} ${isShrunk ? 'p-3 sm:p-4' : 'p-6 sm:p-7'}`}>
          
          {iterationCount > 1 && !isEditing && !isShrunk && (
            <div className="absolute -top-3 right-6 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-mono shadow-sm"><GitBranch size={10} /><span>Rev.{iterationCount}</span></div>
          )}

          {isEditing ? (
            <TimelineStepEditForm 
              editFormData={editFormData} 
              allCategories={allCategories} 
              allStatuses={allStatuses} 
              snippets={snippets}
              handlers={handlers} 
            />
          ) : isShrunk ? (
            <div className="flex items-center justify-between cursor-pointer group/shrunk" onClick={() => handlers.toggleCompletedStep(step.id)}>
              <div className="flex items-center gap-4">
                  <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-900 border ${isFailed ? 'border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-500' : 'border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-500'}`}><Icon size={16} /></div>
                  <h3 className={`text-sm font-bold text-slate-500 dark:text-slate-400 line-through ${isFailed ? 'decoration-red-500 dark:decoration-red-900' : 'decoration-slate-300 dark:decoration-slate-700'}`}>{step.title}</h3>
                  <div className={`hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${isFailed ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/30' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30'}`}><StatusIcon size={10} /><span>{statusConfig.label}</span></div>
              </div>
              {/* Maximize icon removed */}
            </div>
          ) : (
            <>
              <TimelineStepDisplay 
                step={step} 
                style={style} 
                statusConfig={statusConfig} 
                StatusIcon={StatusIcon} 
                isCompleted={isCompleted} 
                isFailed={isFailed} 
                onEditClick={handlers.handleEditClick}
                onToggleShrink={handlers.toggleCompletedStep}
                onQuickStatusUpdate={handlers.handleQuickStatusUpdate}
              />

              {step.subSteps && step.subSteps.length > 0 && (
                <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2"><GitBranch size={12} /> Sub-Tasks</h4>
                  <div className="space-y-1">
                    {step.subSteps.map((sub, subIdx) => (
                      <SubStepCard key={sub.id} step={sub} index={subIdx} parentId={step.id} categories={allCategories} statuses={allStatuses} snippets={snippets} onPromote={() => handlers.handlePromoteSubStep(step.id, subIdx)} onDelete={() => handlers.handleDeleteSubStep(step.id, subIdx)} onUpdate={(updated) => handlers.handleUpdateSubStep(step.id, subIdx, updated)} onGenerateToTodo={handlers.handleGenerateToTodo} isLoadingTodo={handlers.loadingStepToTodo === sub.id} isDragging={handlers.draggedSubTask?.parentId === step.id && handlers.draggedSubTask?.index === subIdx} isDragTarget={handlers.dragTargetSubTask?.parentId === step.id && handlers.dragTargetSubTask?.index === subIdx} onDragStart={handlers.handleSubTaskDragStart} onDragOver={handlers.handleSubTaskDragOver} onDrop={handlers.handleSubTaskDrop} onDragEnd={handlers.handleSubTaskDragEnd} />
                    ))}
                  </div>
                </div>
              )}

              {handlers.handleLinkTodoToStep && (
                <TimelineTodoConnector
                  step={step}
                  onLinkTodo={handlers.handleLinkTodoToStep}
                  onNavigateToTodo={handlers.handleNavigateToTodo}
                />
              )}

              <TimelineStepActions 
                step={step} 
                activeNoteId={activeNoteId} 
                isCopied={isCopied} 
                onEditClick={handlers.handleEditClick} 
                handlers={handlers} 
              />
            </>
          )}
        </div>

        {step.history && step.history.length > 0 && !isShrunk && (
          <div className="mt-2">
            <button onClick={() => handlers.toggleHistory(step.id)} className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 ml-8 mb-2 transition-colors">
              {isHistoryExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {isHistoryExpanded ? 'Hide History' : `Show ${step.history.length} Archived Attempts`}
            </button>
            {isHistoryExpanded && (
              <div className="flex flex-col gap-1 ml-2 animate-in slide-in-from-top-2">
                {step.history.map((ver, hIdx) => <HistoryItem key={ver.id} version={ver} index={hIdx} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
