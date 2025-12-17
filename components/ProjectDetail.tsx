
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
  RefreshCw, FileWarning, StickyNote, Files, AppWindow, Blocks, ArrowLeft, Eye, Settings, Calendar
} from 'lucide-react';

// --- Utility: Robust Copy to Clipboard ---
const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard API failed, trying fallback...", err);
  }
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

const toLocalISOString = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

interface CategoryStyle {
  color: string;
  icon: LucideIcon;
  bg: string;
  border: string;
  text: string;
  badgeBorder: string;
}

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

const BASE_STATUSES: Record<string, StatusConfig> = {
  'pending': { key: 'pending', label: 'Pending', color: 'slate', icon: 'Circle' },
  'in-progress': { key: 'in-progress', label: 'In Progress', color: 'amber', icon: 'Clock' },
  'completed': { key: 'completed', label: 'Completed', color: 'emerald', icon: 'CheckCircle2' },
  'failed': { key: 'failed', label: 'Failed', color: 'red', icon: 'AlertOctagon' }
};

const HistoryItem: React.FC<{ version: StepVersion; index: number }> = ({ version, index }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="relative pl-6 pb-2">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-800"></div>
      <div className="absolute left-0 top-4 w-4 h-px bg-slate-300 dark:bg-slate-800"></div>
      <div 
        onClick={() => setExpanded(!expanded)}
        className={`group rounded-md border cursor-pointer transition-all duration-200 relative overflow-hidden ${expanded ? 'bg-white dark:bg-slate-900 border-rose-500/40 shadow-lg' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800/60'}`}
        role="button"
        tabIndex={0}
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
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                   <span>{new Date(version.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-slate-600">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
          <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden min-h-0">
               {version.failureReason && (
                  <div className="mb-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded p-2">
                    <p className="text-xs text-rose-800 dark:text-rose-200 font-sans italic">"{version.failureReason}"</p>
                  </div>
               )}
               <div className="bg-slate-50 dark:bg-black/30 rounded p-2 border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-700 dark:text-slate-400 font-mono whitespace-pre-wrap leading-relaxed break-words">{version.content}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SubStepCard: React.FC<{ 
  step: Step; 
  index: number;
  parentId: string;
  categories: Record<string, CategoryStyle>;
  statuses: Record<string, StatusConfig>;
  onPromote: () => void;
  onDelete: () => void;
  onUpdate: (step: Step) => void;
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
  useEffect(() => { setFormData(step); }, [step]);
  useEffect(() => { if (!step.title && !step.content) setIsEditing(true); }, []);
  const style = categories[step.category] || categories.frontend || BASE_CATEGORIES.frontend;
  const Icon = style.icon;
  const statusConfig = statuses[step.status] || statuses.pending;
  const StatusIcon = FULL_ICON_MAP[statusConfig.icon] || Circle;
  const isCompleted = step.status === 'completed';
  const isFailed = step.status === 'failed';
  const showCompact = (isCompleted || isFailed) && !expanded && !isEditing;
  const updateField = (field: keyof Step, value: any) => { setFormData(prev => ({ ...prev, [field]: value })); };
  const handleSave = () => {
    const finalData = { ...formData };
    if (!finalData.title.trim()) finalData.title = "Untitled Sub-Task";
    if (!finalData.createdAt) finalData.createdAt = Date.now();
    onUpdate(finalData);
    setIsEditing(false);
  };
  const handleCopy = async () => {
    const success = await copyToClipboard(step.content);
    if (success) { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }
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
      {isDragTarget && <div className="absolute top-0 left-8 right-0 h-0.5 bg-cyan-500 z-20 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>}
      <div className="absolute left-0 top-0 h-full w-px bg-slate-300 dark:bg-slate-800 transition-colors"></div>
      <div className="absolute left-0 top-6 w-6 h-px bg-slate-300 dark:bg-slate-800 transition-colors"></div>
      <div className={`border rounded-lg bg-white dark:bg-slate-900/60 transition-all duration-200 ${expanded || isEditing ? 'border-slate-300 dark:border-slate-700 shadow-xl' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'} ${isEditing ? 'ring-1 ring-cyan-500/30' : ''}`}>
        {isEditing ? (
          <div className="p-3 animate-in fade-in duration-200">
             <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                   <div className="flex-1">
                      <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Sub-Task Title</label>
                      <input 
                        value={formData.title}
                        onChange={e => updateField('title', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:border-cyan-500 outline-none font-bold"
                        autoFocus
                      />
                   </div>
                   <div className="flex gap-2">
                     <div className="w-24">
                        <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Cat.</label>
                        <select 
                          value={formData.category}
                          onChange={e => updateField('category', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-[10px] uppercase focus:border-cyan-500 outline-none"
                        >
                          {Object.keys(categories).map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                     </div>
                     <div className="w-24">
                        <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Status</label>
                        <select 
                          value={formData.status}
                          onChange={e => updateField('status', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-[10px] uppercase focus:border-cyan-500 outline-none"
                        >
                          {(Object.values(statuses) as StatusConfig[]).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                     </div>
                   </div>
                </div>
                <textarea 
                  value={formData.content}
                  onChange={e => updateField('content', e.target.value)}
                  className="w-full h-20 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-2 text-xs font-mono"
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                   <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold uppercase text-slate-500 px-2 py-1">Cancel</button>
                   <button onClick={handleSave} className="text-[10px] font-bold uppercase bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded">Save</button>
                </div>
             </div>
          </div>
        ) : showCompact ? (
          <div className="flex items-center justify-between p-3 gap-2 cursor-pointer" onClick={() => setExpanded(true)}>
             <div className="flex items-center gap-3">
                 <div className="flex-shrink-0 text-slate-300"><GripVertical size={14} /></div>
                 <div className={`p-1 rounded ${isFailed ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {isFailed ? <AlertOctagon size={12} /> : <Check size={12} />}
                 </div>
                 <span className="text-sm font-bold text-slate-400 line-through truncate">{step.title}</span>
             </div>
             <Maximize2 size={14} className="text-slate-300" />
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 gap-2">
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 p-1"><GripVertical size={14} /></div>
            <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-slate-100 border text-[10px] font-mono font-bold text-slate-500">#{index + 1}</div>
                <div className={`flex-shrink-0 p-1.5 rounded ${style.bg} ${style.text}`}><Icon size={14} /></div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold truncate text-slate-700 dark:text-slate-300">{step.title}</h4>
                </div>
            </div>
             <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={() => onPromote()} className="p-1.5 text-slate-400 hover:text-cyan-600 rounded"><MoveUp size={14} /></button>
                <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-400 hover:text-cyan-600 rounded">{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
              </div>
           </div>
        )}
        {!isEditing && expanded && (
            <div className="px-3 pb-3 pt-0 animate-in fade-in slide-in-from-top-1 border-t border-slate-100">
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-light leading-relaxed mb-3 mt-3 pl-1">{step.content}</p>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <button onClick={handleCopy} className="text-[10px] text-slate-500 hover:text-cyan-600 uppercase font-bold px-2 py-1">{isCopied ? 'Copied' : 'Copy'}</button>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(true)} className="text-[10px] text-slate-500 hover:text-cyan-600 uppercase font-bold">Edit</button>
                        <button onClick={() => onDelete()} className="text-[10px] text-rose-700 uppercase font-bold">Delete</button>
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
  globalConfig: GlobalConfig;
  onUpdateGlobalConfig: (config: GlobalConfig) => void;
  newPluginsCount?: number;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ 
  project, 
  onUpdateProject, 
  onDeleteProject, 
  onBack,
  globalConfig,
  onUpdateGlobalConfig,
  newPluginsCount = 0
}) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Step>>({});
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [focusedEditing, setFocusedEditing] = useState(false);
  const [focusedForm, setFocusedForm] = useState<Step | null>(null);
  const [confirmModal, setConfirmModal] = useState<any | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [expandedCompletedSteps, setExpandedCompletedSteps] = useState<Record<string, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<any | null>(null);
  const [draggedSubTask, setDraggedSubTask] = useState<any | null>(null);
  const [dragTargetSubTask, setDragTargetSubTask] = useState<any | null>(null);

  useEffect(() => { setFocusedEditing(false); setFocusedForm(null); }, [activeTab]);

  const allCategories = useMemo(() => {
    const cats = { ...BASE_CATEGORIES };
    if (project.categories) project.categories.forEach(c => { cats[c.key] = createCategoryStyle(c.color, Tag); });
    return cats;
  }, [project.categories]);

  const allStatuses = useMemo(() => {
    const statuses: Record<string, StatusConfig> = { ...BASE_STATUSES };
    if (project.statuses) project.statuses.forEach(s => { statuses[s.key] = s; });
    return statuses;
  }, [project.statuses]);

  const handleEditClick = (step: Step) => {
    setEditingStepId(step.id);
    setEditFormData({ ...step });
    if (expandedCompletedSteps[step.id] === false) toggleCompletedStep(step.id);
  };

  const handleSaveStep = () => {
    if (!editingStepId) return;
    const finalData = { ...editFormData };
    if (!finalData.title?.trim()) finalData.title = "Untitled Task";
    if (!finalData.createdAt) finalData.createdAt = Date.now();
    onUpdateProject({ ...project, steps: project.steps.map(s => s.id === editingStepId ? { ...s, ...finalData } as Step : s) });
    setEditingStepId(null);
    setEditFormData({});
  };

  const handleAddStep = () => {
    const newId = `step_${Date.now()}`;
    const newStep: Step = { id: newId, title: '', category: 'frontend', status: 'pending', content: '', history: [], subSteps: [], createdAt: Date.now() };
    onUpdateProject({ ...project, steps: [...project.steps, newStep] });
    setEditingStepId(newId);
    setEditFormData(newStep);
  };

  const handleDeleteStep = (stepId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Archive Task?",
      message: "Move to archive?",
      isDanger: false,
      onConfirm: () => {
        onUpdateProject({ ...project, steps: project.steps.map(s => s.id === stepId ? { ...s, archivedAt: Date.now() } : s) });
        if (activeTab === stepId) setActiveTab('timeline');
        setConfirmModal(null);
      }
    });
  };

  const handleToggleTab = (stepId: string) => {
     const updatedSteps = project.steps.map(s => s.id === stepId ? { ...s, isTab: !s.isTab } : s);
     onUpdateProject({ ...project, steps: updatedSteps });
     if (!project.steps.find(s => s.id === stepId)?.isTab) setActiveTab(stepId);
  };

  const handleAddSubStep = (parentId: string) => {
    const updatedSteps = project.steps.map(s => {
      if (s.id === parentId) {
        const newSub: Step = { id: `sub_${Date.now()}`, title: '', category: s.category, status: 'pending', content: '', subSteps: [], createdAt: Date.now() };
        return { ...s, subSteps: [...(s.subSteps || []), newSub] };
      }
      return s;
    });
    onUpdateProject({ ...project, steps: updatedSteps });
  };

  const handlePromoteSubStep = (parentId: string, subStepIndex: number) => {
    const updatedSteps = [...project.steps];
    const pIdx = updatedSteps.findIndex(s => s.id === parentId);
    if (pIdx === -1) return;
    const [promoted] = updatedSteps[pIdx].subSteps!.splice(subStepIndex, 1);
    updatedSteps.splice(pIdx + 1, 0, promoted);
    onUpdateProject({ ...project, steps: updatedSteps });
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragEnd = () => { setDraggedIndex(null); setDragTarget(null); };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (y < 20 || y > rect.height - 20) setDragTarget({ index, type: 'gap' });
    else setDragTarget({ index, type: 'card' });
  };
  const handleDrop = (dropIndex: number) => {
    if (draggedIndex !== null) {
      const updated = [...project.steps];
      if (dragTarget?.type === 'card') {
        const [moved] = updated.splice(draggedIndex, 1);
        const target = updated[draggedIndex < dropIndex ? dropIndex - 1 : dropIndex];
        if (!target.subSteps) target.subSteps = [];
        target.subSteps.push(moved);
      } else {
        const [moved] = updated.splice(draggedIndex, 1);
        updated.splice(dropIndex, 0, moved);
      }
      onUpdateProject({ ...project, steps: updated });
    }
    handleDragEnd();
  };

  const toggleCompletedStep = (id: string) => setExpandedCompletedSteps(prev => ({ ...prev, [id]: !prev[id] }));
  const updateField = (f: keyof Step, v: any) => setEditFormData(p => ({ ...p, [f]: v }));

  const activeSteps = project.steps.filter(s => !s.archivedAt);
  const archivedSteps = project.steps.filter(s => s.archivedAt);
  const tabSteps = activeSteps.filter(s => s.isTab);
  const enabledToolPlugins = (globalConfig.plugins || []).filter(p => p.enabled && p.manifest.type !== 'theme');

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-slate-200 font-sans">
      <Header 
        title={project.name} 
        isSettingsOpen={isSettingsOpen} 
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        onBack={onBack}
        theme={globalConfig.theme}
        onToggleTheme={() => onUpdateGlobalConfig({...globalConfig, theme: globalConfig.theme === 'dark' ? 'light' : 'dark'})}
        newPluginsCount={newPluginsCount}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={globalConfig} onUpdateConfig={onUpdateGlobalConfig} />
      <ProjectSettingsModal isOpen={isProjectSettingsOpen} onClose={() => setIsProjectSettingsOpen(false)} project={project} onUpdateProject={onUpdateProject} globalConfig={globalConfig} />

      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
          <button onClick={() => setActiveTab('timeline')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 ${activeTab === 'timeline' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-slate-500'}`}>
            <div className="flex items-center gap-2"><Layout size={14} /> Timeline</div>
          </button>
          {tabSteps.map(step => (
            <button key={step.id} onClick={() => setActiveTab(step.id)} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 ${activeTab === step.id ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}>
              <div className="flex items-center gap-2"><AppWindow size={14} /> {step.title || 'Task'}</div>
            </button>
          ))}
          {enabledToolPlugins.map(plugin => (
             <button key={plugin.id} onClick={() => setActiveTab(plugin.id)} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 ${activeTab === plugin.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>
                <div className="flex items-center gap-2"><Blocks size={14} /> {plugin.manifest?.name}</div>
             </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        {activeTab === 'timeline' ? (
          <div className="space-y-8">
               <div className="mb-16 p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl relative group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-lg bg-cyan-50 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                        {React.createElement(FULL_ICON_MAP[project.icon || 'Terminal'] || Terminal, { size: 24 })}
                      </div>
                      <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1></div>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => onDeleteProject(project.id)} className="p-2 text-slate-400 hover:text-rose-600"><Archive size={18} /></button>
                      <button onClick={() => setIsProjectSettingsOpen(true)} className="p-2 text-slate-400 hover:text-cyan-600"><Settings size={18} /></button>
                    </div>
                    <p className="text-xl text-slate-700 dark:text-slate-100 leading-relaxed font-light">{project.description}</p>
                </div>
                <div className="space-y-0">
                  {activeSteps.map((step, index) => {
                    const isEditing = editingStepId === step.id;
                    const style = allCategories[isEditing ? editFormData.category! : step.category] || BASE_CATEGORIES.frontend;
                    const statusConfig = allStatuses[isEditing ? editFormData.status! : step.status] || BASE_STATUSES.pending;
                    const isShrunk = (step.status === 'completed' || step.status === 'failed') && !expandedCompletedSteps[step.id] && !isEditing;
                    return (
                      <div key={step.id} className="flex gap-4 sm:gap-8 relative group" draggable={!isEditing} onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)} onDrop={() => handleDrop(index)}>
                        {dragTarget?.index === index && dragTarget.type === 'gap' && <div className="absolute -top-1 left-0 right-0 h-1 bg-cyan-500 animate-pulse"></div>}
                        <div className="flex flex-col items-center pt-1 relative h-full">
                          <div className={`relative z-10 w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-900 border-2 flex items-center justify-center font-bold ${isShrunk ? 'border-emerald-200' : style.border}`}>
                            {step.status === 'completed' ? <Check size={18} /> : index + 1}
                          </div>
                          {index !== activeSteps.length - 1 && <div className="w-0.5 flex-grow bg-slate-200 my-2" />}
                        </div>
                        <div className={`flex-1 mb-12 min-w-0 ${isEditing ? 'bg-white dark:bg-slate-800 p-6 rounded-xl border border-cyan-500' : ''}`}>
                          {isEditing ? (
                            <div className="flex flex-col gap-4">
                              <input className="text-lg font-bold bg-transparent border-b border-slate-200" value={editFormData.title} onChange={e => updateField('title', e.target.value)} />
                              <textarea className="w-full h-32 bg-slate-50 dark:bg-slate-950 p-4 font-mono text-sm" value={editFormData.content} onChange={e => updateField('content', e.target.value)} />
                              <div className="flex justify-end gap-3"><button onClick={() => setEditingStepId(null)}>Cancel</button><button onClick={handleSaveStep} className="bg-cyan-600 text-white px-4 py-2 rounded">Save</button></div>
                            </div>
                          ) : isShrunk ? (
                            <div className="p-3 border rounded-lg bg-white dark:bg-slate-900 cursor-pointer flex justify-between" onClick={() => toggleCompletedStep(step.id)}>
                              <div className="flex items-center gap-3"><h3 className="text-sm font-bold text-slate-400 line-through">{step.title}</h3></div>
                              <Maximize2 size={16} className="text-slate-400" />
                            </div>
                          ) : (
                            <div className={`p-6 border rounded-xl bg-white dark:bg-slate-900 group-hover:shadow-lg transition-all ${style.border}`}>
                               <div className="flex justify-between items-start mb-4">
                                 <div><h3 className="text-lg font-bold cursor-pointer" onClick={() => handleEditClick(step)}>{step.title}</h3></div>
                                 <div className={`p-2 rounded bg-slate-50 dark:bg-slate-950 ${style.text}`}>{React.createElement(style.icon, { size: 20 })}</div>
                               </div>
                               <p className="text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap">{step.content}</p>
                               <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                  <button onClick={() => handleToggleTab(step.id)} className="p-2 text-slate-400"><AppWindow size={16} /></button>
                                  <button onClick={() => handleAddSubStep(step.id)} className="p-2 text-slate-400"><GitBranch size={16} /></button>
                                  <button onClick={() => handleEditClick(step)} className="p-2 text-slate-400"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDeleteStep(step.id)} className="p-2 text-slate-400"><Archive size={16} /></button>
                               </div>
                               {step.subSteps && step.subSteps.length > 0 && (
                                  <div className="mt-4 space-y-2">
                                    {step.subSteps.map((sub, sidx) => <SubStepCard key={sub.id} step={sub} index={sidx} parentId={step.id} categories={allCategories} statuses={allStatuses} onPromote={() => handlePromoteSubStep(step.id, sidx)} onDelete={() => {}} onUpdate={() => {}} isDragging={false} isDragTarget={false} onDragStart={() => {}} onDragOver={() => {}} onDrop={() => {}} onDragEnd={() => {}} />)}
                                  </div>
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="fixed bottom-8 right-8 z-30"><button onClick={handleAddStep} className="w-14 h-14 bg-cyan-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"><Plus size={28} /></button></div>
                </div>
          </div>
        ) : enabledToolPlugins.find(p => p.id === activeTab) ? (
          <PluginView config={enabledToolPlugins.find(p => p.id === activeTab)!} project={project} onSave={onUpdateProject} theme={globalConfig.theme} />
        ) : project.steps.find(s => s.id === activeTab) ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border shadow-xl">
             <h1 className="text-3xl font-bold mb-4">{project.steps.find(s => s.id === activeTab)?.title}</h1>
             <p className="text-lg font-mono whitespace-pre-wrap leading-relaxed">{project.steps.find(s => s.id === activeTab)?.content}</p>
          </div>
        ) : null}
      </main>

      {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}
    </div>
  );
};

export default ProjectDetail;
