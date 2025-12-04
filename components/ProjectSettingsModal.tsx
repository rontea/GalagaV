import React, { useState, useEffect } from 'react';
import { Project, CategoryConfig, StatusConfig, GlobalConfig } from '../types';
import { 
  Settings, Plus, Trash2, Tag, Activity, Layout, X, Save, 
  CheckCircle2, AlertOctagon, Circle, Bot, Type, FileText
} from 'lucide-react';
import { FULL_ICON_MAP } from './ProjectList';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  globalConfig: GlobalConfig;
}

const COLORS = ['slate', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ 
  isOpen, onClose, project, onUpdateProject, globalConfig 
}) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'categories' | 'statuses'>('identity');

  // Identity Form State
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description);
  const [prompt, setPrompt] = useState(project.systemPrompt);
  const [isDirty, setIsDirty] = useState(false);

  // New Item States
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('cyan');
  
  const [newStatLabel, setNewStatLabel] = useState('');
  const [newStatColor, setNewStatColor] = useState('slate');
  const [newStatIcon, setNewStatIcon] = useState('Circle');

  // Sync state when project changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDesc(project.description);
      setPrompt(project.systemPrompt);
      setIsDirty(false);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  // --- Identity Logic ---
  const handleSaveIdentity = () => {
    onUpdateProject({
      ...project,
      name,
      description: desc,
      systemPrompt: prompt
    });
    setIsDirty(false);
  };

  const handleUpdateIcon = (iconKey: string) => {
    onUpdateProject({ ...project, icon: iconKey });
  };

  // --- Category Logic ---
  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    const key = newCatLabel.toLowerCase().replace(/\s+/g, '-');
    
    if (project.categories?.find(c => c.key === key)) {
        alert("Category already exists");
        return;
    }

    const newCategory: CategoryConfig = {
        key,
        label: newCatLabel,
        color: newCatColor
    };

    onUpdateProject({
        ...project,
        categories: [...(project.categories || []), newCategory]
    });
    setNewCatLabel('');
  };

  const handleRemoveCategory = (key: string) => {
      if (confirm(`Remove category "${key}"? Existing tasks will revert to default styling.`)) {
        onUpdateProject({
            ...project,
            categories: (project.categories || []).filter(c => c.key !== key)
        });
      }
  };

  // --- Status Logic ---
  const handleAddStatus = () => {
    if (!newStatLabel.trim()) return;
    const key = newStatLabel.toLowerCase().replace(/\s+/g, '-');

     if (project.statuses?.find(s => s.key === key)) {
        alert("Status already exists");
        return;
    }

    const newStatus: StatusConfig = {
        key,
        label: newStatLabel,
        color: newStatColor,
        icon: newStatIcon
    };

    onUpdateProject({
        ...project,
        statuses: [...(project.statuses || []), newStatus]
    });
    setNewStatLabel('');
  };

  const handleRemoveStatus = (key: string) => {
    if (confirm(`Remove status "${key}"? Existing tasks will need to be updated.`)) {
        onUpdateProject({
            ...project,
            statuses: (project.statuses || []).filter(s => s.key !== key)
        });
    }
  };

  const activeProjectIcon = project.icon || 'Terminal';

  // --- Renderers ---

  const renderIdentityTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Basic Info Form */}
      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-2">
            <Type size={12} /> Project Name
          </label>
          <input 
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-cyan-500 outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-2">
            <FileText size={12} /> Mission Brief (Description)
          </label>
          <textarea 
            value={desc}
            onChange={(e) => { setDesc(e.target.value); setIsDirty(true); }}
            className="w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-2">
            <Bot size={12} className="text-emerald-600" /> Active Context (System Prompt)
          </label>
          <textarea 
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setIsDirty(true); }}
            className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs font-mono text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none resize-none custom-scrollbar"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button 
            onClick={handleSaveIdentity}
            disabled={!isDirty}
            className={`
              flex items-center gap-2 px-6 py-2 rounded font-bold text-xs uppercase transition-all
              ${isDirty 
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}
            `}
          >
            <Save size={14} />
            {isDirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Icon Picker */}
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-3">Project Icon</p>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 h-48 overflow-y-auto custom-scrollbar">
            {globalConfig.projectIcons.map(iconKey => {
                const Icon = FULL_ICON_MAP[iconKey];
                const isActive = activeProjectIcon === iconKey;
                return (
                    <button
                        key={iconKey}
                        onClick={() => handleUpdateIcon(iconKey)}
                        className={`p-3 rounded-lg flex items-center justify-center border transition-all hover:scale-110 ${isActive ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-md ring-2 ring-cyan-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-500'}`}
                        title={iconKey}
                    >
                        <Icon size={20} />
                    </button>
                )
            })}
        </div>
      </div>
    </div>
  );

  const renderCategoriesTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Add New Category</p>
          <div className="flex flex-col gap-3">
            <input 
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                placeholder="Label (e.g. QA)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                {COLORS.map(c => (
                    <button 
                        key={c}
                        onClick={() => setNewCatColor(c)}
                        className={`w-6 h-6 rounded-full flex-shrink-0 bg-${c}-500 transition-transform hover:scale-110 ${newCatColor === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400 scale-110' : ''}`}
                    />
                ))}
            </div>
            <button 
                onClick={handleAddCategory}
                disabled={!newCatLabel}
                className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-600 text-white rounded text-xs font-bold uppercase disabled:opacity-50 hover:bg-cyan-500 transition-colors"
            >
                <Plus size={14} /> Add Category
            </button>
          </div>
      </div>

      <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400">Existing Categories</p>
          {(project.categories || []).length === 0 && <p className="text-xs text-slate-400 italic">No custom categories.</p>}
          {(project.categories || []).map(cat => (
              <div key={cat.key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full bg-${cat.color}-500 shadow-sm`}></div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cat.label}</span>
                  </div>
                  <button onClick={() => handleRemoveCategory(cat.key)} className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors">
                      <Trash2 size={16} />
                  </button>
              </div>
          ))}
      </div>
    </div>
  );

  const renderStatusesTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Add New Status</p>
          <div className="flex flex-col gap-3">
             <input 
                value={newStatLabel}
                onChange={(e) => setNewStatLabel(e.target.value)}
                placeholder="Label (e.g. Blocked)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
             />
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <p className="text-[9px] text-slate-400 mb-1">Color</p>
                  <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                      {COLORS.map(c => (
                          <button 
                              key={c}
                              onClick={() => setNewStatColor(c)}
                              className={`w-5 h-5 rounded-full flex-shrink-0 bg-${c}-500 transition-transform hover:scale-110 ${newStatColor === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400 scale-110' : ''}`}
                          />
                      ))}
                  </div>
               </div>
               <div>
                  <p className="text-[9px] text-slate-400 mb-1">Icon</p>
                  <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                       {globalConfig.statusIcons.map(key => {
                           const Icon = FULL_ICON_MAP[key];
                           return (
                               <button
                                  key={key}
                                  onClick={() => setNewStatIcon(key)}
                                  className={`p-1.5 rounded flex items-center justify-center border flex-shrink-0 transition-all ${newStatIcon === key ? 'bg-cyan-100 border-cyan-500 text-cyan-700' : 'bg-white border-slate-200 text-slate-400'}`}
                               >
                                   <Icon size={14} />
                               </button>
                           )
                       })}
                  </div>
               </div>
             </div>

             <button 
                onClick={handleAddStatus}
                disabled={!newStatLabel}
                className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-600 text-white rounded text-xs font-bold uppercase disabled:opacity-50 hover:bg-cyan-500 transition-colors"
             >
                <Plus size={14} /> Add Status
             </button>
          </div>
      </div>

      <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400">Existing Statuses</p>
          {(project.statuses || []).length === 0 && <p className="text-xs text-slate-400 italic">No custom statuses.</p>}
          {(project.statuses || []).map(stat => {
              const Icon = FULL_ICON_MAP[stat.icon] || Circle;
              return (
                  <div key={stat.key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-3">
                          <div className={`text-${stat.color}-500 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 p-1.5 rounded`}>
                            <Icon size={16} />
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{stat.label}</span>
                      </div>
                      <button onClick={() => handleRemoveStatus(stat.key)} className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors">
                          <Trash2 size={16} />
                      </button>
                  </div>
              )
          })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings size={20} className="text-cyan-600 dark:text-cyan-500" />
              Project Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 uppercase tracking-wide">
              {project.name}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Layout: Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-48 bg-slate-50 dark:bg-slate-950/30 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 gap-2">
             <button 
               onClick={() => setActiveTab('identity')}
               className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'identity' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-800' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
             >
                <Layout size={16} /> Identity
             </button>
             <button 
               onClick={() => setActiveTab('categories')}
               className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-800' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
             >
                <Tag size={16} /> Categories
             </button>
             <button 
               onClick={() => setActiveTab('statuses')}
               className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'statuses' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-800' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
             >
                <Activity size={16} /> Statuses
             </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 dark:bg-black/20">
             {activeTab === 'identity' && renderIdentityTab()}
             {activeTab === 'categories' && renderCategoriesTab()}
             {activeTab === 'statuses' && renderStatusesTab()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProjectSettingsModal;