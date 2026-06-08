
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertOctagon, Check, Circle, MoveUp, Edit2, Trash2, StickyNote, X, Image as ImageIcon, Copy, Calendar, ListTodo } from 'lucide-react';
import { Step, CategoryConfig, StatusConfig, Snippet } from '../types';
import { CategoryStyle, BASE_CATEGORIES, copyToClipboard, toLocalISOString } from '../lib/ui-constants';
import { FULL_ICON_MAP } from './ProjectList';
import { RichTextEditor } from './RichTextEditor';
import { Lightbox } from './Lightbox';

interface SubStepCardProps {
  step: Step; 
  index: number;
  parentId: string;
  categories: Record<string, CategoryStyle>;
  statuses: Record<string, StatusConfig>;
  snippets?: Snippet[];
  onPromote: () => void;
  onDelete: () => void;
  onUpdate: (step: Step) => void;
  onGenerateToTodo?: (step: Step) => void;
  isLoadingTodo?: boolean;
  onDragStart: (e: React.DragEvent, parentId: string, index: number) => void;
  onDragOver: (e: React.DragEvent, parentId: string, index: number) => void;
  onDrop: (e: React.DragEvent, parentId: string, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragTarget: boolean;
}

export const SubStepCard: React.FC<SubStepCardProps> = ({ 
  step, index, parentId, categories, statuses, snippets,
  onPromote, onDelete, onUpdate, onGenerateToTodo, isLoadingTodo,
  onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragTarget 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Step>(step);
  const [isCopied, setIsCopied] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setFormData(step); }, [step]);
  useEffect(() => { if (!step.title && !step.content) setIsEditing(true); }, []);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      setLightboxImage((target as HTMLImageElement).src);
    }
  }, []);

  const style = categories[step.category] || categories.frontend || BASE_CATEGORIES.frontend;
  const Icon = style.icon;
  const statusConfig = statuses[step.status] || { key: 'pending', label: 'Pending', color: 'slate', icon: 'Circle' };
  const StatusIcon = FULL_ICON_MAP[statusConfig.icon] || Circle;

  const isCompleted = step.status === 'completed';
  const isFailed = step.status === 'failed';
  const showCompact = (isCompleted || isFailed) && !expanded && !isEditing;

  const updateField = (field: keyof Step, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleSave = () => {
    const finalData = { ...formData };
    if (!finalData.title.trim()) finalData.title = "Untitled Sub-Task";
    if (!finalData.createdAt) finalData.createdAt = Date.now();
    
    // Auto-shrink if completed/failed
    if (finalData.status === 'completed' || finalData.status === 'failed') {
      setExpanded(false);
    }

    onUpdate(finalData);
    setIsEditing(false);
  };

  const handleQuickComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(false);
    onUpdate({ ...step, status: 'completed' });
  };

  const handleCopy = async () => { if (await copyToClipboard(step.content)) { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => updateField('imageUrl', evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div 
      id={`step-${step.id}`}
      className={`relative pl-8 mb-3 group ${isDragging ? 'opacity-40' : ''}`}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, parentId, index)}
      onDragOver={(e) => onDragOver(e, parentId, index)}
      onDrop={(e) => onDrop(e, parentId, index)}
      onDragEnd={onDragEnd}
    >
      {isDragTarget && <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-500 z-20 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>}
      
      <div className={`border-2 rounded-lg bg-gradient-to-r transition-all duration-300 ${expanded || isEditing ? 'from-white via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 border-slate-400 dark:border-slate-700 shadow-lg' : 'from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-slate-300 dark:border-slate-800 hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-800 dark:hover:to-slate-900 shadow-sm hover:shadow-md'}`}>
        {isEditing ? (
          <div className="p-4 sm:p-5">
             <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                   <input 
                     className="flex-1 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:text-white" 
                     value={formData.title} 
                     onChange={e => updateField('title', e.target.value)} 
                     autoFocus 
                     placeholder="Sub-task title"
                   />
                   <div className="flex gap-2">
                     <select 
                       value={formData.category} 
                       onChange={e => updateField('category', e.target.value)} 
                       className="w-28 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-[11px] font-bold uppercase focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:text-white"
                     >
                       {Object.keys(categories).map(k => <option key={k} value={k}>{k}</option>)}
                     </select>
                     <select 
                       value={formData.status} 
                       onChange={e => updateField('status', e.target.value)} 
                       className="w-28 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-[11px] font-bold uppercase focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:text-white"
                     >
                       {(Object.values(statuses) as StatusConfig[]).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                     </select>
                   </div>
                </div>
                <input 
                  type="datetime-local" 
                  value={toLocalISOString(formData.createdAt)} 
                  onChange={e => updateField('createdAt', new Date(e.target.value).getTime())} 
                  className="w-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:text-white" 
                />
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wide">Details</label>
                  <RichTextEditor 
                    value={formData.content || ''} 
                    onChange={val => updateField('content', val)} 
                    placeholder="Add sub-task details..."
                    className="mb-2"
                    snippets={snippets}
                  />
                </div>
                <div className="pt-2 flex gap-4 items-start">
                    {formData.imageUrl && (
                      <div className="relative group/img">
                        <img src={formData.imageUrl} className="h-20 w-32 object-cover rounded-lg border-2 border-slate-300 dark:border-slate-700" />
                        <button 
                          onClick={() => updateField('imageUrl', undefined)} 
                          className="absolute -top-3 -right-3 p-1.5 bg-rose-600 dark:bg-rose-700 text-white rounded-full border-2 border-white dark:border-slate-900 shadow-lg hover:bg-rose-700 transition-colors"
                        >
                          <X size={12}/>
                        </button>
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="h-20 w-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-400 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-950/50 hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors text-slate-600 dark:text-slate-400"
                    >
                      <ImageIcon size={18} />
                      <span className="text-[9px] uppercase font-bold mt-1">Add Image</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                <div className="flex justify-end gap-2.5 pt-3 border-t-2 border-slate-200 dark:border-slate-700">
                   <button 
                     onClick={() => setIsEditing(false)} 
                     className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleSave} 
                     className="text-[11px] font-bold uppercase bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-500 dark:to-blue-500 text-white px-5 py-2 rounded-lg hover:from-cyan-700 hover:to-blue-700 dark:hover:from-cyan-600 dark:hover:to-blue-600 transition-all shadow-md transform hover:scale-105"
                   >
                     Save
                   </button>
                </div>
             </div>
          </div>
        ) : showCompact ? (
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setExpanded(true)}>
             <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg flex-shrink-0 ${isFailed ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/30' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30'}`}>
                   {isFailed ? <AlertOctagon size={14} /> : <Check size={14} />}
                 </div>
                 <span className={`text-sm font-bold text-slate-600 dark:text-slate-400 line-through`}>{step.title}</span>
             </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setExpanded(!expanded)}>
                    <div className={`flex-shrink-0 p-2 rounded-lg ${style.bg} ${style.text}`}><Icon size={16} /></div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{step.title}</h4>
                      {!expanded && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">
                          {step.content.replace(/<[^>]*>/g, '').substring(0, 60)}...
                        </p>
                      )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isCompleted && !isFailed && (
                      <button 
                        onClick={handleQuickComplete} 
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 rounded-lg transition-all" 
                        title="Mark complete"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button 
                      onClick={onPromote} 
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-950/30 rounded-lg transition-all" 
                      title="Promote to main step"
                    >
                      <MoveUp size={16} />
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="px-4 pb-4 border-t-2 border-slate-200 dark:border-slate-700 pt-4 bg-slate-50 dark:bg-slate-950/50">
                    <div className="flex flex-col gap-4 mb-4">
                        <div 
                          ref={contentRef}
                          onClick={handleContentClick}
                          className="rich-content text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: step.content }}
                        />
                        {step.imageUrl && (
                          <div className="max-w-md">
                            <img 
                              src={step.imageUrl} 
                              className="max-w-full h-auto rounded-lg shadow-lg cursor-zoom-in border-2 border-slate-300 dark:border-slate-700 hover:shadow-xl transition-shadow" 
                              onClick={() => setLightboxImage(step.imageUrl!)} 
                            />
                          </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between border-t-2 border-slate-200 dark:border-slate-700 pt-3 gap-3 relative">
                        <button 
                          onClick={() => setShowNote(!showNote)} 
                          className={`p-2 rounded-lg transition-all ${step.notes ? 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border-2 border-slate-300 dark:border-slate-700'}`}
                        >
                          <StickyNote size={16} />
                        </button>
                        {showNote && (
                          <div className="absolute bottom-full left-0 mb-3 w-64 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 border-2 border-amber-300 dark:border-slate-700 p-3 rounded-lg z-50 animate-slide-in-top shadow-xl">
                            <textarea 
                              className="w-full h-28 bg-white dark:bg-slate-950 border-2 border-amber-200 dark:border-slate-700 text-xs font-mono p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 resize-none" 
                              value={step.notes || ''} 
                              onChange={e => onUpdate({...step, notes: e.target.value})} 
                              autoFocus 
                              placeholder="Add a note..."
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                            {onGenerateToTodo && (
                              <button 
                                onClick={() => onGenerateToTodo(step)} 
                                disabled={isLoadingTodo}
                                className={`flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-2 rounded-lg transition-all ${isLoadingTodo ? 'text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-60' : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800/50'}`}
                              >
                                <ListTodo size={14} className={isLoadingTodo ? 'animate-spin' : ''} />
                                {isLoadingTodo ? 'Syncing...' : (step.todoId ? 'Update Todo' : 'Send Todo')}
                              </button>
                            )}
                            <button 
                              onClick={handleCopy} 
                              className={`flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-2 rounded-lg transition-all border-2 ${isCopied ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50' : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700'}`}
                            >
                              <Copy size={14} />
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>
                            <button 
                              onClick={() => setIsEditing(true)} 
                              className="flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-2 rounded-lg text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 transition-all"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button 
                              onClick={onDelete} 
                              className="flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-2 rounded-lg text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800/50 transition-all"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
      <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
};
