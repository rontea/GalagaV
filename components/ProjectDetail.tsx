import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './Header';
import { Project, Step, StepVersion, CategoryConfig, StatusConfig, GlobalConfig, PluginConfig } from '../types';
import { FULL_ICON_MAP } from './ProjectList';
import ConfirmModal from './ConfirmModal';
import SettingsModal from './SettingsModal';
import PluginView from './PluginView';
import ProjectSettingsModal from './ProjectSettingsModal';
import { 
  Layout, Database, Palette, CheckCircle2, Circle, Clock, LucideIcon,
  Edit2, Save, Plus, Trash2, Bot, Copy, Check, GripVertical, X, Fingerprint, Terminal,
  AlertOctagon, ChevronDown, ChevronRight, GitBranch, MoveUp, Minimize2, Maximize2, CornerDownRight,
  ChevronUp, Tag, Layers, Play, Pause, Flag, Archive, Bookmark, Zap, AlertTriangle, Activity,
  RefreshCw, FileWarning, StickyNote, Files, AppWindow, Blocks, ArrowLeft, Eye, Settings
} from 'lucide-react';

// --- Utility: Robust Copy to Clipboard ---
const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  try {
    // Try Modern API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard API failed, trying fallback...", err);
  }

  // Fallback for older browsers or non-secure contexts
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    return result;
  } catch (err) {
    console.error("Copy failed", err);
    return false;
  }
};

// --- Constants ---
interface CategoryStyle {
  color: string;
  icon: LucideIcon;
  bg: string;
  border: string;
  text: string;
  badgeBorder: string;
}

// Helper to generate style object dynamically
const createCategoryStyle = (color: string, Icon: LucideIcon): CategoryStyle => ({
  color,
  icon: Icon,
  bg: `bg-${color}-50 dark:bg-${color}-950/20`,
  border: `border-${color}-200 dark:border-${color}-500/30`,
  badgeBorder: `border-${color}-300 dark:border-${color}-500/50`,
  text: `text-${color}-600 dark:text-${color}-400`
});

const BASE_CATEGORIES: Record<string, CategoryStyle> = {
  frontend: createCategoryStyle('cyan', Layout),
  backend: createCategoryStyle('violet', Database),
  design: createCategoryStyle('rose', Palette)
};

// Default Status Configurations
const BASE_STATUSES: Record<string, StatusConfig> = {
  'pending': { key: 'pending', label: 'Pending', color: 'slate', icon: 'Circle' },
  'in-progress': { key: 'in-progress', label: 'In Progress', color: 'amber', icon: 'Clock' },
  'completed': { key: 'completed', label: 'Completed', color: 'emerald', icon: 'CheckCircle2' },
  'failed': { key: 'failed', label: 'Failed', color: 'red', icon: 'AlertOctagon' }
};

// --- Helper Component for History Items ---
const HistoryItem: React.FC<{ version: StepVersion; index: number }> = ({ version, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative pl-6 pb-2">
      {/* Tree Connector Line */}
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
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {/* Status Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${expanded ? 'bg-rose-500' : 'bg-rose-200 dark:bg-rose-900/50 group-hover:bg-rose-400 dark:group-hover:bg-rose-800'}`} />

        <div className="p-3 pl-4">
          <div className="flex justify-between items-center gap-3">
            
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`p-1.5 rounded-full flex-shrink-0 ${expanded ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                <AlertOctagon size={12} aria-hidden="true" />
              </div>
              
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                     {version.failureReason ? `Revision: ${version.failureReason}` : `Failed Attempt #${index + 1}`}
                   </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                   <span>{new Date(version.timestamp).toLocaleString()}</span>
                   <span>•</span>
                   <span className="uppercase tracking-wider">Archived</span>
                </div>
              </div>
            </div>
            
            <div className="text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400">
              {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
            </div>
          </div>

          {/* Expanded Content */}
          <div className={`
            grid transition-all duration-300 ease-in-out
            ${expanded ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800' : 'grid-rows-[0fr] opacity-0'}
          `}>
            <div className="overflow-hidden min-h-0">
               {version.failureReason && (
                  <div className="mb-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded p-2">
                    <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-500 block mb-1">Reason for Failure</span>
                    <p className="text-xs text-rose-800 dark:text-rose-200 font-sans italic">"{version.failureReason}"</p>
                  </div>
               )}
               
               <div className="bg-slate-50 dark:bg-black/30 rounded p-2 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Snapshot Content</span>
                  <p className="text-xs text-slate-700 dark:text-slate-400 font-mono whitespace-pre-wrap leading-relaxed break-words">
                    {version.content}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub Card Component ---
const SubStepCard: React.FC<{ 
  step: Step; 
  index: number;
  parentId: string;
  categories: Record<string, CategoryStyle>;
  statuses: Record<string, StatusConfig>;
  onPromote: () => void;
  onDelete: () => void;
  onUpdate: (step: Step) => void;
  // Drag Props
  onDragStart: (e: React.DragEvent, parentId: string, index: number) => void;
  onDragOver: (e: React.DragEvent, parentId: string, index: number) => void;
  onDrop: (e: React.DragEvent, parentId: string, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragTarget: boolean;
}> = ({ 
  step, index, parentId, categories, statuses, 
  onPromote, onDelete, onUpdate, 
  onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragTarget 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Step>(step);
  const [isCopied, setIsCopied] = useState(false);
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    setFormData(step);
  }, [step]);

  // Auto-edit if new/empty
  useEffect(() => {
    if (!step.title && !step.content) {
        setIsEditing(true);
    }
  }, []);

  const style = categories[step.category] || categories.frontend || BASE_CATEGORIES.frontend;
  const Icon = style.icon;
  
  // Resolve Status Style
  const statusConfig = statuses[step.status] || statuses.pending;
  const StatusIcon = FULL_ICON_MAP[statusConfig.icon] || Circle;

  // Compact Logic
  const isCompleted = step.status === 'completed';
  const isFailed = step.status === 'failed';
  const showCompact = (isCompleted || isFailed) && !expanded && !isEditing;

  const updateField = (field: keyof Step, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const finalData = { ...formData };
    if (!finalData.title.trim()) finalData.title = "Untitled Sub-Task";
    onUpdate(finalData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(step);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(step.content);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div 
      className={`relative pl-8 mb-3 group ${isDragging ? 'opacity-40' : ''}`}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, parentId, index)}
      onDragOver={(e) => onDragOver(e, parentId, index)}
      onDrop={(e) => onDrop(e, parentId, index)}
      onDragEnd={onDragEnd}
    >
      {/* Insertion Indicator */}
      {isDragTarget && (
         <div className="absolute top-0 left-8 right-0 h-0.5 bg-cyan-500 z-20 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
      )}

      {/* Connector Line */}
      <div className="absolute left-0 top-0 h-full w-px bg-slate-300 dark:bg-slate-800 group-hover:bg-slate-400 dark:group-hover:bg-slate-700 transition-colors"></div>
      <div className="absolute left-0 top-6 w-6 h-px bg-slate-300 dark:bg-slate-800 group-hover:bg-slate-400 dark:group-hover:bg-slate-700 transition-colors"></div>
      
      <div className={`
        border rounded-lg bg-white dark:bg-slate-900/60 transition-all duration-200
        ${expanded || isEditing ? 'border-slate-300 dark:border-slate-700 shadow-xl' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}
        ${isEditing ? 'ring-1 ring-cyan-500/30' : ''}
        ${showCompact 
            ? (isFailed ? 'border-red-200 dark:border-red-900/30 hover:border-red-400/30' : 'border-emerald-200 dark:border-emerald-900/30 hover:border-emerald-400/30') 
            : ''}
      `}>
        {isEditing ? (
          // --- EDIT MODE ---
          <div className="p-3 animate-in fade-in duration-200">
             <div className="flex flex-col gap-3">
                {/* Header Inputs */}
                <div className="flex flex-col sm:flex-row gap-2">
                   <div className="flex-1">
                      <label htmlFor={`sub-title-${step.id}`} className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Sub-Task Title</label>
                      <input 
                        id={`sub-title-${step.id}`}
                        value={formData.title}
                        onChange={e => updateField('title', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:border-cyan-500 outline-none font-bold"
                        autoFocus
                      />
                   </div>
                   <div className="flex gap-2">
                     <div className="w-24">
                        <label htmlFor={`sub-cat-${step.id}`} className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Cat.</label>
                        <select 
                          id={`sub-cat-${step.id}`}
                          value={formData.category}
                          onChange={e => updateField('category', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-[10px] uppercase text-slate-700 dark:text-slate-300 focus:border-cyan-500 outline-none"
                        >
                          {Object.keys(categories).map(key => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </select>
                     </div>
                     <div className="w-24">
                        <label htmlFor={`sub-stat-${step.id}`} className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Status</label>
                        <select 
                          id={`sub-stat-${step.id}`}
                          value={formData.status}
                          onChange={e => updateField('status', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-[10px] uppercase text-slate-700 dark:text-slate-300 focus:border-cyan-500 outline-none"
                        >
                          {(Object.values(statuses) as StatusConfig[]).map(s => (
                             <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                     </div>
                   </div>
                </div>

                {/* Content Input */}
                <div>
                   <label htmlFor={`sub-content-${step.id}`} className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Details</label>
                   <textarea 
                      id={`sub-content-${step.id}`}
                      value={formData.content}
                      onChange={e => updateField('content', e.target.value)}
                      className="w-full h-20 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-2 text-xs text-slate-800 dark:text-slate-300 focus:border-cyan-500 outline-none resize-none font-mono"
                   />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/50">
                   <button 
                     onClick={handleCancel}
                     className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 px-2 py-1"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleSave}
                     className="text-[10px] font-bold uppercase bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded shadow-sm"
                   >
                     Save Changes
                   </button>
                </div>
             </div>
          </div>
        ) : showCompact ? (
          // --- COMPACT COMPLETED/FAILED VIEW ---
          <div 
             className="flex items-center justify-between p-3 gap-2 cursor-pointer group/subcompact"
             onClick={() => setExpanded(true)}
             role="button"
             tabIndex={0}
             onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded(true)}
             title="Click to expand"
          >
             <div className="flex items-center gap-3">
                 <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-700">
                    <GripVertical size={14} aria-hidden="true" />
                 </div>
                 <div className={`p-1 rounded ${isFailed ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900'}`}>
                    {isFailed ? <AlertOctagon size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                 </div>
                 <span className={`text-sm font-bold text-slate-400 dark:text-slate-500 line-through ${isFailed ? 'decoration-red-500 dark:decoration-red-400' : 'decoration-slate-300 dark:decoration-slate-600'}`}>
                    {step.title}
                 </span>
                 <div className={`hidden sm:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${isFailed ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/30' : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30'}`}>
                    <StatusIcon size={10} aria-hidden="true" />
                    <span>{statusConfig.label}</span>
                 </div>
             </div>
             <div className={`text-slate-300 transition-colors ${isFailed ? 'group-hover/subcompact:text-red-500' : 'group-hover/subcompact:text-emerald-500'}`}>
                <Maximize2 size={14} aria-hidden="true" />
             </div>
          </div>
        ) : (
          // --- VIEW MODE ---
          <div className="flex items-center justify-between p-3 gap-2">
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-700 dark:hover:text-slate-500 p-1">
               <GripVertical size={14} aria-hidden="true" />
            </div>
            
            <div 
               className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
               role="button"
               tabIndex={0}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded(!expanded)}
               onClick={() => setExpanded(!expanded)}
               aria-expanded={expanded}
            >
                {/* Number Badge */}
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                   #{index + 1}
                </div>

                <div className={`flex-shrink-0 p-1.5 rounded ${style.bg} ${style.text}`}>
                  <Icon size={14} aria-hidden="true" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`text-sm font-bold truncate ${expanded ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {step.title}
                    </h4>
                    
                    <div className="flex items-center gap-2 ml-auto sm:ml-2">
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ${style.border} ${style.text} bg-slate-50 dark:bg-slate-950/30 whitespace-nowrap`}>
                        {step.category}
                        </span>
                        
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400 whitespace-nowrap`}>
                           <StatusIcon size={10} aria-hidden="true" />
                           <span className="text-[9px] uppercase font-bold">{statusConfig.label}</span>
                        </div>
                    </div>
                  </div>
                  {!expanded && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono mt-1 opacity-90 break-words">
                      {step.content.substring(0, 50)}{step.content.length > 50 ? '...' : ''}
                    </p>
                  )}
                </div>
            </div>

             <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onPromote(); }}
                  className="p-1.5 text-slate-400 hover:text-cyan-600 dark:text-slate-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                  title="Promote to Main Timeline"
                  aria-label={`Promote sub-task ${step.title}`}
                >
                  <MoveUp size={14} aria-hidden="true" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                  className="p-1.5 text-slate-400 hover:text-cyan-600 dark:text-slate-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                  title={expanded ? "Collapse" : "Expand"}
                  aria-label={expanded ? "Collapse sub-task" : "Expand sub-task"}
                >
                  {expanded ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
                </button>
              </div>
           </div>
        )}

        {/* Expanded Content View Mode */}
        {!isEditing && expanded && (
            <div className="px-3 pb-3 pt-0 animate-in fade-in slide-in-from-top-1">
            <div className="border-t border-slate-200 dark:border-slate-800/50 pt-3 mt-1">
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-light leading-relaxed mb-3 pl-1 break-words">
                {step.content}
                </p>
                
                {/* Actions & Notes Toolbar */}
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/30 pt-2 relative">
                    {/* Note Toggle */}
                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowNote(!showNote); }}
                            className={`p-1.5 rounded-md transition-colors ${step.notes ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title="Sub-Task Note"
                        >
                            <StickyNote size={14} />
                            {step.notes && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-amber-500 rounded-full border border-white dark:border-slate-900"></span>}
                        </button>
                        
                        {showNote && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowNote(false)}></div>
                                <div className="absolute bottom-full left-0 mb-2 w-56 bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                     <div className="flex items-center justify-between mb-1 px-1">
                                        <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-500 tracking-wider">Note</span>
                                    </div>
                                    <textarea 
                                        className="w-full h-24 bg-transparent border-0 focus:ring-0 p-1 text-xs text-slate-700 dark:text-slate-300 font-mono resize-none leading-relaxed placeholder-slate-400 dark:placeholder-slate-600"
                                        placeholder="Add a note..."
                                        value={step.notes || ''}
                                        onChange={(e) => {
                                            // Directly calling onUpdate with new notes
                                            onUpdate({ ...step, notes: e.target.value });
                                        }}
                                        onClick={(e) => e.stopPropagation()} 
                                        autoFocus
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Main Actions */}
                    <div className="flex gap-2">
                        <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 uppercase font-bold px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                        {isCopied ? <Check size={10} aria-hidden="true" /> : <Copy size={10} aria-hidden="true" />}
                        {isCopied ? 'Copied' : 'Copy'}
                        </button>
                        <button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 uppercase font-bold px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                        <Edit2 size={10} aria-hidden="true" /> Edit
                        </button>
                        <button 
                        onClick={() => onDelete()}
                        className="flex items-center gap-1 text-[10px] text-rose-700 hover:text-rose-500 dark:text-rose-900 dark:hover:text-rose-500 uppercase font-bold px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                        <Trash2 size={10} aria-hidden="true" /> Delete
                        </button>
                    </div>
                </div>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};


interface ProjectDetailProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onDeleteProject: (id: string) => void;
  onBack: () => void;
  // Updated Props for Global Config
  globalConfig: GlobalConfig;
  onUpdateGlobalConfig: (config: GlobalConfig) => void;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  isDanger: boolean;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ 
  project, 
  onUpdateProject, 
  onDeleteProject, 
  onBack,
  globalConfig,
  onUpdateGlobalConfig
}) => {
  // UI State
  const [activeTab, setActiveTab] = useState('timeline');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Step>>({});
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  // Focused Tab Edit State
  const [focusedEditing, setFocusedEditing] = useState(false);
  const [focusedForm, setFocusedForm] = useState<Step | null>(null);

  // Local Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);

  // Expanded History State
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  
  // Completed Steps Expansion State (Shrunk by default)
  const [expandedCompletedSteps, setExpandedCompletedSteps] = useState<Record<string, boolean>>({});

  // Drag and Drop State (Main Tasks)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<{ index: number; type: 'gap' | 'card' } | null>(null);

  // Drag and Drop State (Sub Tasks)
  const [draggedSubTask, setDraggedSubTask] = useState<{ parentId: string; index: number } | null>(null);
  const [dragTargetSubTask, setDragTargetSubTask] = useState<{ parentId: string; index: number } | null>(null);

  // Reset focused editing when tab changes
  useEffect(() => {
    setFocusedEditing(false);
    setFocusedForm(null);
  }, [activeTab]);

  // Computed Categories
  const allCategories = useMemo(() => {
    const cats = { ...BASE_CATEGORIES };
    if (project.categories) {
      project.categories.forEach(c => {
        cats[c.key] = createCategoryStyle(c.color, Tag); // Default to Tag icon for custom
      });
    }
    return cats;
  }, [project.categories]);

  // Computed Statuses
  const allStatuses = useMemo(() => {
    const statuses: Record<string, StatusConfig> = { ...BASE_STATUSES };
    if (project.statuses) {
      project.statuses.forEach(s => {
        statuses[s.key] = s;
      });
    }
    return statuses;
  }, [project.statuses]);


  const handleDownloadProject = () => {
    const jsonString = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = `${project.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  // --- Handlers: Steps ---

  const handleEditClick = (step: Step) => {
    setEditingStepId(step.id);
    setEditFormData({ ...step });
    
    // If it was shrunk, expand it automatically when editing
    if (expandedCompletedSteps[step.id] === false) {
        toggleCompletedStep(step.id);
    }
  };

  const handleCancelEdit = () => {
    setEditingStepId(null);
    setEditFormData({});
  };

  const handleSaveStep = () => {
    if (!editingStepId) return;

    const finalData = { ...editFormData };
    // Fallback if user saves empty title
    if (!finalData.title || !finalData.title.trim()) {
      finalData.title = "Untitled Task";
    }

    onUpdateProject({
      ...project,
      steps: project.steps.map(s => 
        s.id === editingStepId ? { ...s, ...finalData } as Step : s
      )
    });
    
    setEditingStepId(null);
    setEditFormData({});
  };

  const handleAddStep = () => {
    const newId = `step_${Date.now()}`;
    const newStep: Step = {
      id: newId,
      title: '', // Empty default so placeholder shows and user can type immediately
      category: 'frontend',
      status: 'pending',
      content: '', // Empty default so placeholder shows and user can type immediately
      history: [],
      subSteps: []
    };

    onUpdateProject({
      ...project,
      steps: [...project.steps, newStep]
    });

    setEditingStepId(newId);
    setEditFormData(newStep);
  };

  const handleDeleteStep = (stepId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Archive Task?",
      message: "Are you sure you want to archive this task? It will be moved to the 'Decommissioned Tasks' section.",
      isDanger: false,
      onConfirm: () => {
        onUpdateProject({
          ...project,
          steps: project.steps.map(s => s.id === stepId ? { ...s, archivedAt: Date.now() } : s)
        });
        // If the step was active as a tab, go back to timeline
        if (activeTab === stepId) {
            setActiveTab('timeline');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDuplicateStep = (stepId: string) => {
    const stepIndex = project.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    const originalStep = project.steps[stepIndex];
    const timestamp = Date.now();

    const newStep: Step = {
        ...originalStep,
        id: `step_${timestamp}`,
        title: `${originalStep.title} (Copy)`,
        history: [], // Reset history
        isTab: false, // Don't duplicate tab state by default
        subSteps: originalStep.subSteps?.map((sub, idx) => ({
            ...sub,
            id: `step_${timestamp}_sub_${idx}`
        })) || []
    };

    const updatedSteps = [...project.steps];
    updatedSteps.splice(stepIndex + 1, 0, newStep);

    onUpdateProject({
        ...project,
        steps: updatedSteps
    });
  };

  const handleToggleTab = (stepId: string) => {
     const updatedSteps = project.steps.map(s => {
         if (s.id === stepId) {
             const newIsTab = !s.isTab;
             // If we are turning it on, make it the active tab
             if (newIsTab) setActiveTab(s.id);
             return { ...s, isTab: newIsTab };
         }
         return s;
     });
     onUpdateProject({ ...project, steps: updatedSteps });
  };

  const handleAddSubStep = (parentId: string) => {
    const updatedSteps = project.steps.map(s => {
      if (s.id === parentId) {
        const newSub: Step = {
          id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: '',
          category: s.category, 
          status: 'pending',
          content: '',
          subSteps: []
        };
        const currentSubs = s.subSteps || [];
        return { ...s, subSteps: [...currentSubs, newSub] };
      }
      return s;
    });
    onUpdateProject({ ...project, steps: updatedSteps });
  };

  const handleRestoreStep = (stepId: string) => {
    onUpdateProject({
      ...project,
      steps: project.steps.map(s => s.id === stepId ? { ...s, archivedAt: undefined } : s)
    });
  };

  const handlePermanentDeleteStep = (stepId: string) => {
     setConfirmModal({
      isOpen: true,
      title: "Destroy Task?",
      message: "WARNING: This will permanently delete this task and cannot be undone.",
      isDanger: true,
      onConfirm: () => {
        onUpdateProject({
          ...project,
          steps: project.steps.filter(s => s.id !== stepId)
        });
        setConfirmModal(null);
      }
    });
  };

  // --- Sub-Step Logic ---
  const handlePromoteSubStep = (parentId: string, subStepIndex: number) => {
    const updatedSteps = [...project.steps];
    const parentIndex = updatedSteps.findIndex(s => s.id === parentId);
    if (parentIndex === -1) return;

    const parent = updatedSteps[parentIndex];
    if (!parent.subSteps) return;

    const [promotedStep] = parent.subSteps.splice(subStepIndex, 1);
    
    // Add to root level right after parent
    updatedSteps.splice(parentIndex + 1, 0, promotedStep);

    onUpdateProject({ ...project, steps: updatedSteps });
  };

  const handleDeleteSubStep = (parentId: string, subStepIndex: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Sub-Task?",
      message: "Are you sure you want to delete this sub-task?",
      isDanger: true,
      onConfirm: () => {
        const updatedSteps = [...project.steps];
        const parent = updatedSteps.find(s => s.id === parentId);
        if (parent && parent.subSteps) {
          parent.subSteps.splice(subStepIndex, 1);
          onUpdateProject({ ...project, steps: updatedSteps });
        }
        setConfirmModal(null);
      }
    });
  };

  const handleUpdateSubStep = (parentId: string, subStepIndex: number, updatedSubStep: Step) => {
    const updatedSteps = [...project.steps];
    const parent = updatedSteps.find(s => s.id === parentId);
    if (parent && parent.subSteps) {
      parent.subSteps[subStepIndex] = updatedSubStep;
      onUpdateProject({ ...project, steps: updatedSteps });
    }
  };

  const toggleHistory = (stepId: string) => {
    setExpandedHistory(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const toggleCompletedStep = (stepId: string) => {
    setExpandedCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleSmartCopy = async (step: Step) => {
    const fullPrompt = `${project.systemPrompt}\n\n${step.content}`;
    const success = await copyToClipboard(fullPrompt);
    if (success) {
      setCopiedStepId(step.id);
      setTimeout(() => setCopiedStepId(null), 2000);
    }
  };

  const updateField = (field: keyof Step, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateNote = (stepId: string, note: string) => {
    onUpdateProject({
      ...project,
      steps: project.steps.map(s => s.id === stepId ? { ...s, notes: note } : s)
    });
  };

  // --- Drag and Drop Handlers (Main Tasks) ---

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    // Must be dragging something (Main Task OR Sub Task)
    if (draggedIndex === null && !draggedSubTask) return;
    
    // If dragging Main Task, don't drag on self
    if (draggedIndex === index) return;

    const targetStepId = project.steps[index].id;
    
    // Restrict nesting if editing
    const isTargetEditing = targetStepId === editingStepId;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    const isShrunkTarget = height < 80; 
    
    const threshold = 20; 
    
    // Decision Logic for Drop Target Type
    // If we are editing the target, we CANNOT nest (sub-list is hidden), so force gap.
    // If dragging sub-task, we can nest or promote (gap).
    
    if (isTargetEditing || y < threshold || y > height - threshold || isShrunkTarget) {
       setDragTarget({ index, type: 'gap' });
    } else {
       setDragTarget({ index, type: 'card' });
    }
  };

  const handleDrop = (dropIndex: number) => {
    // Case 1: Dragging a Main Task (Existing Logic)
    if (draggedIndex !== null) {
        if (draggedIndex === dropIndex) return;
        
        const updatedSteps = [...project.steps];
        
        if (dragTarget?.type === 'card') {
           // NESTING LOGIC
           const [movedStep] = updatedSteps.splice(draggedIndex, 1);
           
           let targetIdx = dropIndex;
           if (draggedIndex < dropIndex) {
             targetIdx--; 
           }
           
           const targetStep = updatedSteps[targetIdx];
           
           if (targetStep) {
             if (!targetStep.subSteps) targetStep.subSteps = [];
             targetStep.subSteps.push(movedStep);
           } else {
             updatedSteps.splice(dropIndex, 0, movedStep);
           }
    
        } else {
           // REORDERING LOGIC
           const [movedStep] = updatedSteps.splice(draggedIndex, 1);
           updatedSteps.splice(dropIndex, 0, movedStep);
        }
    
        onUpdateProject({ ...project, steps: updatedSteps });
        setDraggedIndex(null);
        setDragTarget(null);
        return;
    }

    // Case 2: Dragging a Sub-Task
    if (draggedSubTask) {
        const { parentId: sourceParentId, index: sourceIndex } = draggedSubTask;
        const updatedSteps = [...project.steps];

        // 1. Find and remove from source
        const sourceParent = updatedSteps.find(s => s.id === sourceParentId);
        if (!sourceParent || !sourceParent.subSteps) return;

        // Extract the item
        const [movedItem] = sourceParent.subSteps.splice(sourceIndex, 1);

        // 2. Place in target
        if (dragTarget?.type === 'card') {
            // Nest into the target Main Task (Move Sub-Task to another parent)
            const targetStep = updatedSteps[dropIndex];
            if (targetStep) {
                if (!targetStep.subSteps) targetStep.subSteps = [];
                targetStep.subSteps.push(movedItem);
            } else {
                // Fallback: Restore item to source if target missing
                sourceParent.subSteps.splice(sourceIndex, 0, movedItem);
                return;
            }
        } else {
            // 'gap' -> Promote to Main Task at dropIndex (Insert as root step)
            updatedSteps.splice(dropIndex, 0, movedItem);
        }

        onUpdateProject({ ...project, steps: updatedSteps });
        setDraggedSubTask(null);
        setDragTarget(null); // Clear main drag target
    }
  };

  // --- Drag and Drop Handlers (Sub Tasks) ---
  const handleSubTaskDragStart = (e: React.DragEvent, parentId: string, index: number) => {
    e.stopPropagation();
    setDraggedSubTask({ parentId, index });
  };

  const handleSubTaskDragOver = (e: React.DragEvent, parentId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSubTask) {
       // Allow dropping even if same parent/index to enable simple visual feedback, 
       // but logic will prevent no-op
       setDragTargetSubTask({ parentId, index });
    }
  };

  const handleSubTaskDrop = (e: React.DragEvent, targetParentId: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedSubTask) return;
    
    const { parentId: sourceParentId, index: sourceIndex } = draggedSubTask;
    
    // Copy steps
    const updatedSteps = [...project.steps];
    
    // Find source parent
    const sourceParent = updatedSteps.find(s => s.id === sourceParentId);
    if (!sourceParent || !sourceParent.subSteps) return;
    
    // Remove item from source
    const [movedItem] = sourceParent.subSteps.splice(sourceIndex, 1);
    
    let finalTargetIndex = targetIndex;
    
    // If moving within the same parent
    if (sourceParentId === targetParentId) {
         // If moving down in the same list, the splice above shifted subsequent items up
         // So if we are dropping at an index that was originally higher than source, we need to adjust
         if (sourceIndex < targetIndex) {
             finalTargetIndex--; // Decrement because the target shifted up by 1
         }
         // Ensure bounds
         if (finalTargetIndex < 0) finalTargetIndex = 0;
         if (finalTargetIndex > sourceParent.subSteps.length) finalTargetIndex = sourceParent.subSteps.length;
         
         sourceParent.subSteps.splice(finalTargetIndex, 0, movedItem);
    } else {
         // Moving to a different parent
         const targetParent = updatedSteps.find(s => s.id === targetParentId);
         if (targetParent) {
             if (!targetParent.subSteps) targetParent.subSteps = [];
             targetParent.subSteps.splice(finalTargetIndex, 0, movedItem);
         }
    }
    
    onUpdateProject({ ...project, steps: updatedSteps });
    setDraggedSubTask(null);
    setDragTargetSubTask(null);
  };

  const handleSubTaskDragEnd = () => {
    setDraggedSubTask(null);
    setDragTargetSubTask(null);
  };

  const ProjectIcon = FULL_ICON_MAP[project.icon || 'Terminal'] || Terminal;
  
  const activeSteps = project.steps.filter(s => !s.archivedAt);
  const archivedSteps = project.steps.filter(s => s.archivedAt);
  
  // Filter steps designated as tabs
  const tabSteps = activeSteps.filter(s => s.isTab);

  // Filter enabled plugins
  const enabledPlugins = (globalConfig.plugins || []).filter(p => p.enabled);

  // --- Step Tab View Component (Focused Mode) ---
  const renderFocusedStep = (step: Step) => {
      const isEditing = focusedEditing;
      // If editing, use local form state. If viewing, use live step data.
      const data = isEditing && focusedForm ? focusedForm : step;
      
      const style = allCategories[data.category] || BASE_CATEGORIES.frontend;
      const statusConfig = allStatuses[data.status] || BASE_STATUSES.pending;
      const Icon = style.icon;
      const StatusIcon = FULL_ICON_MAP[statusConfig.icon] || Circle;

      const handleStartEdit = () => {
         setFocusedForm(step);
         setFocusedEditing(true);
      };

      const handleCancelEdit = () => {
         setFocusedEditing(false);
         setFocusedForm(null);
      };

      const handleSaveEdit = () => {
         if (focusedForm) {
            const liveStepIndex = project.steps.findIndex(s => s.id === step.id);
            const updatedSteps = [...project.steps];
            // Update the step with form data
            updatedSteps[liveStepIndex] = focusedForm;
            onUpdateProject({ ...project, steps: updatedSteps });
            setFocusedEditing(false);
            setFocusedForm(null);
         }
      };
      
      const updateForm = (field: keyof Step, val: any) => {
          setFocusedForm(prev => prev ? ({...prev, [field]: val}) : null);
      };

      return (
          <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-2">
             {/* Header */}
             <div className="mb-6 flex flex-col gap-4">
                 <div className="flex items-center gap-2 mb-2">
                     <button 
                       onClick={() => setActiveTab('timeline')} 
                       className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                     >
                        <ArrowLeft size={16} /> Back to Timeline
                     </button>
                 </div>
                 
                 <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg relative">
                    {/* Top Controls */}
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                         {!isEditing && (
                            <button 
                                onClick={handleStartEdit}
                                className="p-2 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Edit Task"
                            >
                                <Edit2 size={20} />
                            </button>
                         )}
                         <button 
                            onClick={() => handleToggleTab(step.id)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-900/50"
                            title="Close Tab View (Return to Timeline)"
                        >
                            <Minimize2 size={20} />
                        </button>
                    </div>

                    {isEditing ? (
                        // --- EDIT MODE ---
                        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                             <input 
                                className="w-full text-2xl sm:text-3xl font-bold bg-slate-50 dark:bg-slate-950 border-b border-cyan-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 py-1"
                                value={data.title}
                                onChange={(e) => updateForm('title', e.target.value)}
                                placeholder="Task Title"
                                autoFocus
                             />

                             <div className="flex gap-4">
                                <div className="w-40">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Category</label>
                                    <div className="relative">
                                        <select 
                                            value={data.category}
                                            onChange={(e) => updateForm('category', e.target.value)}
                                            className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500"
                                        >
                                            {Object.keys(allCategories).map(key => <option key={key} value={key}>{key}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="w-40">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Status</label>
                                    <div className="relative">
                                        <select 
                                            value={data.status}
                                            onChange={(e) => updateForm('status', e.target.value)}
                                            className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500"
                                        >
                                            {(Object.values(allStatuses) as StatusConfig[]).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <textarea 
                                className="w-full h-96 bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-slate-700 rounded-lg p-4 text-sm text-slate-800 dark:text-slate-200 focus:border-cyan-500 outline-none font-mono resize-y custom-scrollbar leading-relaxed"
                                value={data.content}
                                onChange={(e) => updateForm('content', e.target.value)}
                                placeholder="Detailed requirements..."
                            />

                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <button 
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs uppercase font-bold"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveEdit}
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs uppercase shadow-lg shadow-cyan-900/20 flex items-center gap-2"
                                >
                                    <Save size={14} aria-hidden="true" />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    ) : (
                        // --- VIEW MODE ---
                        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                             <div className="pr-12">
                                 <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
                                    {data.title || <span className="text-slate-400 italic">Untitled Task</span>}
                                 </h1>
                                 
                                 <div className="flex flex-wrap items-center gap-3">
                                     <span className={`
                                        flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wide
                                        ${style.bg} ${style.border} ${style.text}
                                     `}>
                                        <Icon size={14} />
                                        {data.category}
                                     </span>
                                     
                                     <span className={`
                                        flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wide
                                        bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400
                                     `}>
                                        <StatusIcon size={14} />
                                        {statusConfig.label}
                                     </span>
                                 </div>
                             </div>
                             
                             <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <h3 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-4 tracking-widest">
                                    Details & Requirements
                                </h3>
                                <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap break-words">
                                    {data.content || <span className="text-slate-400 italic">No details provided.</span>}
                                </div>
                             </div>
                        </div>
                    )}
                 </div>
             </div>

             {/* Sub Tasks Section */}
             <div className="mt-8">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <GitBranch size={20} className="text-cyan-600 dark:text-cyan-500" />
                        Sub-Tasks
                    </h3>
                    <button 
                        onClick={() => handleAddSubStep(step.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase shadow-lg shadow-cyan-900/20 transition-all"
                    >
                        <Plus size={16} /> Add Sub-Task
                    </button>
                </div>

                <div className="space-y-2">
                    {(!step.subSteps || step.subSteps.length === 0) && (
                        <div className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/20">
                            <p className="text-slate-400 dark:text-slate-600 text-sm font-mono">No sub-tasks defined.</p>
                        </div>
                    )}
                    {(step.subSteps || []).map((sub, idx) => (
                        <SubStepCard 
                            key={sub.id}
                            step={sub}
                            index={idx}
                            parentId={step.id}
                            categories={allCategories}
                            statuses={allStatuses}
                            onPromote={() => handlePromoteSubStep(step.id, idx)}
                            onDelete={() => handleDeleteSubStep(step.id, idx)}
                            onUpdate={(updatedSub) => handleUpdateSubStep(step.id, idx, updatedSub)}
                            isDragging={draggedSubTask?.parentId === step.id && draggedSubTask?.index === idx}
                            isDragTarget={dragTargetSubTask?.parentId === step.id && dragTargetSubTask?.index === idx}
                            onDragStart={handleSubTaskDragStart}
                            onDragOver={handleSubTaskDragOver}
                            onDrop={handleSubTaskDrop}
                            onDragEnd={handleSubTaskDragEnd}
                        />
                    ))}
                </div>
             </div>
          </div>
      );
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-cyan-500/30">
      <Header 
        title={project.name} 
        isSettingsOpen={isSettingsOpen} 
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        onBack={onBack}
        theme={globalConfig.theme}
        onToggleTheme={() => onUpdateGlobalConfig({...globalConfig, theme: globalConfig.theme === 'dark' ? 'light' : 'dark'})}
        onDownload={handleDownloadProject}
      />
      
      {/* Central Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={globalConfig}
        onUpdateConfig={onUpdateGlobalConfig}
      />
      
      {/* Project Settings Modal */}
      <ProjectSettingsModal 
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        project={project}
        onUpdateProject={onUpdateProject}
        globalConfig={globalConfig}
      />

      {/* --- TABS NAVIGATION --- */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'timeline' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <div className="flex items-center gap-2">
              <Layout size={14} /> Timeline
            </div>
          </button>
          
          {/* Active Step Tabs */}
          {tabSteps.map(step => {
              const style = allCategories[step.category] || BASE_CATEGORIES.frontend;
              const Icon = style.icon;
              return (
                <button
                    key={step.id}
                    onClick={() => setActiveTab(step.id)}
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 max-w-[200px] truncate ${activeTab === step.id ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                    <div className="flex items-center gap-2">
                       <AppWindow size={14} /> {step.title || 'Untitled'}
                    </div>
                </button>
              );
          })}

          {/* Plugin Tabs */}
          {enabledPlugins.map(plugin => (
             <button
                key={plugin.id}
                onClick={() => setActiveTab(plugin.id)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === plugin.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
             >
                <div className="flex items-center gap-2">
                   <Blocks size={14} /> {plugin.name}
                </div>
             </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        
        {/* TAB LOGIC ROUTER */}
        {(() => {
            // 1. Timeline
            if (activeTab === 'timeline') {
                return (
                    <div className="space-y-8">
                         {/* Project Info Card (Mission Brief) */}
                         <div className="mb-16 p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gradient-to-b dark:from-slate-900/80 dark:to-slate-900/40 shadow-2xl dark:backdrop-blur-sm relative group/info">
                              
                              <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                  <ProjectIcon size={24} aria-hidden="true" />
                                </div>
                                <div>
                                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{project.name}</h1>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Project Dashboard</span>
                                </div>
                              </div>

                              <button 
                                onClick={() => setIsProjectSettingsOpen(true)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-cyan-600 dark:text-slate-600 dark:hover:text-cyan-400 transition-colors bg-white/50 dark:bg-black/20 rounded-lg border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800"
                                title="Project Settings (Identity, Categories, Statuses)"
                              >
                                <Settings size={18} aria-hidden="true" />
                              </button>

                              {/* VIEW MODE: Description */}
                              <div className="flex flex-col gap-6">
                                <div>
                                  <h2 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3">Mission Brief</h2>
                                  <p className="text-xl text-slate-700 dark:text-slate-100 leading-relaxed font-light break-words">
                                    {project.description}
                                  </p>
                                </div>
                                
                                <div className="mt-2">
                                  <div className="flex items-center justify-between mb-3">
                                      <h2 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Active Context</h2>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-black/60 rounded-lg p-5 border border-slate-200 dark:border-slate-800/60 font-mono text-xs sm:text-sm text-emerald-600 dark:text-emerald-500/80 whitespace-pre-wrap shadow-inner max-h-40 overflow-y-auto custom-scrollbar break-words">
                                    {project.systemPrompt}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Timeline Steps */}
                            <div>
                              <h2 className="text-2xl font-bold mb-10 flex items-center gap-3 text-slate-900 dark:text-white">
                                <span className="text-cyan-600 dark:text-cyan-500" aria-hidden="true">///</span> Development Timeline
                              </h2>
                              
                              <div className="space-y-0 pb-20">
                                {activeSteps.map((step, index) => {
                                  const isEditing = editingStepId === step.id;
                                  const displayCategory = isEditing && editFormData.category ? editFormData.category : step.category;
                                  const style = allCategories[displayCategory] || allCategories.frontend || BASE_CATEGORIES.frontend;
                                  const Icon = style.icon;
                                  const isLast = index === activeSteps.length - 1;
                                  const isCopied = copiedStepId === step.id;
                                  const isDragging = draggedIndex === index;
                                  const hasHistory = step.history && step.history.length > 0;
                                  const isHistoryExpanded = expandedHistory[step.id];
                                  const iterationCount = (step.history?.length || 0) + 1;
                                  
                                  // Status Resolution
                                  const currentStatusKey = isEditing && editFormData.status ? editFormData.status : step.status;
                                  const statusConfig = allStatuses[currentStatusKey] || allStatuses.pending;
                                  const StatusIcon = FULL_ICON_MAP[statusConfig.icon] || Circle;

                                  // Drag State Visuals
                                  const isDragTargetCard = dragTarget?.index === index && dragTarget.type === 'card';
                                  const isDragTargetGap = dragTarget?.index === index && dragTarget.type === 'gap';

                                  // SHRUNK LOGIC: If completed and NOT expanded and NOT editing
                                  const isCompleted = step.status === 'completed';
                                  const isFailed = step.status === 'failed';
                                  const isShrunk = (isCompleted || isFailed) && !expandedCompletedSteps[step.id] && !isEditing;

                                  return (
                                    <div 
                                      key={step.id} 
                                      draggable={!isEditing}
                                      onDragStart={() => handleDragStart(index)}
                                      onDragEnd={handleDragEnd}
                                      onDragOver={(e) => handleDragOver(e, index)}
                                      onDrop={() => handleDrop(index)}
                                      onDragLeave={() => setDragTarget(null)}
                                      className={`
                                        flex gap-4 sm:gap-8 relative group transition-opacity duration-200
                                        ${isDragging ? 'opacity-30 cursor-grabbing' : 'cursor-default'}
                                        ${isDragTargetGap ? 'mt-8 transition-all' : ''}
                                      `}
                                    >
                                      {/* Reorder Indicator Line */}
                                      {isDragTargetGap && (
                                        <div className="absolute -top-6 left-0 right-0 h-1 bg-cyan-500/50 rounded-full animate-pulse z-20 pointer-events-none"></div>
                                      )}

                                      {/* Timeline Graphics */}
                                      <div className="flex flex-col items-center pt-1 relative h-full">
                                        {!isEditing && (
                                          <div 
                                            className="absolute -left-6 sm:-left-8 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-700 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                            title="Drag to reorder or nest"
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`Drag handle for step ${index + 1}`}
                                          >
                                            <GripVertical size={20} aria-hidden="true" />
                                          </div>
                                        )}
                                        <div className={`
                                          relative z-10 flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-full 
                                          bg-white dark:bg-slate-900 border-2 ${step.status === 'failed' ? 'border-red-500 text-red-500' : (isShrunk ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400' : style.border)} 
                                          flex items-center justify-center shadow-lg dark:shadow-[0_0_15px_rgba(0,0,0,0.5)]
                                          ${step.status === 'failed' ? 'text-red-500' : (isShrunk ? 'text-emerald-600' : 'text-slate-400')} 
                                          font-mono font-bold text-xs sm:text-base
                                          transition-all duration-300
                                          ${isEditing ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-black ring-cyan-500' : ''}
                                          ${isDragTargetCard ? 'scale-110 ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-200' : ''}
                                        `}>
                                          {isDragTargetCard ? <CornerDownRight size={20} aria-hidden="true" /> : (step.status === 'failed' ? <AlertOctagon size={16} aria-hidden="true" /> : (isCompleted ? <Check size={18} aria-hidden="true" /> : index + 1))}
                                        </div>
                                        {/* Vertical Timeline Line - Extended if history exists */}
                                        {!isLast && (
                                          <div className={`w-0.5 flex-grow ${isShrunk ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'} transition-colors my-2`} />
                                        )}
                                      </div>

                                      {/* Card Content Wrapper */}
                                      <div className="flex-1 mb-12 min-w-0">
                                        
                                        {/* MAIN CARD */}
                                        <div className={`
                                          relative rounded-xl border transition-all duration-300
                                          ${isShrunk 
                                            ? (isFailed ? 'bg-white dark:bg-slate-950/30 border-red-200 dark:border-red-900/30 hover:border-red-400/30' : 'bg-white dark:bg-slate-950/30 border-emerald-200 dark:border-emerald-900/30 hover:border-emerald-400/30')
                                            : (step.status === 'failed' ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/10' : `${style.border} bg-white dark:bg-slate-900/40`)
                                          } 
                                          ${isEditing ? 'bg-white dark:bg-slate-900/90 shadow-2xl ring-1 ring-cyan-500/50' : (isShrunk ? 'shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:shadow-lg')}
                                          ${isDragTargetCard ? 'border-indigo-500 ring-2 ring-indigo-500/50' : ''}
                                          ${isShrunk ? 'p-3 sm:p-4' : 'p-6 sm:p-7'}
                                        `}>

                                          {/* Iteration Badge */}
                                          {iterationCount > 1 && !isEditing && !isShrunk && (
                                            <div className="absolute -top-3 right-6 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-mono shadow-sm">
                                              <GitBranch size={10} aria-hidden="true" />
                                              <span>Rev.{iterationCount}</span>
                                            </div>
                                          )}

                                          {isEditing ? (
                                            // --- EDIT MODE ---
                                            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                                              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                                                <div className="flex flex-col flex-1 mr-4">
                                                    <label htmlFor={`step-title-${step.id}`} className="text-[10px] uppercase tracking-widest text-cyan-600 dark:text-cyan-500 font-bold mb-1">Editing Task</label>
                                                    <input 
                                                      id={`step-title-${step.id}`}
                                                      className="bg-transparent text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-b focus:border-cyan-500 placeholder-slate-400 dark:placeholder-slate-600 w-full"
                                                      value={editFormData.title}
                                                      onChange={(e) => updateField('title', e.target.value)}
                                                      placeholder="Step Title"
                                                      autoFocus
                                                    />
                                                </div>
                                                <div className="flex gap-3">
                                                  <div className="flex flex-col">
                                                    <label htmlFor={`step-cat-${step.id}`} className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Category</label>
                                                    <select 
                                                        id={`step-cat-${step.id}`}
                                                        value={editFormData.category}
                                                        onChange={(e) => updateField('category', e.target.value)}
                                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 rounded p-1.5 focus:border-cyan-500 outline-none"
                                                      >
                                                        {Object.keys(allCategories).map(key => (
                                                          <option key={key} value={key}>{key}</option>
                                                        ))}
                                                      </select>
                                                  </div>
                                                  <div className="flex flex-col">
                                                    <label htmlFor={`step-stat-${step.id}`} className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Status</label>
                                                    <select 
                                                        id={`step-stat-${step.id}`}
                                                        value={editFormData.status}
                                                        onChange={(e) => updateField('status', e.target.value)}
                                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 rounded p-1.5 focus:border-cyan-500 outline-none"
                                                      >
                                                        {(Object.values(allStatuses) as StatusConfig[]).map(s => (
                                                          <option key={s.key} value={s.key}>{s.label}</option>
                                                        ))}
                                                      </select>
                                                  </div>
                                                </div>
                                              </div>

                                              <div>
                                                <label htmlFor={`step-details-${step.id}`} className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 block">Details & Requirements</label>
                                                <textarea 
                                                    id={`step-details-${step.id}`}
                                                    className="w-full h-64 bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-slate-700 rounded-lg p-4 text-sm text-slate-800 dark:text-slate-200 focus:border-cyan-500 outline-none font-mono resize-y custom-scrollbar"
                                                    value={editFormData.content}
                                                    onChange={(e) => updateField('content', e.target.value)}
                                                    placeholder="Describe the step details..."
                                                />
                                              </div>

                                              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                                                <button 
                                                  onClick={handleCancelEdit}
                                                  className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs uppercase font-bold"
                                                >
                                                  Cancel
                                                </button>
                                                <button 
                                                  onClick={handleSaveStep}
                                                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs uppercase shadow-lg shadow-cyan-900/20 flex items-center gap-2"
                                                >
                                                  <Save size={14} aria-hidden="true" />
                                                  Save Changes
                                                </button>
                                              </div>
                                            </div>
                                          ) : isShrunk ? (
                                            // --- COMPACT VIEW (Shrunk) ---
                                            <div 
                                              className="flex items-center justify-between cursor-pointer group/shrunk"
                                              onClick={() => toggleCompletedStep(step.id)}
                                              role="button"
                                              tabIndex={0}
                                              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleCompletedStep(step.id)}
                                              aria-expanded={false}
                                            >
                                              <div className="flex items-center gap-4">
                                                  <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-900 border ${isFailed ? 'border-red-200 dark:border-red-900 text-red-600' : 'border-emerald-200 dark:border-emerald-900 text-emerald-600'}`}>
                                                    <Icon size={16} aria-hidden="true" />
                                                  </div>
                                                  <div>
                                                    <h3 className={`text-sm font-bold text-slate-400 dark:text-slate-400 transition-colors line-through ${isFailed ? 'decoration-red-500 dark:decoration-red-500 group-hover/shrunk:text-red-500 dark:group-hover/shrunk:text-red-400' : 'decoration-slate-300 dark:decoration-slate-700 group-hover/shrunk:text-emerald-500 dark:group-hover/shrunk:text-emerald-400'}`}>
                                                        {step.title}
                                                    </h3>
                                                  </div>
                                                  <div className={`hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${isFailed ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/30' : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30'}`}>
                                                    <StatusIcon size={10} aria-hidden="true" />
                                                    <span>{statusConfig.label}</span>
                                                  </div>
                                              </div>
                                              <div className={`text-slate-400 dark:text-slate-700 ${isFailed ? 'group-hover/shrunk:text-red-500' : 'group-hover/shrunk:text-emerald-500'} transition-colors`} title="Expand Task">
                                                  <Maximize2 size={16} aria-hidden="true" />
                                              </div>
                                            </div>
                                          ) : (
                                            // --- VIEW MODE (Full) ---
                                            <div className="flex flex-col h-full">
                                              <div className="flex items-start justify-between mb-4">
                                                <div className="flex flex-col">
                                                  <div className="flex items-center gap-3 mb-1 group/title">
                                                    <h3 
                                                      className={`text-lg font-bold ${step.status === 'failed' ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'} cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors`}
                                                      onClick={() => handleEditClick(step)}
                                                      title="Click to Edit"
                                                    >
                                                      {step.title || <span className="text-slate-400 italic">Untitled Task</span>}
                                                    </h3>
                                                    <button 
                                                      onClick={() => handleEditClick(step)}
                                                      className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-opacity"
                                                      aria-label="Edit title"
                                                    >
                                                      <Edit2 size={14} />
                                                    </button>
                                                    <span className={`
                                                      text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border
                                                      ${style.bg} ${style.text} ${style.badgeBorder}
                                                    `}>
                                                      {step.category}
                                                    </span>
                                                  </div>
                                                  <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400`}>
                                                    <StatusIcon size={14} aria-hidden="true" />
                                                    {statusConfig.label}
                                                  </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                  {(isCompleted || isFailed) && (
                                                      <button 
                                                        onClick={() => toggleCompletedStep(step.id)}
                                                        className={`p-2 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900 rounded transition-colors ${isFailed ? 'hover:text-red-500 dark:hover:text-red-400' : 'hover:text-emerald-500 dark:hover:text-emerald-400'}`}
                                                        title={`Minimize (${isFailed ? 'Failed' : 'Completed'})`}
                                                        aria-label="Minimize task"
                                                      >
                                                        <Minimize2 size={16} aria-hidden="true" />
                                                      </button>
                                                  )}
                                                  <div className={`p-2 rounded-lg bg-white dark:bg-slate-950 border ${style.border} ${style.text}`}>
                                                    <Icon size={20} aria-hidden="true" />
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="flex-grow">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-light whitespace-pre-wrap font-mono break-words">
                                                  {step.content}
                                                </p>
                                              </div>

                                              {/* Sub Steps Render */}
                                              {step.subSteps && step.subSteps.length > 0 && (
                                                <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                                                  <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-2">
                                                    <GitBranch size={12} aria-hidden="true" /> Sub-Tasks
                                                  </h4>
                                                  <div className="space-y-1">
                                                    {step.subSteps.map((sub, subIdx) => (
                                                      <SubStepCard 
                                                        key={sub.id} 
                                                        step={sub}
                                                        index={subIdx}
                                                        parentId={step.id} 
                                                        categories={allCategories}
                                                        statuses={allStatuses}
                                                        onPromote={() => handlePromoteSubStep(step.id, subIdx)}
                                                        onDelete={() => handleDeleteSubStep(step.id, subIdx)}
                                                        onUpdate={(updatedSub) => handleUpdateSubStep(step.id, subIdx, updatedSub)}
                                                        // Drag Props
                                                        isDragging={draggedSubTask?.parentId === step.id && draggedSubTask?.index === subIdx}
                                                        isDragTarget={dragTargetSubTask?.parentId === step.id && dragTargetSubTask?.index === subIdx}
                                                        onDragStart={handleSubTaskDragStart}
                                                        onDragOver={handleSubTaskDragOver}
                                                        onDrop={handleSubTaskDrop}
                                                        onDragEnd={handleSubTaskDragEnd}
                                                      />
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/50">
                                                
                                                {/* NOTE TOGGLE & POPOVER */}
                                                <div className="relative">
                                                    <button 
                                                        onClick={() => setActiveNoteId(activeNoteId === step.id ? null : step.id)}
                                                        className={`p-2 rounded-lg transition-colors ${step.notes ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                        title="Quick Note"
                                                    >
                                                        <StickyNote size={18} />
                                                        {step.notes && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
                                                    </button>

                                                    {activeNoteId === step.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setActiveNoteId(null)}></div>
                                                            <div className="absolute bottom-full left-0 mb-2 w-64 sm:w-72 bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-3 animate-in fade-in zoom-in-95 duration-200">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-500 tracking-wider">Quick Note</span>
                                                                </div>
                                                                <textarea 
                                                                    className="w-full h-32 bg-transparent border-0 focus:ring-0 p-0 text-sm text-slate-700 dark:text-slate-300 font-mono resize-none leading-relaxed placeholder-slate-400 dark:placeholder-slate-600"
                                                                    placeholder="Add a note..."
                                                                    value={step.notes || ''}
                                                                    onChange={(e) => handleUpdateNote(step.id, e.target.value)}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* ACTION BUTTONS */}
                                                <div className="flex items-center gap-3">
                                                  <button 
                                                    onClick={() => handleSmartCopy(step)}
                                                    className={`
                                                      flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                                                      ${isCopied 
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-300 dark:hover:border-cyan-500/50'}
                                                    `}
                                                    title="Smart Copy with Context"
                                                  >
                                                    {isCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                                                    <span className="text-xs font-bold uppercase hidden sm:inline">
                                                      {isCopied ? 'Copied' : 'Copy'}
                                                    </span>
                                                  </button>

                                                  <button 
                                                    onClick={() => handleToggleTab(step.id)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent ${step.isTab ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'}`}
                                                    title={step.isTab ? "Remove from Tabs" : "Open in Tab"}
                                                  >
                                                     <AppWindow size={16} aria-hidden="true" />
                                                     <span className="text-xs font-bold uppercase hidden sm:inline">
                                                        {step.isTab ? 'Tab Active' : 'Tab'}
                                                     </span>
                                                  </button>

                                                  <button 
                                                    onClick={() => handleDuplicateStep(step.id)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-900/30"
                                                    title="Duplicate Task"
                                                  >
                                                    <Files size={16} aria-hidden="true" />
                                                    <span className="text-xs font-bold uppercase hidden sm:inline">Duplicate</span>
                                                  </button>

                                                  <button 
                                                    onClick={() => handleAddSubStep(step.id)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-cyan-200 dark:hover:border-cyan-900/30"
                                                    title="Add Sub-Task"
                                                  >
                                                    <GitBranch size={16} aria-hidden="true" />
                                                    <span className="text-xs font-bold uppercase hidden sm:inline">Sub-Task</span>
                                                  </button>

                                                  <button 
                                                    onClick={() => handleEditClick(step)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-cyan-600 transition-all shadow-sm"
                                                  >
                                                    <Edit2 size={16} aria-hidden="true" />
                                                    <span className="text-xs font-bold uppercase hidden sm:inline">Edit</span>
                                                  </button>

                                                  <button 
                                                    onClick={() => handleDeleteStep(step.id)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/30"
                                                    title="Archive Step"
                                                    aria-label="Archive Step"
                                                  >
                                                    <Archive size={16} aria-hidden="true" />
                                                    <span className="text-xs font-bold uppercase hidden sm:inline">Archive</span>
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* HISTORY BRANCHES */}
                                        {hasHistory && !isShrunk && (
                                          <div className="mt-2">
                                            <button 
                                              onClick={() => toggleHistory(step.id)}
                                              className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 ml-8 mb-2 transition-colors"
                                              aria-expanded={isHistoryExpanded}
                                            >
                                              {isHistoryExpanded ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
                                              {isHistoryExpanded ? 'Hide History' : `Show ${step.history!.length} Archived Attempts`}
                                            </button>
                                            
                                            {isHistoryExpanded && (
                                              <div className="flex flex-col gap-1 ml-2 animate-in slide-in-from-top-2">
                                                {step.history!.map((ver, hIdx) => (
                                                  <HistoryItem key={ver.id} version={ver} index={hIdx} />
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* ARCHIVED TASKS SECTION */}
                              <div className="mb-24 border-t border-slate-200 dark:border-slate-800 pt-8">
                                <button 
                                  onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                                  className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                  aria-expanded={isArchiveOpen}
                                >
                                  {isArchiveOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                                  Decommissioned Tasks (Archive)
                                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs py-0.5 px-2 rounded-full">{archivedSteps.length}</span>
                                </button>

                                {isArchiveOpen && (
                                    <div className="mt-6 space-y-3 animate-in slide-in-from-top-2">
                                      {archivedSteps.length === 0 ? (
                                          <p className="text-xs text-slate-500 dark:text-slate-600 font-mono pl-6">No archived tasks found.</p>
                                      ) : (
                                          archivedSteps.map(step => (
                                            <div key={step.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-white dark:hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                      <Archive size={14} aria-hidden="true" />
                                                  </div>
                                                  <div>
                                                      <h4 className="text-sm font-bold text-slate-400 dark:text-slate-400 line-through decoration-slate-400 dark:decoration-slate-600">{step.title}</h4>
                                                      <p className="text-[10px] text-slate-500 dark:text-slate-600 font-mono">
                                                        Archived: {step.archivedAt ? new Date(step.archivedAt).toLocaleString() : 'Unknown'}
                                                      </p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <button 
                                                    onClick={() => handleRestoreStep(step.id)}
                                                    className="p-2 text-emerald-600 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                                    title="Restore Task"
                                                    aria-label="Restore task"
                                                  >
                                                      <RefreshCw size={16} aria-hidden="true" />
                                                  </button>
                                                  <button 
                                                    onClick={() => handlePermanentDeleteStep(step.id)}
                                                    className="p-2 text-rose-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                                    title="Delete Permanently"
                                                    aria-label="Delete task permanently"
                                                  >
                                                      <Trash2 size={16} aria-hidden="true" />
                                                  </button>
                                                </div>
                                            </div>
                                          ))
                                      )}
                                    </div>
                                )}
                              </div>

                              {/* ADD STEP BUTTON */}
                              <div className="fixed bottom-8 right-8 z-30">
                                <button 
                                  onClick={handleAddStep}
                                  className="group flex items-center justify-center w-14 h-14 bg-cyan-600 text-white rounded-full shadow-xl shadow-cyan-900/30 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:bg-cyan-500 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50"
                                  title="Add New Task"
                                  aria-label="Add new task"
                                >
                                  <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                    </div>
                );
            }
            
            // 2. Plugins
            const activePlugin = enabledPlugins.find(p => p.id === activeTab);
            if (activePlugin) {
                 return (
                   <div key={activePlugin.id} className="animate-in fade-in duration-300">
                      <PluginView 
                        config={activePlugin}
                        project={project}
                        onSave={onUpdateProject}
                        theme={globalConfig.theme}
                      />
                   </div>
                 );
            }

            // 3. Step Tab (Focused View)
            const activeStep = activeSteps.find(s => s.id === activeTab);
            if (activeStep) {
                return renderFocusedStep(activeStep);
            }

            return null;
        })()}
      </main>

      {/* Local Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal 
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          isDanger={confirmModal.isDanger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};

export default ProjectDetail;