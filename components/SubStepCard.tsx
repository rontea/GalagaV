
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
      
      <div className={`border rounded-lg bg-white dark:bg-slate-900/60 transition-all duration-200 ${expanded || isEditing ? 'border-slate-300 dark:border-slate-700 shadow-xl' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>
        {isEditing ? (
          <div className="p-3">
             <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                   <input className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold" value={formData.title} onChange={e => updateField('title', e.target.value)} autoFocus placeholder="Title"/>
                   <div className="flex gap-2">
                     <select value={formData.category} onChange={e => updateField('category', e.target.value)} className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-[10px] uppercase">{Object.keys(categories).map(k => <option key={k} value={k}>{k}</option>)}</select>
                     {/* Fix: Explicitly cast Object.values to StatusConfig[] */}
                     <select value={formData.status} onChange={e => updateField('status', e.target.value)} className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-[10px] uppercase">{(Object.values(statuses) as StatusConfig[]).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
                   </div>
                </div>
                <input type="datetime-local" value={toLocalISOString(formData.createdAt)} onChange={e => updateField('createdAt', new Date(e.target.value).getTime())} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-mono" />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Sub-Task Details</label>
                  <RichTextEditor 
                    value={formData.content || ''} 
                    onChange={val => updateField('content', val)} 
                    placeholder="Details..."
                    className="mb-10"
                    snippets={snippets}
                  />
                </div>
                <div className="pt-2 flex gap-4 items-start">
                    {formData.imageUrl && <div className="relative group/img"><img src={formData.imageUrl} className="h-20 w-32 object-cover rounded" /><button onClick={() => updateField('imageUrl', undefined)} className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full"><X size={10}/></button></div>}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="h-20 w-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900/50"><ImageIcon size={18} /><span className="text-[8px] uppercase font-bold">Attach Image</span></button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/50">
                   <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold uppercase text-slate-500">Cancel</button>
                   <button onClick={handleSave} className="text-[10px] font-bold uppercase bg-cyan-600 text-white px-3 py-1 rounded">Save</button>
                </div>
             </div>
          </div>
        ) : showCompact ? (
          <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpanded(true)}>
             <div className="flex items-center gap-3">
                 <div className={`p-1 rounded ${isFailed ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>{isFailed ? <AlertOctagon size={12} /> : <Check size={12} />}</div>
                 <span className={`text-sm font-bold text-slate-400 line-through`}>{step.title}</span>
             </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between p-3 gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                    <div className={`flex-shrink-0 p-1.5 rounded ${style.bg} ${style.text}`}><Icon size={14} /></div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold truncate">{step.title}</h4>
                      {!expanded && <p className="text-[10px] text-slate-500 truncate font-mono">{step.content.replace(/<[^>]*>/g, '').substring(0, 50)}...</p>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {!isCompleted && !isFailed && (
                      <button onClick={handleQuickComplete} className="p-1.5 text-slate-400 hover:text-emerald-600" title="Complete"><Check size={14} /></button>
                    )}
                    <button onClick={onPromote} className="p-1.5 text-slate-400 hover:text-cyan-600" title="Promote"><MoveUp size={14} /></button>
                </div>
            </div>
            {expanded && (
                <div className="px-3 pb-3 border-t border-slate-200 dark:border-slate-800/50 pt-3">
                    <div className="flex flex-col gap-3 mb-4">
                        <div 
                          ref={contentRef}
                          onClick={handleContentClick}
                          className="rich-content text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1"
                          dangerouslySetInnerHTML={{ __html: step.content }}
                        />
                        {step.imageUrl && <div className="max-w-md"><img src={step.imageUrl} className="max-w-full h-auto rounded shadow-sm cursor-zoom-in border border-slate-200 dark:border-slate-800" onClick={() => setLightboxImage(step.imageUrl!)} /></div>}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/30 pt-2 relative">
                        <button onClick={() => setShowNote(!showNote)} className={`p-1.5 rounded ${step.notes ? 'text-amber-500 bg-amber-50' : 'text-slate-400'}`}><StickyNote size={14} /></button>
                        {showNote && <div className="absolute bottom-full left-0 mb-2 w-56 bg-amber-50 dark:bg-slate-800 border border-amber-200 p-2 rounded-lg z-50 animate-in fade-in zoom-in-95"><textarea className="w-full h-24 bg-transparent border-0 text-xs font-mono" value={step.notes || ''} onChange={e => onUpdate({...step, notes: e.target.value})} autoFocus placeholder="Add note..."/></div>}
                        <div className="flex items-center gap-3">
                            {onGenerateToTodo && (
                              <button 
                                onClick={() => onGenerateToTodo(step)} 
                                disabled={isLoadingTodo}
                                className={`flex items-center gap-1 text-[10px] font-bold uppercase ${isLoadingTodo ? 'text-slate-400 cursor-not-allowed' : 'text-emerald-600 dark:text-emerald-500 hover:text-emerald-700'}`}
                              >
                                <ListTodo size={12} className={isLoadingTodo ? 'animate-pulse' : ''} />
                                {isLoadingTodo ? 'Syncing...' : (step.todoId ? 'Update Todo' : 'Send Todo')}
                              </button>
                            )}
                            <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] font-bold uppercase">
                              <Copy size={12} />
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-[10px] font-bold uppercase">
                              <Edit2 size={12} />
                              Edit
                            </button>
                            <button onClick={onDelete} className="flex items-center gap-1 text-[10px] font-bold uppercase text-rose-500 hover:text-rose-600">
                              <Trash2 size={12} />
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
