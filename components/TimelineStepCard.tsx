
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
  timelineLabel?: string;
  timelineLinkId?: string;
  onTimelineLabelClick?: (timelineId: string) => void;
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
  snippets, timelineLabel, timelineLinkId, onTimelineLabelClick, handlers
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
        <div className={`relative rounded-2xl border-2 transition-all duration-300 backdrop-blur-sm ${isShrunk ? (isFailed ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-950/50 dark:to-slate-900/30 border-red-300 dark:border-red-900/50 shadow-sm' : 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-950/50 dark:to-slate-900/30 border-emerald-300 dark:border-emerald-900/50 shadow-sm') : (isFailed ? 'border-red-300 dark:border-red-900/50 bg-gradient-to-br from-red-50 via-white to-slate-50 dark:from-red-950/20 dark:via-slate-900/40 dark:to-slate-900/50 shadow-md' : `${style.border} bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-900/30 shadow-lg`)} ${isEditing ? 'bg-white dark:bg-slate-900 shadow-2xl ring-2 ring-cyan-500/70 ring-offset-1 dark:ring-offset-slate-950' : 'hover:shadow-xl dark:hover:shadow-2xl hover:border-opacity-100'} ${isDragTargetCard ? 'border-2 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20' : ''} ${isShrunk ? 'p-3 sm:p-4' : 'p-6 sm:p-8'}`}>
          
          {iterationCount > 1 && !isEditing && !isShrunk && (
            <div className="absolute -top-4 right-8 flex items-center gap-1.5 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-md"><GitBranch size={12} className="flex-shrink-0" /><span>Rev. {iterationCount}</span></div>
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
            <div className="flex items-center justify-between cursor-pointer group/shrunk hover:opacity-80 transition-opacity" onClick={() => handlers.toggleCompletedStep(step.id)}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg bg-gradient-to-br flex-shrink-0 border-2 ${isFailed ? 'from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 border-red-300 dark:border-red-800/50 text-red-700 dark:text-red-400' : 'from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'}`}><Icon size={18} /></div>
                  <h3 className={`text-sm font-bold line-through text-slate-600 dark:text-slate-400 flex-1 truncate ${isFailed ? 'decoration-red-500 dark:decoration-red-900' : 'decoration-slate-300 dark:decoration-slate-700'}`}>{step.title}</h3>
                  <div className={`hidden sm:inline-flex items-center gap-2 text-[11px] font-bold uppercase px-3 py-1.5 rounded-lg border-2 flex-shrink-0 ${isFailed ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800/50' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50'}`}><StatusIcon size={12} /><span>{statusConfig.label}</span></div>
              </div>
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
                timelineLabel={timelineLabel}
                timelineLinkId={timelineLinkId}
                onTimelineLabelClick={onTimelineLabelClick}
                onEditClick={handlers.handleEditClick}
                onToggleShrink={handlers.toggleCompletedStep}
                onQuickStatusUpdate={handlers.handleQuickStatusUpdate}
              />

              {step.subSteps && step.subSteps.length > 0 && (
                <div className="mt-8 border-t-2 border-slate-200 dark:border-slate-700/50 pt-6">
                  <h4 className="text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2 tracking-wider"><GitBranch size={14} className="flex-shrink-0" /> <span>Sub-Tasks ({step.subSteps.length})</span></h4>
                  <div className="space-y-2">
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
          <div className="mt-4">
            <button onClick={() => handlers.toggleHistory(step.id)} className="flex items-center gap-2.5 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-400 ml-8 mb-3 transition-all duration-200 tracking-wider">
              {isHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{isHistoryExpanded ? 'Hide' : 'Show'} {step.history.length} Archived Attempt{step.history.length !== 1 ? 's' : ''}</span>
            </button>
            {isHistoryExpanded && (
              <div className="flex flex-col gap-2 ml-2 animate-slide-in-top">
                {step.history.map((ver, hIdx) => <HistoryItem key={ver.id} version={ver} index={hIdx} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
