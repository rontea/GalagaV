
import React from 'react';
import { ArrowLeft, Edit2, Save, ChevronDown, Upload, X, Calendar, GitBranch, Plus, Trash2 } from 'lucide-react';
import { Step, StatusConfig, Snippet } from '../types';
import { CategoryStyle, BASE_CATEGORIES, toLocalISOString } from '../lib/ui-constants';
import { SubStepCard } from './SubStepCard';
import { FULL_ICON_MAP } from './ProjectList';
import { RichTextEditor } from './RichTextEditor';
import { TimelineTodoConnector } from './TimelineTodoConnector';

interface FocusedStepViewProps {
  step: Step;
  isEditing: boolean;
  formData: Step | null;
  allCategories: Record<string, CategoryStyle>;
  allStatuses: Record<string, StatusConfig>;
  snippets?: Snippet[];
  handlers: {
    onBack: () => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onToggleTab: (id: string) => void;
    updateForm: (field: keyof Step, val: any) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddSubStep: (id: string) => void;
    handlePromoteSubStep: any;
    handleDeleteSubStep: any;
    handleUpdateSubStep: any;
    onDeleteStep: () => void;
    handleGenerateToTodo?: (step: Step) => void;
    handleLinkTodoToStep?: (stepId: string, todoId: string) => void;
    handleNavigateToTodo?: (todoId: string) => void;
    // Sub-Task DND
    subTaskDnd: any;
  }
}

export const FocusedStepView: React.FC<FocusedStepViewProps> = ({ 
  step, isEditing, formData, allCategories, allStatuses, snippets, handlers 
}) => {
  const data = isEditing && formData ? formData : step;
  const style = allCategories[data.category] || BASE_CATEGORIES.frontend;
  const statusConfig = allStatuses[data.status] || { key: 'pending', label: 'Pending', color: 'slate', icon: 'Circle' };
  const Icon = style.icon;
  const StatusIcon = FULL_ICON_MAP[statusConfig.icon] || X;

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="w-full pb-20 animate-in fade-in slide-in-from-bottom-2">
       <div className="mb-6 flex flex-col gap-4">
           <button onClick={handlers.onBack} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={16} /> Back to Timeline
           </button>
           <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg relative">
              <div className="absolute top-6 right-6 flex items-center gap-2">
                   {!isEditing && (
                     <>
                       <button onClick={handlers.onStartEdit} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Edit2 size={20} /></button>
                       <button onClick={handlers.onDeleteStep} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Trash2 size={20} /></button>
                     </>
                   )}
              </div>
              {isEditing ? (
                  <div className="flex flex-col gap-4">
                       <input className="w-full text-2xl sm:text-3xl font-bold bg-slate-50 dark:bg-slate-950 border-b border-cyan-500 outline-none text-slate-900 dark:text-white py-1" value={data.title} onChange={e => handlers.updateForm('title', e.target.value)} placeholder="Task Title"/>
                       <div className="flex flex-wrap gap-4">
                          <div className="w-40">
                              <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Category</label>
                              <div className="relative"><select value={data.category} onChange={e => handlers.updateForm('category', e.target.value)} className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 rounded px-3 py-2 text-xs font-bold uppercase">{Object.keys(allCategories).map(k => <option key={k} value={k}>{k}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></div>
                          </div>
                          <div className="w-40">
                              <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Status</label>
                              {/* Fix: Explicitly cast Object.values to StatusConfig[] */}
                              <div className="relative"><select value={data.status} onChange={e => handlers.updateForm('status', e.target.value)} className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 rounded px-3 py-2 text-xs font-bold uppercase">{(Object.values(allStatuses) as StatusConfig[]).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></div>
                          </div>
                          <div className="w-48"><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Created At</label><input type="datetime-local" value={toLocalISOString(data.createdAt)} onChange={e => handlers.updateForm('createdAt', new Date(e.target.value).getTime())} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 rounded px-3 py-2 text-xs font-mono"/></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Details & Requirements</label>
                        <RichTextEditor 
                          value={data.content || ''} 
                          onChange={val => handlers.updateForm('content', val)} 
                          placeholder="Detailed requirements..."
                          className="mb-6"
                          snippets={snippets}
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-6">
                          <label className="text-[10px] uppercase font-bold text-slate-500 block">Visual Assets</label>
                          <div className="flex items-center gap-4">
                               {data.imageUrl && <div className="relative group/img"><img src={data.imageUrl} className="h-24 w-40 object-cover rounded border border-slate-300 shadow-sm" /><button onClick={() => handlers.updateForm('imageUrl', undefined)} className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full"><X size={12} /></button></div>}
                               <button type="button" onClick={() => fileInputRef.current?.click()} className="h-24 w-40 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/50 hover:border-cyan-500"><Upload size={24} className="text-slate-400" /><span className="text-[10px] uppercase font-bold text-slate-500">Upload Reference</span></button>
                               <input ref={fileInputRef} type="file" accept="image/*" onChange={handlers.handleImageUpload} className="hidden" />
                          </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                          <button onClick={handlers.onCancelEdit} className="px-4 py-2 text-slate-500 text-xs uppercase font-bold">Cancel</button>
                          <button onClick={handlers.onSaveEdit} className="px-6 py-2 bg-cyan-600 text-white rounded font-bold text-xs uppercase shadow-lg flex items-center gap-2"><Save size={14} />Save Changes</button>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col gap-6">
                       <div className="pr-12">
                           <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{data.title || 'Untitled Task'}</h1>
                           <div className="flex flex-wrap items-center gap-3">
                               <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase ${style.bg} ${style.border} ${style.text}`}><Icon size={14} />{data.category}</span>
                               <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase bg-white dark:bg-slate-950 border-slate-200 text-${statusConfig.color}-600`}><StatusIcon size={14} />{statusConfig.label}</span>
                               {data.createdAt && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 text-xs font-mono"><Calendar size={12} />{new Date(data.createdAt).toLocaleString()}</span>}
                           </div>
                       </div>
                       <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                          <h3 className="text-[10px] uppercase font-bold text-slate-400 mb-4 tracking-widest">Details & Requirements</h3>
                          <div 
                            className="rich-content text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-8"
                            dangerouslySetInnerHTML={{ __html: data.content || 'No details provided.' }}
                          />
                          {data.imageUrl && <div className="mt-6"><div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl inline-block max-w-full shadow-lg"><img src={data.imageUrl} className="max-h-[600px] w-auto rounded cursor-zoom-in" onClick={() => window.open(data.imageUrl, '_blank')} /></div></div>}
                          
                          {handlers.handleLinkTodoToStep && (
                             <TimelineTodoConnector
                               step={data}
                               onLinkTodo={handlers.handleLinkTodoToStep}
                               onNavigateToTodo={handlers.handleNavigateToTodo}
                             />
                          )}
                       </div>
                  </div>
              )}
           </div>
       </div>

       <div className="mt-8">
          <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><GitBranch size={20} className="text-cyan-600" />Sub-Tasks</h3>
              <button onClick={() => handlers.handleAddSubStep(step.id)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold uppercase shadow-lg shadow-cyan-900/20"><Plus size={16} /> Add Sub-Task</button>
          </div>
          <div className="space-y-2">
              {(!step.subSteps || step.subSteps.length === 0) && <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 dark:bg-slate-900/20 text-slate-400 text-sm font-mono">No sub-tasks defined.</div>}
              {(step.subSteps || []).map((sub, idx) => (
                  <SubStepCard key={sub.id} step={sub} index={idx} parentId={step.id} categories={allCategories} statuses={allStatuses} snippets={snippets} onPromote={() => handlers.handlePromoteSubStep(step.id, idx)} onDelete={() => handlers.handleDeleteSubStep(step.id, idx)} onUpdate={(updated) => handlers.handleUpdateSubStep(step.id, idx, updated)} onGenerateToTodo={handlers.handleGenerateToTodo} isDragging={handlers.subTaskDnd.draggedSubTask?.parentId === step.id && handlers.subTaskDnd.draggedSubTask?.index === idx} isDragTarget={handlers.subTaskDnd.dragTargetSubTask?.parentId === step.id && handlers.subTaskDnd.dragTargetSubTask?.index === idx} onDragStart={handlers.subTaskDnd.handleSubTaskDragStart} onDragOver={handlers.subTaskDnd.handleSubTaskDragOver} onDrop={handlers.subTaskDnd.handleSubTaskDrop} onDragEnd={handlers.subTaskDnd.handleSubTaskDragEnd} />
              ))}
          </div>
       </div>
    </div>
  );
};
