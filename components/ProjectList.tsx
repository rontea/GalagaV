import React, { useState, useRef } from 'react';
import { Project, GlobalConfig } from '../types';
import ConfirmModal from './ConfirmModal';
import { 
  Plus, Terminal, Trash2, ArrowRight, Calendar, Settings, X, Search,
  Gamepad2, Rocket, Code2, Cpu, Globe, Zap, Box, Ghost, Sword, Bot,
  // Status/Utility Icons
  CheckCircle2, Circle, Clock, AlertOctagon, Play, Pause, Flag, Archive, 
  Bookmark, AlertTriangle, Activity, Star, Heart, Moon, Sun, Cloud, 
  Umbrella, Music, Video, Camera, Mic, Lock, Unlock, Key, Shield,
  Smartphone, Monitor, Laptop, Tablet, Watch, Headphones, Speaker,
  Wifi, Bluetooth, Battery, Database, Server, Layout, Palette,
  PenTool, Wrench, Hammer, Briefcase, Folder, File, Image, Map,
  RefreshCw, FileWarning, ArrowLeft, Download, Upload, CheckSquare, GitBranch
} from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onCreateProject: (name: string, description: string, systemPrompt: string, icon?: string, localFolderPath?: string, todoFolderPath?: string, initGit?: boolean) => void;
  onImportProject: (project: Project) => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void; // Soft Delete
  onRestoreProject: (id: string) => void; // Restore
  onPermanentDeleteProject: (id: string) => void; // Hard Delete
  onClearArchive: () => void; // Clear All Archived
  // Global Config Props
  globalConfig: GlobalConfig;
  onUpdateGlobalConfig: (config: GlobalConfig) => void;
}

// 1. Define the Full Library of available icons
export const FULL_ICON_MAP: Record<string, React.ElementType> = {
  // Project Defaults
  'Terminal': Terminal, 'Gamepad2': Gamepad2, 'Rocket': Rocket, 
  'Code2': Code2, 'Cpu': Cpu, 'Globe': Globe, 'Zap': Zap, 
  'Box': Box, 'Ghost': Ghost, 'Sword': Sword,
  // Status Defaults
  'Circle': Circle, 'Clock': Clock, 'CheckCircle2': CheckCircle2, 
  'AlertOctagon': AlertOctagon, 'Play': Play, 'Pause': Pause, 
  'Flag': Flag, 'Archive': Archive, 'Bookmark': Bookmark, 
  'AlertTriangle': AlertTriangle, 'Activity': Activity,
  // Extras
  'Bot': Bot, 'Star': Star, 'Heart': Heart, 'Moon': Moon, 'Sun': Sun,
  'Cloud': Cloud, 'Umbrella': Umbrella, 'Music': Music, 'Video': Video,
  'Camera': Camera, 'Mic': Mic, 'Lock': Lock, 'Unlock': Unlock, 'Key': Key,
  'Shield': Shield, 'Smartphone': Smartphone, 'Monitor': Monitor,
  'Laptop': Laptop, 'Tablet': Tablet, 'Watch': Watch, 'Headphones': Headphones,
  'Speaker': Speaker, 'Wifi': Wifi, 'Bluetooth': Bluetooth, 'Battery': Battery,
  'Database': Database, 'Server': Server, 'Layout': Layout, 'Palette': Palette,
  'PenTool': PenTool, 'Wrench': Wrench, 'Hammer': Hammer, 'Briefcase': Briefcase,
  'Folder': Folder, 'File': File, 'Image': Image, 'Map': Map
};

// Default keys that cannot be removed
export const DEFAULT_PROJECT_KEYS = [
  'Terminal', 'Gamepad2', 'Rocket', 'Code2', 'Cpu', 'Globe', 'Zap', 'Box', 'Ghost', 'Sword'
];

export const DEFAULT_STATUS_KEYS = [
  'Circle', 'Clock', 'CheckCircle2', 'AlertOctagon', 'Play', 'Pause', 
  'Flag', 'Archive', 'Bookmark', 'AlertTriangle', 'Activity'
];

const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, 
  onCreateProject, 
  onImportProject,
  onSelectProject, 
  onDeleteProject, 
  onRestoreProject,
  onPermanentDeleteProject,
  onClearArchive,
  globalConfig,
  onUpdateGlobalConfig
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ isOpen: boolean; projectId: string; projectName: string } | null>(null);
  const [clearConfirm, setClearConfirm] = useState<boolean>(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState('');
  const [newLocalPath, setNewLocalPath] = useState('');
  const [newTodoPath, setNewTodoPath] = useState('');
  const [initGit, setInitGit] = useState(false);

  const archivedCount = projects.filter(p => p.deletedAt).length;
  const activeCount = projects.filter(p => !p.deletedAt).length;
  const displayedProjects = projects.filter(p => viewMode === 'active' ? !p.deletedAt : p.deletedAt);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreateProject(newName, newDesc, newSystemPrompt, 'Terminal', newLocalPath, newTodoPath, initGit);
      setNewName('');
      setNewDesc('');
      setNewSystemPrompt('');
      setNewLocalPath('');
      setNewTodoPath('');
      setInitGit(false);
      setIsCreating(false);
    }
  };

  const handleDownload = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result);
        
        // Basic validation
        if (parsed.steps && Array.isArray(parsed.steps)) {
          const importedProject = parsed as Project;
          if (newLocalPath) importedProject.localFolderPath = newLocalPath;
          if (newTodoPath) importedProject.todoFolderPath = newTodoPath;
          onImportProject(importedProject);
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          alert('Invalid project file format.');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to parse file.');
      }
    };
    reader.readAsText(file);
  };

  const confirmArchiveProject = () => {
    if (!archiveConfirm) return;
    onDeleteProject(archiveConfirm.projectId);
    setArchiveConfirm(null);
  };

  return (
    <div className="w-full px-4 py-10 sm:px-6">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={handleFileChange}
      />

      {/* TABS & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 mb-8 gap-4" role="tablist">
        <div className="flex gap-6">
          <button
            role="tab"
            aria-selected={viewMode === 'active'}
            onClick={() => setViewMode('active')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 focus:outline-none ${
              viewMode === 'active' 
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Active Projects
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${viewMode === 'active' ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-200' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              {activeCount}
            </span>
          </button>
          <button
            role="tab"
            aria-selected={viewMode === 'archived'}
            onClick={() => setViewMode('archived')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 focus:outline-none ${
              viewMode === 'archived' 
                ? 'border-slate-500 text-slate-700 dark:text-slate-200' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Archived Protocols
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${viewMode === 'archived' ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              {archivedCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 pb-4">
          <button
            type="button"
            onClick={handleImportClick}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            title="Import Project JSON"
            aria-label="Import Project"
          >
            <Upload size={18} />
          </button>

          {!isCreating && viewMode === 'active' && (
            <button 
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-900/20 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 whitespace-nowrap"
            >
              <Plus size={16} aria-hidden="true" />
              New Project
            </button>
          )}

          {viewMode === 'archived' && archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setClearConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-100 dark:bg-rose-950/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700 rounded transition-all text-xs font-bold uppercase"
              aria-label="Clear all archived projects"
            >
              <Trash2 size={14} aria-hidden="true" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* NEW PROJECT FORM */}
      {isCreating && viewMode === 'active' && (
        <div className="mb-12 p-6 bg-white dark:bg-slate-900/80 border border-cyan-500/30 rounded-xl shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal size={18} className="text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              Link Project Folder
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-project-name" className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">Project Name</label>
                <input 
                  id="new-project-name"
                  autoFocus
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Galaga v2.0"
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none font-mono"
                />
              </div>
              <div>
                <label htmlFor="new-project-desc" className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">Brief Description</label>
                <input 
                  id="new-project-desc"
                  type="text" 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Mission objective..."
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-project-prompt" className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center gap-2">
                Active Context (System Prompt)
                <Bot size={14} className="text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
              </label>
              <textarea
                id="new-project-prompt"
                value={newSystemPrompt}
                onChange={(e) => setNewSystemPrompt(e.target.value)}
                placeholder="Define the AI Persona, Role, and Goals for this project..."
                className="w-full h-24 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-3 text-emerald-700 dark:text-emerald-400 font-mono text-sm focus:border-emerald-500 outline-none resize-none custom-scrollbar"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-local-path" className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center gap-2">
                   <Folder size={12} className="text-cyan-500" /> Local Folder Path
                </label>
                <div className="flex gap-2">
                  <input 
                    id="new-local-path"
                    type="text" 
                    value={newLocalPath}
                    onChange={(e) => setNewLocalPath(e.target.value)}
                    placeholder="e.g. C:\\Projects\\my-cool-project"
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const isIframe = window.self !== window.top;
                      if (!isIframe && 'showDirectoryPicker' in window) {
                        try {
                          const dirHandle = await (window as any).showDirectoryPicker();
                          setNewLocalPath((prev) => prev ? `${prev}/${dirHandle.name}`.replace(/\/\/+/g, '/') : dirHandle.name);
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
                                setNewLocalPath((prev) => prev ? `${prev}/${dirName}`.replace(/\/\/+/g, '/') : dirName);
                              }
                            } else {
                              alert("An empty folder was selected, or the browser didn't return any files. Please type the folder name manually.");
                            }
                          };
                          input.click();
                      }
                    }}
                    className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded text-xs font-bold uppercase transition-colors border border-slate-300 dark:border-slate-700"
                    title="Select folder"
                  >
                    Browse
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="new-todo-path" className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center gap-2">
                   <CheckSquare size={12} className="text-emerald-500" /> Todo Sub-folder
                </label>
                <div className="flex gap-2">
                  <input 
                    id="new-todo-path"
                    type="text" 
                    value={newTodoPath}
                    onChange={(e) => setNewTodoPath(e.target.value)}
                    placeholder="e.g. todo"
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const isIframe = window.self !== window.top;
                      if (!isIframe && 'showDirectoryPicker' in window) {
                        try {
                          const dirHandle = await (window as any).showDirectoryPicker();
                          setNewTodoPath((prev) => prev ? `${prev}/${dirHandle.name}`.replace(/\/\/+/g, '/') : dirHandle.name);
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
                                setNewTodoPath((prev) => prev ? `${prev}/${dirName}`.replace(/\/\/+/g, '/') : dirName);
                              }
                            } else {
                              alert("An empty folder was selected, or the browser didn't return any files. Please type the folder name manually.");
                            }
                          };
                          input.click();
                      }
                    }}
                    className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded text-xs font-bold uppercase transition-colors border border-slate-300 dark:border-slate-700"
                    title="Select folder"
                  >
                    Browse
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                id="init-git"
                type="checkbox"
                checked={initGit}
                onChange={(e) => setInitGit(e.target.checked)}
                className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500 bg-slate-100 dark:bg-slate-950 dark:border-slate-700"
              />
              <label htmlFor="init-git" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 cursor-pointer flex items-center gap-2">
                <GitBranch size={14} className="text-indigo-500" /> Initialize Git Repository
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!newName.trim()}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-bold text-xs uppercase"
              >
                Add Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PROJECT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedProjects.map((project) => {
          const IconComponent = FULL_ICON_MAP[project.icon || 'Terminal'] || Terminal;
          const isArchived = !!project.deletedAt;
          
          return (
            <div 
              key={project.id}
              role="button"
              tabIndex={!isArchived ? 0 : -1}
              onKeyDown={(e) => {
                if (!isArchived && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectProject(project.id);
                }
              }}
              onClick={() => !isArchived && onSelectProject(project.id)}
              className={`
                group relative rounded-xl p-6 transition-all duration-300 text-left outline-none focus:ring-2 focus:ring-cyan-500
                ${isArchived 
                  ? 'bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-slate-800 grayscale hover:grayscale-0 hover:bg-slate-200 dark:hover:bg-slate-900/40' 
                  : 'bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-900/10 hover:-translate-y-1 cursor-pointer'}
              `}
            >
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-2 z-20">
                 {/* Show actions on hover for active, always for archived to be obvious */}
                 <div className={`flex gap-2 transition-opacity ${isArchived ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                  {isArchived ? (
                    <>
                      <button 
                        type="button"
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          onRestoreProject(project.id); 
                        }}
                        className="p-2 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors shadow-sm border border-slate-200 dark:border-transparent hover:border-emerald-500 dark:hover:border-emerald-900 focus:opacity-100"
                        title="Restore Project"
                        aria-label={`Restore project ${project.name}`}
                      >
                        <RefreshCw size={16} aria-hidden="true" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          onPermanentDeleteProject(project.id); 
                        }}
                        className="p-2 bg-white dark:bg-slate-800 text-rose-600 hover:text-rose-800 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors border border-slate-200 dark:border-rose-900/30 hover:border-rose-500 shadow-sm focus:opacity-100"
                        title="Delete Permanently"
                        aria-label={`Permanently delete project ${project.name}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={(e) => handleDownload(e, project)}
                        className="p-2 bg-white/80 dark:bg-slate-950/80 text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all shadow-sm hover:shadow-md border border-slate-200 dark:border-transparent hover:border-cyan-200 dark:hover:border-cyan-900/30 focus:opacity-100"
                        title="Export JSON"
                        aria-label={`Export project ${project.name}`}
                      >
                        <Download size={16} aria-hidden="true" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          setArchiveConfirm({ isOpen: true, projectId: project.id, projectName: project.name });
                        }}
                        className="p-2 bg-white/80 dark:bg-slate-950/80 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all shadow-sm hover:shadow-md border border-slate-200 dark:border-transparent hover:border-rose-200 dark:hover:border-rose-900/30 focus:opacity-100"
                        title="Archive Project"
                        aria-label={`Archive project ${project.name}`}
                      >
                        <Archive size={16} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-colors border
                  ${isArchived 
                    ? 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800' 
                    : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-950/50 border-slate-200 dark:border-slate-700 group-hover:border-cyan-500/30'}
                `}>
                  <IconComponent size={20} className={isArchived ? 'text-slate-500 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400'} aria-hidden="true" />
                </div>
                <h3 className={`text-xl font-bold mb-2 truncate ${isArchived ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                  {project.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 h-[60px]">
                  {project.description || "No description provided."}
                </p>
                {project.localFolderPath && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/50 p-2 rounded border border-slate-200 dark:border-slate-700 truncate" title={project.localFolderPath}>
                    <Folder size={14} className="text-cyan-500 flex-shrink-0" />
                    <span className="truncate">{project.localFolderPath}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/50">
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-mono">
                  <Calendar size={12} aria-hidden="true" />
                  <span>{project.steps.length} Steps</span>
                </div>
                
                {!isArchived && (
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-500 hover:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                    Open
                    <ArrowRight size={14} aria-hidden="true" />
                  </div>
                )}
                {isArchived && (
                   <div className="flex flex-col items-end">
                     <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-500 flex items-center gap-1 font-bold">
                       <Archive size={12} aria-hidden="true" /> Archived
                     </span>
                     <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono">
                       {new Date(project.deletedAt!).toLocaleDateString()}
                     </span>
                   </div>
                )}
              </div>
            </div>
          );
        })}

        {displayedProjects.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/30">
            <div className="flex justify-center mb-4 text-slate-400 dark:text-slate-700">
               {viewMode === 'active' ? <Rocket size={48} aria-hidden="true" /> : <Archive size={48} aria-hidden="true" />}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-4 font-mono">
              {viewMode === 'active' ? "No active projects linked." : "Archive is empty."}
            </p>
            {viewMode === 'active' && !isCreating && (
              <div className="flex flex-col items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="text-cyan-600 dark:text-cyan-500 hover:text-cyan-400 font-bold text-sm uppercase underline"
                >
                  Add First Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {archiveConfirm && (
        <ConfirmModal
          isOpen={archiveConfirm.isOpen}
          title="Archive Project?"
          message={`Are you sure you want to archive "${archiveConfirm.projectName}"? You can restore it later from the archive.`}
          confirmLabel="Archive"
          isDanger={false}
          onConfirm={confirmArchiveProject}
          onCancel={() => setArchiveConfirm(null)}
        />
      )}
      {clearConfirm && (
        <ConfirmModal
          isOpen={clearConfirm}
          title="Clear Archive?"
          message={<span>Permanently delete <strong>ALL</strong> archived projects? This action cannot be undone.</span>}
          confirmLabel="Clear All"
          isDanger={true}
          onConfirm={() => { onClearArchive(); setClearConfirm(false); }}
          onCancel={() => setClearConfirm(false)}
        />
      )}
    </div>
  );
};

export default ProjectList;
