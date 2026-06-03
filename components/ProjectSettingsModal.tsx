import React, { useState, useEffect, useRef } from 'react';
import { Project, CategoryConfig, StatusConfig, GlobalConfig } from '../types';
import { 
  Settings, Plus, Trash2, Tag, Activity, Layout, X, Save, 
  CheckCircle2, AlertOctagon, Circle, Bot, Type, FileText, Lock, Clock,
  Download, Upload, Edit2, Github, Folder, CheckSquare, GitBranch, Loader2, RefreshCw
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

/* 
  Tailwind Safelist for dynamic colors used in categories and statuses:
  bg-slate-500 bg-red-500 bg-orange-500 bg-amber-500 bg-yellow-500 bg-lime-500 bg-green-500 bg-emerald-500 bg-teal-500 bg-cyan-500 bg-sky-500 bg-blue-500 bg-indigo-500 bg-violet-500 bg-purple-500 bg-fuchsia-500 bg-pink-500 bg-rose-500
  text-slate-500 text-red-500 text-orange-500 text-amber-500 text-yellow-500 text-lime-500 text-green-500 text-emerald-500 text-teal-500 text-cyan-500 text-sky-500 text-blue-500 text-indigo-500 text-violet-500 text-purple-500 text-fuchsia-500 text-pink-500 text-rose-500
  bg-slate-50 bg-red-50 bg-orange-50 bg-amber-50 bg-yellow-50 bg-lime-50 bg-green-50 bg-emerald-50 bg-teal-50 bg-cyan-50 bg-sky-50 bg-blue-50 bg-indigo-50 bg-violet-50 bg-purple-50 bg-fuchsia-50 bg-pink-50 bg-rose-50
  dark:bg-slate-900/20 dark:bg-red-900/20 dark:bg-orange-900/20 dark:bg-amber-900/20 dark:bg-yellow-900/20 dark:bg-lime-900/20 dark:bg-green-900/20 dark:bg-emerald-900/20 dark:bg-teal-900/20 dark:bg-cyan-900/20 dark:bg-sky-900/20 dark:bg-blue-900/20 dark:bg-indigo-900/20 dark:bg-violet-900/20 dark:bg-purple-900/20 dark:bg-fuchsia-900/20 dark:bg-pink-900/20 dark:bg-rose-900/20
*/

const SYSTEM_STATUSES = [
  { key: 'pending', label: 'Pending', color: 'slate', icon: 'Circle' },
  { key: 'in-progress', label: 'In Progress', color: 'amber', icon: 'Clock' },
  { key: 'completed', label: 'Completed', color: 'emerald', icon: 'CheckCircle2' },
  { key: 'failed', label: 'Failed', color: 'red', icon: 'AlertOctagon' }
];

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ 
  isOpen, onClose, project, onUpdateProject, globalConfig 
}) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'categories' | 'statuses'>('identity');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [isSyncingFolders, setIsSyncingFolders] = useState(false);

  const syncFolders = async () => {
    if (!localFolderPath) {
      alert("Local Folder Path is required to sync.");
      return;
    }
    setIsSyncingFolders(true);
    try {
        const res = await fetch('/api/init-folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            localFolderPath,
            todoFolderPath,
            initGit: false,
          })
        });
        
        const data = await res.json();
        if (data.success) {
           alert("Linked folder is ready.");
           detectProjectInfo(localFolderPath);
        } else {
           alert("Failed to prepare linked folder:\\n" + data.error + "\\n" + (data.stderr || ''));
        }
    } catch(err: any) {
      console.error(err);
      alert("Error preparing linked folder: " + err.message);
    } finally {
      setIsSyncingFolders(false);
    }
  };

  const detectProjectInfo = async (path: string) => {
    if (!path || isDetecting) return;
    setIsDetecting(true);
    try {
      const res = await fetch(`/api/project-info?cwd=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.currentBranch && data.currentBranch !== 'Unknown') {
          setDefaultBranch(prev => {
            if (prev !== data.currentBranch) {
              setIsDirty(true);
            }
            return data.currentBranch;
          });
        }
        if (data.systemVersion && data.systemVersion !== 'Unknown') {
          setVersion(prev => {
            if (prev !== data.systemVersion) {
              setIsDirty(true);
            }
            return data.systemVersion;
          });
        }
      }
    } catch (err) {
      console.error('Failed to detect project info:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  // Identity Form State
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description);
  const [prompt, setPrompt] = useState(project.systemPrompt);
  const [repoUrl, setRepoUrl] = useState(project.repositoryUrl || '');
  const [localFolderPath, setLocalFolderPath] = useState(project.localFolderPath || '');
  const [todoFolderPath, setTodoFolderPath] = useState(project.todoFolderPath || '');
  const [defaultBranch, setDefaultBranch] = useState(project.defaultBranch || '');
  const [version, setVersion] = useState(project.version || '');
  const [isDirty, setIsDirty] = useState(false);

  // New Item States
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('cyan');
  
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editCatLabel, setEditCatLabel] = useState('');
  const [editCatColor, setEditCatColor] = useState('cyan');

  const [newStatLabel, setNewStatLabel] = useState('');
  const [newStatColor, setNewStatColor] = useState('slate');
  const [newStatIcon, setNewStatIcon] = useState('Circle');

  const [editingStatusKey, setEditingStatusKey] = useState<string | null>(null);
  const [editStatLabel, setEditStatLabel] = useState('');
  const [editStatColor, setEditStatColor] = useState('slate');
  const [editStatIcon, setEditStatIcon] = useState('Circle');

  // Sync state when project changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDesc(project.description);
      setPrompt(project.systemPrompt);
      setRepoUrl(project.repositoryUrl || '');
      setLocalFolderPath(project.localFolderPath || '');
      setTodoFolderPath(project.todoFolderPath || '');
      setDefaultBranch(project.defaultBranch || '');
      setVersion(project.version || '');
      setIsDirty(false);
      
      if (project.localFolderPath) {
        detectProjectInfo(project.localFolderPath);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Identity Logic ---
  const handleSaveIdentity = () => {
    onUpdateProject({
      ...project,
      name,
      description: desc,
      systemPrompt: prompt,
      repositoryUrl: repoUrl,
      localFolderPath: localFolderPath,
      todoFolderPath: todoFolderPath,
      defaultBranch: defaultBranch,
      version: version
    });
    setIsDirty(false);
  };

  const handleUpdateIcon = (iconKey: string) => {
    onUpdateProject({ ...project, icon: iconKey });
  };

  // --- Import/Export Logic ---
  const handleExportSettings = () => {
    const configData = {
      categories: project.categories || [],
      statuses: project.statuses || []
    };
    
    const jsonString = JSON.stringify(configData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = `${project.name.replace(/\s+/g, '_').toLowerCase()}_config.json`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result);
        
        // Validation
        if (!Array.isArray(parsed.categories) && !Array.isArray(parsed.statuses)) {
          alert("Invalid config file. Must contain 'categories' or 'statuses' arrays.");
          return;
        }

        const newCategories = [...(project.categories || [])];
        const newStatuses = [...(project.statuses || [])];
        let changesCount = 0;

        // Merge Categories
        if (Array.isArray(parsed.categories)) {
            parsed.categories.forEach((cat: CategoryConfig) => {
                const existingIdx = newCategories.findIndex(c => c.key === cat.key);
                if (existingIdx !== -1) {
                    newCategories[existingIdx] = cat; // Overwrite existing
                } else {
                    newCategories.push(cat); // Add new
                }
                changesCount++;
            });
        }

        // Merge Statuses
        if (Array.isArray(parsed.statuses)) {
            parsed.statuses.forEach((stat: StatusConfig) => {
                const existingIdx = newStatuses.findIndex(s => s.key === stat.key);
                if (existingIdx !== -1) {
                    newStatuses[existingIdx] = stat; // Overwrite existing
                } else {
                    newStatuses.push(stat); // Add new
                }
                changesCount++;
            });
        }

        onUpdateProject({
            ...project,
            categories: newCategories,
            statuses: newStatuses
        });
        
        alert(`Configuration imported successfully! Updated/Added ${changesCount} items.`);
        if (fileInputRef.current) fileInputRef.current.value = '';

      } catch (err) {
        console.error("Import failed", err);
        alert("Failed to parse configuration file.");
      }
    };
    reader.readAsText(file);
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

  const handleStartEditCategory = (cat: CategoryConfig) => {
    setEditingCategoryKey(cat.key);
    setEditCatLabel(cat.label);
    setEditCatColor(cat.color || 'cyan');
  };

  const handleSaveEditCategory = () => {
    if (!editingCategoryKey || !editCatLabel.trim()) return;

    onUpdateProject({
        ...project,
        categories: (project.categories || []).map(c => 
          c.key === editingCategoryKey 
            ? { ...c, label: editCatLabel, color: editCatColor } 
            : c
        )
    });
    setEditingCategoryKey(null);
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

  const handleStartEditStatus = (stat: StatusConfig) => {
    setEditingStatusKey(stat.key);
    setEditStatLabel(stat.label);
    setEditStatColor(stat.color);
    setEditStatIcon(stat.icon || 'Circle');
  };

  const handleSaveEditStatus = () => {
    if (!editingStatusKey || !editStatLabel.trim()) return;

    onUpdateProject({
        ...project,
        statuses: (project.statuses || []).map(s => 
          s.key === editingStatusKey 
            ? { ...s, label: editStatLabel, color: editStatColor, icon: editStatIcon } 
            : s
        )
    });
    setEditingStatusKey(null);
  };

  const activeProjectIcon = project.icon || 'Terminal';

  // --- Renderers ---

  const renderIdentityTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Basic Info Form */}
      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
            <Type size={12} /> Project Name
          </label>
          <input 
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-cyan-500 outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
            <FileText size={12} /> Mission Brief (Description)
          </label>
          <textarea 
            value={desc}
            onChange={(e) => { setDesc(e.target.value); setIsDirty(true); }}
            className="w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
            <Github size={12} /> Repository URL
          </label>
          <input 
            value={repoUrl}
            onChange={(e) => { setRepoUrl(e.target.value); setIsDirty(true); }}
            placeholder="https://github.com/username/repo"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
            <Folder size={12} /> Local Folder Path
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                value={localFolderPath}
                onChange={(e) => { setLocalFolderPath(e.target.value); setIsDirty(true); }}
                onBlur={() => { if (localFolderPath) detectProjectInfo(localFolderPath); }}
                placeholder="/Users/username/Projects/my-app"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
              {isDetecting && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 animate-spin">
                  <Loader2 size={16} />
                </div>
              )}
            </div>
            <button
              onClick={() => detectProjectInfo(localFolderPath)}
              disabled={!localFolderPath || isDetecting}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all border border-slate-300 dark:border-slate-600 disabled:opacity-50"
            >
              {isDetecting ? 'Detecting...' : 'Detect'}
            </button>
            <button
              onClick={async () => {
                const isIframe = window.self !== window.top;
                if (!isIframe && 'showDirectoryPicker' in window) {
                  try {
                    const dirHandle = await (window as any).showDirectoryPicker();
                    setLocalFolderPath((prev) => prev ? `${prev}/${dirHandle.name}`.replace(/\/\/+/g, '/') : dirHandle.name);
                    setIsDirty(true);
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      console.error('Failed to select directory:', err);
                      handleDirectoryPickerFallback();
                    }
                  }
                } else {
                    handleDirectoryPickerFallback();
                }

                function handleDirectoryPickerFallback() {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.setAttribute('webkitdirectory', 'true');
                    input.setAttribute('directory', 'true');
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        const firstFile = files[0];
                        const pathParts = firstFile.webkitRelativePath.split('/');
                        if (pathParts.length > 0) {
                          const dirName = pathParts[0];
                          setLocalFolderPath((prev) => prev ? `${prev}/${dirName}`.replace(/\/\/+/g, '/') : dirName);
                          setIsDirty(true);
                        }
                      } else {
                        alert("An empty folder was selected, or the browser didn't return any files. Please type the folder name manually.");
                      }
                    };
                    input.click();
                }
              }}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500 outline-none"
              title="Select folder (Note: Web browsers only provide the folder name, not the full system path)"
            >
              Browse
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Due to browser constraints, selecting a folder only retrieves its name. You may need to manually prepend the rest of the path.</p>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
            <CheckSquare size={12} className="text-emerald-500" /> Todo Folder Path
          </label>
          <div className="flex gap-2">
            <input 
              value={todoFolderPath}
              onChange={(e) => { setTodoFolderPath(e.target.value); setIsDirty(true); }}
              placeholder={localFolderPath ? "todo" : "/Users/username/Projects/my-app/todo"}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
              <button
              onClick={async () => {
                const isIframe = window.self !== window.top;
                if (!isIframe && 'showDirectoryPicker' in window) {
                  try {
                    const dirHandle = await (window as any).showDirectoryPicker();
                    setTodoFolderPath((prev) => prev ? `${prev}/${dirHandle.name}`.replace(/\/\/+/g, '/') : dirHandle.name);
                    setIsDirty(true);
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      console.error('Failed to select directory:', err);
                      handleDirectoryPickerFallback();
                    }
                  }
                } else {
                    handleDirectoryPickerFallback();
                }

                function handleDirectoryPickerFallback() {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.setAttribute('webkitdirectory', 'true');
                    input.setAttribute('directory', 'true');
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        const firstFile = files[0];
                        const pathParts = firstFile.webkitRelativePath.split('/');
                        if (pathParts.length > 0) {
                          const dirName = pathParts[0];
                          setTodoFolderPath((prev) => prev ? `${prev}/${dirName}`.replace(/\/\/+/g, '/') : dirName);
                          setIsDirty(true);
                        }
                      } else {
                        alert("An empty folder was selected, or the browser didn't return any files. Please type the folder name manually.");
                      }
                    };
                    input.click();
                }
              }}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
              title="Select folder"
            >
              Browse
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Directory where TODO markdown files will be written. A relative folder name like "todo" is created inside the linked Local Folder Path.</p>
        </div>

        {/* Prepare Linked Folder Action */}
        <div className="flex justify-end mt-2">
          <button
            onClick={syncFolders}
            disabled={isSyncingFolders || !localFolderPath}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncingFolders ? "animate-spin" : ""} />
            {isSyncingFolders ? 'Preparing...' : 'Prepare Linked Folder'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
              <GitBranch size={12} className="text-cyan-500" /> Default Branch
            </label>
            <input 
              value={defaultBranch}
              onChange={(e) => { setDefaultBranch(e.target.value); setIsDirty(true); }}
              placeholder="main"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
              <Tag size={12} className="text-amber-500" /> Version
            </label>
            <input 
              value={version}
              onChange={(e) => { setVersion(e.target.value); setIsDirty(true); }}
              placeholder="1.0.0"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
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
        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-3">Project Icon</p>
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
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-3">Add New Category</p>
          <div className="flex flex-col gap-3">
            <input 
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                placeholder="Label (e.g. QA)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {COLORS.map(c => (
                    <button 
                        key={c}
                        onClick={() => setNewCatColor(c)}
                        className={`w-12 h-12 rounded-full flex-shrink-0 bg-${c}-500 transition-transform hover:scale-110 ${newCatColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 ring-slate-400 scale-110' : ''}`}
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
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Existing Categories</p>
          {(project.categories || []).length === 0 && <p className="text-xs text-slate-400 italic">No custom categories.</p>}
          {(project.categories || []).map(cat => {
              if (editingCategoryKey === cat.key) {
                  return (
                      <div key={cat.key} className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-cyan-500 shadow-md">
                          <input 
                              value={editCatLabel}
                              onChange={(e) => setEditCatLabel(e.target.value)}
                              placeholder="Category Label"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                          />
                          
                          <div className="flex flex-col gap-2">
                              <p className="text-[9px] text-slate-500 dark:text-slate-400">Color</p>
                              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                  {COLORS.map(c => (
                                      <button 
                                          key={c}
                                          onClick={() => setEditCatColor(c)}
                                          className={`w-8 h-8 rounded-full flex-shrink-0 bg-${c}-500 transition-transform ${editCatColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 ring-slate-400 scale-110' : ''}`}
                                      />
                                  ))}
                              </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                              <button 
                                  onClick={() => setEditingCategoryKey(null)}
                                  className="px-3 py-1.5 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              >
                                  Cancel
                              </button>
                              <button 
                                  onClick={handleSaveEditCategory}
                                  disabled={!editCatLabel.trim()}
                                  className="px-4 py-1.5 bg-cyan-600 text-white text-xs font-bold uppercase rounded shadow disabled:opacity-50 hover:bg-cyan-500 transition-colors"
                              >
                                  Save
                              </button>
                          </div>
                      </div>
                  );
              }

              return (
                  <div key={cat.key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm group">
                      <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full bg-${cat.color}-500 shadow-sm`}></div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleStartEditCategory(cat)} className="text-slate-400 hover:text-cyan-600 p-2 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded transition-colors" title="Edit Category">
                              <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleRemoveCategory(cat.key)} className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors" title="Remove Category">
                              <Trash2 size={16} />
                          </button>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );

  const renderStatusesTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-3">Add New Status</p>
          <div className="flex flex-col gap-3">
             <input 
                value={newStatLabel}
                onChange={(e) => setNewStatLabel(e.target.value)}
                placeholder="Label (e.g. Blocked)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
             />
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-1">Color</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {COLORS.map(c => (
                          <button 
                              key={c}
                              onClick={() => setNewStatColor(c)}
                              className={`w-12 h-12 rounded-full flex-shrink-0 bg-${c}-500 transition-transform hover:scale-110 ${newStatColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 ring-slate-400 scale-110' : ''}`}
                          />
                      ))}
                  </div>
               </div>
               <div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-1">Icon</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                       {globalConfig.statusIcons.map(key => {
                           const Icon = FULL_ICON_MAP[key];
                           return (
                               <button
                                  key={key}
                                  onClick={() => setNewStatIcon(key)}
                                  className={`p-3 rounded flex items-center justify-center border flex-shrink-0 transition-all ${newStatIcon === key ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-500 text-cyan-700 dark:text-cyan-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                               >
                                   <Icon size={24} />
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

      <div className="space-y-4">
          {/* System Defaults */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-2">System Defaults</p>
            <div className="space-y-2">
              {SYSTEM_STATUSES.map(stat => {
                  const Icon = FULL_ICON_MAP[stat.icon] || Circle;
                  return (
                      <div key={stat.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 opacity-80">
                          <div className="flex items-center gap-3">
                              <div className={`text-${stat.color}-500 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 p-1.5 rounded`}>
                                <Icon size={16} />
                              </div>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{stat.label}</span>
                          </div>
                          <div className="text-slate-300 p-2" title="System Status (Read Only)">
                              <Lock size={14} />
                          </div>
                      </div>
                  )
              })}
            </div>
          </div>

          {/* Custom Statuses */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-2">Custom Statuses</p>
            {(project.statuses || []).length === 0 && <p className="text-xs text-slate-400 italic">No custom statuses.</p>}
            <div className="space-y-2">
              {(project.statuses || []).map(stat => {
                  const Icon = FULL_ICON_MAP[stat.icon] || Circle;
                  
                  if (editingStatusKey === stat.key) {
                      return (
                          <div key={stat.key} className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-cyan-500 shadow-md">
                              <input 
                                value={editStatLabel}
                                onChange={(e) => setEditStatLabel(e.target.value)}
                                placeholder="Status Label"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                              />
                              
                              <div className="flex flex-col gap-2">
                                <p className="text-[9px] text-slate-500 dark:text-slate-400">Color</p>
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setEditStatColor(c)}
                                            className={`w-8 h-8 rounded-full flex-shrink-0 bg-${c}-500 transition-transform ${editStatColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 ring-slate-400 scale-110' : ''}`}
                                        />
                                    ))}
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                <p className="text-[9px] text-slate-500 dark:text-slate-400">Icon</p>
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                     {globalConfig.statusIcons.map(key => {
                                         const EditIcon = FULL_ICON_MAP[key];
                                         return (
                                             <button
                                                key={key}
                                                onClick={() => setEditStatIcon(key)}
                                                className={`p-2 rounded flex items-center justify-center border flex-shrink-0 transition-all ${editStatIcon === key ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-500 text-cyan-700 dark:text-cyan-400' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                                             >
                                                 <EditIcon size={16} />
                                             </button>
                                         )
                                     })}
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    onClick={() => setEditingStatusKey(null)}
                                    className="px-3 py-1.5 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveEditStatus}
                                    disabled={!editStatLabel.trim()}
                                    className="px-4 py-1.5 bg-cyan-600 text-white text-xs font-bold uppercase rounded shadow disabled:opacity-50 hover:bg-cyan-500 transition-colors"
                                >
                                    Save
                                </button>
                              </div>
                          </div>
                      );
                  }

                  return (
                      <div key={stat.key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm group">
                          <div className="flex items-center gap-3">
                              <div className={`text-${stat.color}-500 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 p-1.5 rounded`}>
                                <Icon size={16} />
                              </div>
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{stat.label}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleStartEditStatus(stat)} className="text-slate-400 hover:text-cyan-600 p-2 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded transition-colors" title="Edit Status">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleRemoveStatus(stat.key)} className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors" title="Remove Status">
                                <Trash2 size={16} />
                            </button>
                          </div>
                      </div>
                  )
              })}
            </div>
          </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-[80vw] h-[80vh] overflow-hidden flex flex-col">
        
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
          <div className="w-56 sm:w-64 bg-slate-50 dark:bg-slate-950/30 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 gap-2">
             <button 
               onClick={() => setActiveTab('identity')}
               className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'identity' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
             >
                <Layout size={16} /> Identity
             </button>
             <button 
               onClick={() => setActiveTab('categories')}
               className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
             >
                <Tag size={16} /> Categories
             </button>
             <button 
               onClick={() => setActiveTab('statuses')}
               className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'statuses' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
             >
                <Activity size={16} /> Statuses
             </button>

             {/* Configuration Management */}
             <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-2">
                 <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 pl-2">Configuration</p>
                 <button 
                    onClick={handleExportSettings}
                    className="flex items-center gap-2 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-xs font-bold uppercase"
                 >
                    <Download size={14} /> Export Config
                 </button>
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-xs font-bold uppercase"
                 >
                    <Upload size={14} /> Import Config
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportSettings} 
                    accept=".json" 
                    className="hidden" 
                 />
             </div>
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
