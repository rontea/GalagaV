import React, { useState } from 'react';
import { Project, CategoryConfig, StatusConfig, GlobalConfig } from '../types';
import { 
  Settings, Plus, Trash2, Tag, Activity, ChevronDown, ChevronRight, 
  Palette, Layout, Database, CheckCircle2, AlertOctagon, Circle, Clock,
  Play, Pause, Flag, Archive, Bookmark, AlertTriangle
} from 'lucide-react';
import { FULL_ICON_MAP } from './ProjectList';

interface ProjectSettingsSidebarProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  globalConfig: GlobalConfig;
}

const COLORS = ['slate', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

const ProjectSettingsSidebar: React.FC<ProjectSettingsSidebarProps> = ({ project, onUpdateProject, globalConfig }) => {
  const [openSection, setOpenSection] = useState<string | null>('identity');
  
  // New Item States
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('cyan');
  
  const [newStatLabel, setNewStatLabel] = useState('');
  const [newStatColor, setNewStatColor] = useState('slate');
  const [newStatIcon, setNewStatIcon] = useState('Circle');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleUpdateIcon = (iconKey: string) => {
    onUpdateProject({ ...project, icon: iconKey });
  };

  // --- Category Logic ---
  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    const key = newCatLabel.toLowerCase().replace(/\s+/g, '-');
    
    // Prevent duplicates
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

     // Prevent duplicates
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
  const ProjectIconComponent = FULL_ICON_MAP[activeProjectIcon] || FULL_ICON_MAP['Terminal'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden sticky top-24">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings size={18} className="text-cyan-600 dark:text-cyan-500" />
            Project Settings
        </h3>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        
        {/* SECTION 1: IDENTITY */}
        <div className="bg-white dark:bg-slate-900">
            <button 
                onClick={() => toggleSection('identity')}
                className="w-full flex items-center justify-between p-4 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
                <span className="flex items-center gap-2"><Layout size={14} /> Identity</span>
                {openSection === 'identity' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {openSection === 'identity' && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Project Icon</p>
                    <div className="grid grid-cols-5 gap-2">
                        {globalConfig.projectIcons.map(iconKey => {
                            const Icon = FULL_ICON_MAP[iconKey];
                            const isActive = activeProjectIcon === iconKey;
                            return (
                                <button
                                    key={iconKey}
                                    onClick={() => handleUpdateIcon(iconKey)}
                                    className={`p-2 rounded flex items-center justify-center border transition-all ${isActive ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'}`}
                                    title={iconKey}
                                >
                                    <Icon size={18} />
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>

        {/* SECTION 2: CATEGORIES */}
        <div className="bg-white dark:bg-slate-900">
             <button 
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between p-4 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
                <span className="flex items-center gap-2"><Tag size={14} /> Categories</span>
                {openSection === 'categories' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {openSection === 'categories' && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                    {/* List */}
                    <div className="space-y-2 mb-4">
                        {(project.categories || []).length === 0 && <p className="text-xs text-slate-400 italic">No custom categories.</p>}
                        {(project.categories || []).map(cat => (
                            <div key={cat.key} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full bg-${cat.color}-500`}></div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cat.label}</span>
                                </div>
                                <button onClick={() => handleRemoveCategory(cat.key)} className="text-slate-400 hover:text-rose-500">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add New */}
                    <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-lg">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Add New</p>
                        <input 
                            value={newCatLabel}
                            onChange={(e) => setNewCatLabel(e.target.value)}
                            placeholder="Label (e.g. QA)"
                            className="w-full mb-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs"
                        />
                        <div className="flex gap-1 mb-2 overflow-x-auto pb-1 custom-scrollbar">
                            {COLORS.map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setNewCatColor(c)}
                                    className={`w-4 h-4 rounded-full flex-shrink-0 bg-${c}-500 ${newCatColor === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                />
                            ))}
                        </div>
                        <button 
                            onClick={handleAddCategory}
                            disabled={!newCatLabel}
                            className="w-full flex items-center justify-center gap-1 py-1 bg-cyan-600 text-white rounded text-[10px] font-bold uppercase disabled:opacity-50"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* SECTION 3: STATUSES */}
        <div className="bg-white dark:bg-slate-900">
             <button 
                onClick={() => toggleSection('statuses')}
                className="w-full flex items-center justify-between p-4 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
                <span className="flex items-center gap-2"><Activity size={14} /> Statuses</span>
                {openSection === 'statuses' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {openSection === 'statuses' && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                     {/* List */}
                     <div className="space-y-2 mb-4">
                        {(project.statuses || []).length === 0 && <p className="text-xs text-slate-400 italic">No custom statuses.</p>}
                        {(project.statuses || []).map(stat => {
                            const Icon = FULL_ICON_MAP[stat.icon] || Circle;
                            return (
                                <div key={stat.key} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className={`text-${stat.color}-500`}><Icon size={14} /></div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{stat.label}</span>
                                    </div>
                                    <button onClick={() => handleRemoveStatus(stat.key)} className="text-slate-400 hover:text-rose-500">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    {/* Add New */}
                    <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-lg">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Add New</p>
                        <input 
                            value={newStatLabel}
                            onChange={(e) => setNewStatLabel(e.target.value)}
                            placeholder="Label (e.g. Blocked)"
                            className="w-full mb-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs"
                        />
                        <div className="flex gap-2 mb-2">
                             {/* Color Picker */}
                             <div className="flex-1">
                                <p className="text-[9px] text-slate-400 mb-1">Color</p>
                                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setNewStatColor(c)}
                                            className={`w-4 h-4 rounded-full flex-shrink-0 bg-${c}-500 ${newStatColor === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                        />
                                    ))}
                                </div>
                             </div>
                        </div>
                        
                        {/* Icon Picker */}
                        <p className="text-[9px] text-slate-400 mb-1">Icon</p>
                        <div className="grid grid-cols-6 gap-1 mb-3">
                             {globalConfig.statusIcons.map(key => {
                                 const Icon = FULL_ICON_MAP[key];
                                 return (
                                     <button
                                        key={key}
                                        onClick={() => setNewStatIcon(key)}
                                        className={`p-1.5 rounded flex items-center justify-center border ${newStatIcon === key ? 'bg-cyan-100 border-cyan-500 text-cyan-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                     >
                                         <Icon size={12} />
                                     </button>
                                 )
                             })}
                        </div>

                        <button 
                            onClick={handleAddStatus}
                            disabled={!newStatLabel}
                            className="w-full flex items-center justify-center gap-1 py-1 bg-cyan-600 text-white rounded text-[10px] font-bold uppercase disabled:opacity-50"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default ProjectSettingsSidebar;
