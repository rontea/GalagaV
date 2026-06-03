import React, { useState, useEffect } from 'react';
import { Plus, Check, Loader2, ListTodo, Settings2, Trash, GitCommit, Calendar, User, Circle, Edit2, Minimize2, Maximize2, ChevronRight, Layout, Database, Palette, CheckCircle2, AlertOctagon, GitBranch, Save, X, Sparkles, FolderPlus, Archive, RotateCcw } from 'lucide-react';
import TodoSettingsModal from './TodoSettingsModal';
import AddTodoModal from './AddTodoModal';
import AddModuleModal from './AddModuleModal';
import ViewFileModal from './ViewFileModal';
import ConfirmModal from '../../../components/ConfirmModal';

import { Project } from '../../../types';
import { BASE_CATEGORIES, BASE_STATUSES } from '../../../lib/ui-constants';

export interface Subtask {
  text: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  date: string;
  days: number;
  description: string;
  type: string;
  status: string;
  assign: string;
  subtask: Subtask[];
  comments: string;
  commitMessage?: string;
  timelineId?: string;
  collection?: string;
  archivedAt?: number;
}

export interface Contributor {
  name: string;
  alias: string;
}

export default function TodoManagerView({ project, onGoToTimeline, onUpdateProject, targetTodoId }: { project?: Project, onGoToTimeline?: (timelineId: string) => void, onUpdateProject?: (project: Project) => void, targetTodoId?: string }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedTodos, setSelectedTodos] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [developers, setDevelopers] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shrunkTodos, setShrunkTodos] = useState<string[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [viewFileContent, setFileViewContent] = useState<string | null>(null);
  const [viewFileTitle, setFileViewTitle] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'list' | 'file'>('list');
  const [globalFileContent, setGlobalFileContent] = useState<string | null>(null);
  const [selectedFileModule, setSelectedFileModule] = useState<string>('');

  useEffect(() => {
    if (!isLoading && targetTodoId && activeTab === 'list') {
      // Ensure it's not shrunk
      setShrunkTodos(prev => prev.filter(id => id !== targetTodoId));
      
      // Expand editing mode to it if we want to, or just scroll
      setTimeout(() => {
        const el = document.getElementById(`todo-${targetTodoId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-cyan-500', 'ring-offset-4', 'dark:ring-offset-slate-900', 'rounded-xl', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-cyan-500', 'ring-offset-4', 'dark:ring-offset-slate-900');
          }, 3000);
        }
      }, 100);
    }
  }, [targetTodoId, isLoading, activeTab]);

  const handleGoToTimeline = (stepId: string) => {
    if (onGoToTimeline) {
      onGoToTimeline('timeline');
      setTimeout(() => {
        const el = document.getElementById(`step-${stepId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-cyan-500', 'ring-offset-4', 'dark:ring-offset-slate-900', 'rounded-xl', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-cyan-500', 'ring-offset-4', 'dark:ring-offset-slate-900');
          }, 3000);
        }
      }, 500);
    }
  };

  const fetchGlobalFile = async (col: string = selectedFileModule) => {
    try {
      const res = await fetch('/api/viewglobaltodofile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todoFolderPath: project?.todoFolderPath,
          localFolderPath: project?.localFolderPath,
          collection: col || undefined
        })
      });
      const data = await res.json();
      if (data.success && data.content) {
        setGlobalFileContent(data.content);
      } else {
        setGlobalFileContent('File not found or not synced yet. Try syncing TODOs to file first.');
      }
    } catch (err) {
      console.error(err);
      setGlobalFileContent('Failed to view global TODO file');
    }
  };

  const handleTabChange = (tab: 'list' | 'file') => {
    setActiveTab(tab);
    if (tab === 'file') {
      fetchGlobalFile();
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [todosRes, stRes, tyRes, colRes, coRes, devRes] = await Promise.all([
        fetch('/api/syncfromfiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            todoFolderPath: project?.todoFolderPath,
            localFolderPath: project?.localFolderPath
          })
        }),
        fetch('/api/get/statuses'),
        fetch('/api/get/types'),
        fetch('/api/get/collections'),
        fetch('/api/get/contributors'),
        fetch('/api/get/developers')
      ]);
      const todosDataRes = await todosRes.json();
      const todosData = todosDataRes.todos || [];
      setTodos(todosData);
      
      // Auto-shrink completed tasks
      const completedIds = todosData
        .filter((t: Todo) => t.status.toLowerCase() === 'done' || t.status.toLowerCase() === 'completed')
        .map((t: Todo) => t.id);
      
      setShrunkTodos(prev => Array.from(new Set([...prev, ...completedIds])));
      
      setStatuses(await stRes.json());
      setTypes(await tyRes.json());
      setModules(await colRes.json());
      setContributors(await coRes.json());
      setDevelopers(await devRes.json());
      setSelectedTodos([]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAll = () => {
    if (selectedTodos.length === todos.length) {
      setSelectedTodos([]);
    } else {
      setSelectedTodos(todos.map(t => t.id));
    }
  };

  const toggleTodo = (id: string) => {
    setSelectedTodos(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const toggleShrink = (id: string) => {
    setShrunkTodos(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const viewFile = async (todo: Todo) => {
    try {
      const res = await fetch('/api/viewtodofile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          todoFolderPath: project?.todoFolderPath,
          localFolderPath: project?.localFolderPath
        })
      });
      const data = await res.json();
      if (data.success && data.content) {
        setFileViewTitle(`todo-${todo.id}.md`);
        setFileViewContent(data.content);
      } else {
        alert('File not found or not synced yet. Try syncing this task to file first.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to view file');
    }
  };

  const archiveSelected = async () => {
    if (!confirm('Are you sure you want to archive the selected TODOs? They will be removed from the files but kept in the archive.')) return;
    for (const id of selectedTodos) {
      await fetch('/api/archivetodo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          todoFolderPath: project?.todoFolderPath,
          localFolderPath: project?.localFolderPath
        })
      });
    }
    fetchData();
    alert('Selected TODOs archived!');
  };

  const deleteSelectedPermanently = async () => {
    if (!confirm('PERMANENT DELETE: Are you sure? This cannot be undone.')) return;
    for (const id of selectedTodos) {
      await fetch('/api/deletetodo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          todoFolderPath: project?.todoFolderPath,
          localFolderPath: project?.localFolderPath
        })
      });
    }
    fetchData();
    alert('Selected TODOs permanently deleted!');
  };

  const restoreSelected = async () => {
    for (const id of selectedTodos) {
      const todo = todos.find(t => t.id === id);
      if (todo) {
        await fetch('/api/updatetodo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            todo: { ...todo, archivedAt: undefined },
            todoFolderPath: project?.todoFolderPath,
            localFolderPath: project?.localFolderPath
          })
        });
      }
    }
    fetchData();
    alert('Selected TODOs restored!');
  };

  useEffect(() => {
    fetchData();
  }, [project?.localFolderPath, project?.todoFolderPath]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-cyan-500" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col min-h-[600px]">
    <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
          <ListTodo className="text-cyan-500" size={24} />
          <h2 className="text-xl font-bold">TODO Manager</h2>
        </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => { setShowArchived(false); handleTabChange('list'); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'list' && !showArchived ? 'bg-white dark:bg-slate-700 text-cyan-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Task List
            </button>
            <button
              onClick={() => { setShowArchived(true); handleTabChange('list'); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'list' && showArchived ? 'bg-white dark:bg-slate-700 text-cyan-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Archive
            </button>
            <button
              onClick={() => handleTabChange('file')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'file' ? 'bg-white dark:bg-slate-700 text-cyan-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              View Source Files
            </button>
          </div>
      </div>
        <div className="flex items-center gap-3">
          {activeTab === 'list' && selectedTodos.length > 0 && (
            <>
              {!showArchived ? (
                <button onClick={archiveSelected} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md shadow-sm transition-colors">
                  <Archive size={16} />
                  Archive ({selectedTodos.length})
                </button>
              ) : (
                <>
                  <button onClick={restoreSelected} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-sm transition-colors">
                    <RotateCcw size={16} />
                    Restore ({selectedTodos.length})
                  </button>
                  <button onClick={deleteSelectedPermanently} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md shadow-sm transition-colors">
                    <Trash size={16} />
                    Delete Permanently ({selectedTodos.length})
                  </button>
                </>
              )}
            </>
          )}
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md transition-colors"
            title="Sync items between files and database"
          >
            <GitBranch size={16} />
            <span>Sync</span>
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md transition-colors"
          >
            <Settings2 size={16} />
            <span>Settings</span>
          </button>
          <button 
            onClick={() => setIsAddModuleOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md shadow-sm transition-colors"
          >
            <FolderPlus size={16} />
            <span>Create Module</span>
          </button>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {activeTab === 'file' ? (
        <div className="flex-1 flex flex-col gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6 overflow-hidden">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active Module: </span>
            <select 
              value={selectedFileModule} 
              onChange={e => { 
                setSelectedFileModule(e.target.value); 
                fetchGlobalFile(e.target.value); 
              }}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm rounded-md px-3 py-1.5 focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value="">Main Module (TODO.md)</option>
              {modules.map(c => <option key={c} value={c}>{`Module: ${c} (todo-${c}.md)`}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800">
            <pre className="font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre-wrap">
              {globalFileContent || 'Loading file...'}
            </pre>
          </div>
        </div>
      ) : todos.filter(t => showArchived ? !!t.archivedAt : !t.archivedAt).length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          {showArchived ? 'Archive is empty.' : 'No active tasks found. Create one to get started!'}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <input 
              type="checkbox"
              checked={selectedTodos.length === todos.filter(t => showArchived ? !!t.archivedAt : !t.archivedAt).length && todos.filter(t => showArchived ? !!t.archivedAt : !t.archivedAt).length > 0}
              onChange={() => {
                const currentTodos = todos.filter(t => showArchived ? !!t.archivedAt : !t.archivedAt);
                if (selectedTodos.length === currentTodos.length) {
                  setSelectedTodos([]);
                } else {
                  setSelectedTodos(currentTodos.map(t => t.id));
                }
              }}
              className="w-4 h-4 text-cyan-600 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Select All {showArchived ? '(Archived)' : ''}</span>
          </div>
          {todos.filter(t => showArchived ? !!t.archivedAt : !t.archivedAt).map(todo => {
            const isSelected = selectedTodos.includes(todo.id);
            const isShrunk = shrunkTodos.includes(todo.id);
            const isCompleted = todo.status === 'done' || todo.status === 'completed' || todo.status === 'Done';
            const isFailed = todo.status === 'failed';
            
            const lowerType = todo.type.toLowerCase();
            const style = lowerType.includes('backend') ? BASE_CATEGORIES.backend :
                          lowerType.includes('design') || lowerType.includes('ui') ? BASE_CATEGORIES.design :
                          BASE_CATEGORIES.frontend;
            
            const Icon = style.icon;
            
            const bgClass = isShrunk 
              ? (isFailed ? 'bg-white dark:bg-slate-950/30 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-slate-950/30 border-emerald-200 dark:border-emerald-900/30')
              : (isFailed ? 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10' : `${style.border} bg-white dark:bg-slate-900/40`);

            return (
              <TodoItem 
                key={todo.id}
                todo={todo}
                isSelected={isSelected}
                isShrunk={isShrunk}
                isEditing={editingTodoId === todo.id}
                statuses={statuses}
                types={types}
                collections={modules}
                contributors={contributors}
                project={project}
                onToggleShrink={() => toggleShrink(todo.id)}
                onToggleSelect={() => toggleTodo(todo.id)}
                onStartEdit={() => setEditingTodoId(todo.id)}
                onCancelEdit={() => setEditingTodoId(null)}
                onUpdate={async (updated) => {
                  try {
                    await fetch('/api/updatetodo', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        todo: updated,
                        todoFolderPath: project?.todoFolderPath,
                        localFolderPath: project?.localFolderPath
                      })
                    });
                    
                    // Sync back to project step if exists
                    if (updated.timelineId && project && onUpdateProject) {
                      const updateRecursively = (steps: any[]): any[] => steps.map(s => {
                        if (s.id === updated.timelineId) {
                          return { 
                            ...s, 
                            status: updated.status === 'Done' || updated.status === 'Completed' || updated.status === 'completed' ? 'completed' : 'pending' 
                          };
                        }
                        if (s.subSteps) return { ...s, subSteps: updateRecursively(s.subSteps) };
                        return s;
                      });
                      onUpdateProject({ ...project, steps: updateRecursively(project.steps) });
                    }

                    setEditingTodoId(null);
                    fetchData();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                onViewFile={() => viewFile(todo)}
                onGoToTimeline={handleGoToTimeline}
              />
            );
          })}
        </div>
      )}

      {isSettingsOpen && (
        <TodoSettingsModal 
          onClose={() => setIsSettingsOpen(false)} 
          statuses={statuses} 
          types={types} 
          collections={modules}
          contributors={contributors} 
          developers={developers} 
          onUpdated={fetchData} 
        />
      )}
      
      {isAddOpen && (
        <AddTodoModal 
          onClose={() => setIsAddOpen(false)} 
          statuses={statuses} 
          types={types} 
          collections={modules}
          contributors={contributors} 
          onAdded={fetchData} 
          todoFolderPath={project?.todoFolderPath}
          localFolderPath={project?.localFolderPath}
        />
      )}

      {isAddModuleOpen && (
        <AddModuleModal 
          onClose={() => setIsAddModuleOpen(false)} 
          existingModules={modules}
          onAdded={fetchData} 
        />
      )}

      {viewFileContent && (
        <ViewFileModal
          title={viewFileTitle}
          content={viewFileContent}
          onClose={() => setFileViewContent(null)}
        />
      )}
    </div>
  );
}

function SubTaskRow({ subtask, onUpdate, onDelete }: { key?: React.Key, subtask: Subtask, onUpdate: (s: Subtask) => void, onDelete: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(subtask.text);

  useEffect(() => {
    setText(subtask.text);
  }, [subtask.text]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-left-2 duration-200">
        <div className="flex items-center gap-2 flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border-2 border-cyan-500 rounded-md text-sm shadow-lg">
          <input 
            type="checkbox" 
            className="rounded border-slate-300 text-cyan-500 cursor-pointer" 
            checked={subtask.completed} 
            onChange={(e) => onUpdate({...subtask, completed: e.target.checked})} 
          />
          <input 
            value={text} 
            onChange={e => setText(e.target.value)}
            onBlur={() => { setIsEditing(false); if (text !== subtask.text) onUpdate({...subtask, text}); }}
            onKeyDown={e => { 
              if (e.key === 'Enter') { setIsEditing(false); onUpdate({...subtask, text}); }
              if (e.key === 'Escape') { setIsEditing(false); setText(subtask.text); }
            }}
            className="bg-transparent border-0 flex-1 p-0 focus:ring-0 text-slate-700 dark:text-slate-200 cursor-text outline-none"
            autoFocus
          />
        </div>
        <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash size={16}/></button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 w-full">
       <div 
         className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${subtask.completed ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}
         onClick={() => onUpdate({...subtask, completed: !subtask.completed})}
       >
         {subtask.completed ? (
           <CheckCircle2 size={16} className="mt-0.5 text-emerald-500 shrink-0" />
         ) : (
           <Circle size={16} className="mt-0.5 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-cyan-500 transition-colors" />
         )}
         <div className="flex-1 flex items-center justify-between min-w-0">
           <span 
             onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
             className={`text-sm leading-relaxed transition-all truncate ${subtask.completed ? 'text-slate-500 dark:text-slate-400 line-through opacity-80' : 'text-slate-700 dark:text-slate-200'}`}
           >
             {subtask.text}
           </span>
           <button 
             onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
             className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-cyan-500 transition-all"
           >
             <Edit2 size={12} />
           </button>
         </div>
       </div>
    </div>
  );
}

function TodoItem({ 
  todo, isSelected, isShrunk, isEditing, statuses, types, collections: modules, contributors, project,
  onToggleShrink, onToggleSelect, onStartEdit, onCancelEdit, onUpdate, onViewFile, onGoToTimeline
}: { 
  key?: React.Key,
  todo: Todo, isSelected: boolean, isShrunk: boolean, isEditing: boolean, 
  statuses: string[], types: string[], collections: string[], contributors: Contributor[], project?: Project,
  onToggleShrink: () => void, onToggleSelect: () => void, onStartEdit: () => void, 
  onCancelEdit: () => void, onUpdate: (t: Todo) => void, onViewFile: () => void, onGoToTimeline?: (id: string) => void
}) {
  const [formData, setFormData] = useState<Todo>(todo);
  const [newSubtask, setNewSubtask] = useState('');
  const [isGeneratingCommit, setIsGeneratingCommit] = useState(false);

  useEffect(() => {
    if (isEditing) setFormData(todo);
  }, [isEditing, todo]);

  const handleGenerateCommit = async () => {
    setIsGeneratingCommit(true);
    try {
      const res = await fetch('/api/generate-commit-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todo: formData })
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ ...formData, commitMessage: data.message });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingCommit(false);
    }
  };

  const isCompleted = todo.status === 'done' || todo.status === 'completed' || todo.status === 'Done';
  const isFailed = todo.status === 'failed';
  const lowerType = todo.type.toLowerCase();
  const style = lowerType.includes('backend') ? BASE_CATEGORIES.backend :
                lowerType.includes('design') || lowerType.includes('ui') ? BASE_CATEGORIES.design :
                BASE_CATEGORIES.frontend;
  const Icon = style.icon;

  const bgClass = isShrunk 
    ? (isFailed ? 'bg-white dark:bg-slate-950/30 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-slate-950/30 border-emerald-200 dark:border-emerald-900/30')
    : (isFailed ? 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10' : `${style.border} bg-white dark:bg-slate-900/40`);

  if (isEditing) {
    return (
      <div id={`todo-${todo.id}`} className={`relative rounded-xl border-2 border-cyan-500 shadow-xl bg-white dark:bg-slate-900 p-6 transition-all duration-300`}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
             <div className="flex items-center gap-3 flex-1">
               <span className="font-mono text-xs text-slate-400">[{todo.id}]</span>
               <input 
                 value={formData.title} 
                 onChange={e => setFormData({...formData, title: e.target.value})}
                 className="flex-1 text-lg font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1 focus:ring-2 focus:ring-cyan-500 shadow-inner"
                 placeholder="Title..."
                 autoFocus
               />
             </div>
             <div className="flex items-center gap-2">
               <button 
                 onClick={onViewFile}
                 className="p-2 text-slate-400 hover:text-cyan-500 transition-colors"
                 title="View Written File"
               >
                 <ListTodo size={20} />
               </button>
               <button onClick={onCancelEdit} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                 <X size={20} />
               </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm">
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Assignee</label>
              <select value={formData.assign} onChange={e => setFormData({...formData, assign: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm transition-colors focus:ring-2 focus:ring-cyan-500">
                <option value="Unassigned">Unassigned</option>
                {contributors.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Module</label>
              <select value={formData.collection || ''} onChange={e => setFormData({...formData, collection: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm transition-colors focus:ring-2 focus:ring-cyan-500">
                <option value="">None (TODO.md)</option>
                {modules.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
             <div className="flex items-center justify-between mb-1">
               <label className="block text-[10px] uppercase font-bold text-slate-500 text-cyan-600">Commit message (Optional)</label>
               <button 
                 onClick={handleGenerateCommit}
                 disabled={isGeneratingCommit}
                 className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-600 hover:text-cyan-500 transition-colors disabled:opacity-50"
               >
                 {isGeneratingCommit ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                 <span>AI Suggest</span>
               </button>
             </div>
             <input value={formData.commitMessage} onChange={e => setFormData({...formData, commitMessage: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-mono shadow-sm focus:ring-2 focus:ring-cyan-500" placeholder="feat(scope): message" />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Description</label>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm resize-none shadow-sm focus:ring-2 focus:ring-cyan-500"
              placeholder="Description..."
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Subtasks</label>
            <div className="space-y-2 mb-3">
              {(formData.subtask || []).map((st, i) => (
                <div key={i} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center gap-2 flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm shadow-inner group">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-cyan-500 cursor-pointer" 
                      checked={st.completed} 
                      onChange={(e) => {
                        const next = [...(formData.subtask || [])];
                        next[i].completed = e.target.checked;
                        setFormData({...formData, subtask: next});
                      }} 
                    />
                    <input 
                      value={st.text} 
                      onChange={e => {
                        const next = [...(formData.subtask || [])];
                        next[i].text = e.target.value;
                        setFormData({...formData, subtask: next});
                      }}
                      className="bg-transparent border-0 flex-1 p-0 focus:ring-0 text-slate-700 dark:text-slate-200 cursor-text"
                    />
                  </div>
                  <button onClick={() => setFormData({...formData, subtask: (formData.subtask || []).filter((_, idx) => idx !== i)})} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash size={16}/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (newSubtask.trim()) { setFormData({...formData, subtask: [...(formData.subtask || []), {text: newSubtask.trim(), completed: false}]}); setNewSubtask(''); } } }} placeholder="Add subtask..." className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm focus:ring-2 focus:ring-cyan-500" />
              <button onClick={() => { if(newSubtask.trim()) { setFormData({...formData, subtask: [...(formData.subtask || []), {text: newSubtask.trim(), completed: false}]}); setNewSubtask(''); } }} className="px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors shadow-sm"><Plus size={16} /></button>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
             <button onClick={onCancelEdit} className="px-4 py-2 text-sm font-bold uppercase text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
             <button onClick={() => {
               let finalData = formData;
               if (newSubtask.trim()) {
                 finalData = {
                   ...formData,
                   subtask: [...(formData.subtask || []), {text: newSubtask.trim(), completed: false}]
                 };
                 setFormData(finalData);
                 setNewSubtask('');
               }
               onUpdate(finalData);
             }} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-md font-bold uppercase text-sm transition-colors flex items-center gap-2">
               <Save size={16} /> Save Changes
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={`todo-${todo.id}`} className={`relative rounded-xl border transition-all duration-300 ${bgClass} ${isShrunk ? 'p-3 sm:p-4' : 'p-6 sm:p-7'} hover:bg-slate-50 dark:hover:bg-slate-900/60 group ${isSelected ? 'ring-2 ring-cyan-500' : ''}`}>
      {isShrunk ? (
        <div className="flex items-center justify-between cursor-pointer group/shrunk" onClick={onToggleShrink}>
          <div className="flex items-center gap-4">
              <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-900 border ${isFailed ? 'border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-500' : 'border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-500'}`}><Icon size={16} /></div>
              <h3 className={`text-sm font-bold text-slate-500 dark:text-slate-400 line-through ${isFailed ? 'decoration-red-500 dark:decoration-red-900' : 'decoration-slate-300 dark:decoration-slate-700'}`}>{todo.title}</h3>
              <div className={`hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${isFailed ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/30' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30'}`}>
                {isCompleted ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                <span>{todo.status}</span>
              </div>
          </div>
          <Maximize2 size={16} className="text-slate-400 group-hover/shrunk:text-cyan-500 transition-colors" />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-1 group/title">
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={onToggleSelect}
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-xs text-slate-400 cursor-default">[{todo.id}]</span>
                <h3 
                  className={`text-lg font-bold ${isFailed ? 'text-red-500' : 'text-slate-900 dark:text-white'} cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400`} 
                  onClick={onStartEdit}
                >
                  {todo.title}
                </h3>
                <button onClick={onStartEdit} className="opacity-0 group-hover/title:opacity-100 text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-opacity">
                  <Edit2 size={14} />
                </button>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.badgeBorder}`}>
                  {todo.type}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative group/status">
                  <select 
                    value={todo.status} 
                    onChange={e => onUpdate({...todo, status: e.target.value})}
                    className={`appearance-none bg-transparent border-0 p-0 pr-4 text-xs font-bold uppercase cursor-pointer hover:opacity-80 focus:ring-0 ${isCompleted ? 'text-emerald-600 dark:text-emerald-500' : isFailed ? 'text-red-600 dark:text-red-500' : 'text-cyan-600 dark:text-cyan-500'}`}
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/status:opacity-100 transition-opacity">
                    <Edit2 size={10} className={isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-cyan-400'} />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono ml-2 border-l pl-2 border-slate-200 dark:border-slate-800">
                  <Layout size={10} />
                  <select 
                    value={todo.collection || ''} 
                    onChange={e => onUpdate({...todo, collection: e.target.value})}
                    className="appearance-none bg-transparent border-0 p-0 pr-4 text-[10px] font-mono cursor-pointer hover:opacity-80 focus:ring-0"
                  >
                    <option value="">Move to Module...</option>
                    {modules.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono ml-2 border-l pl-2 border-slate-200 dark:border-slate-800">
                  <Calendar size={10} />
                  {todo.date}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono ml-2 border-l pl-2 border-slate-200 dark:border-slate-800">
                  <User size={10} />
                  {todo.assign}
                </div>
                {todo.archivedAt && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono ml-2 border-l pl-2 border-slate-200 dark:border-slate-800">
                    <Archive size={10} />
                    Archived: {new Date(todo.archivedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <button 
                onClick={onViewFile}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="View Written File"
              >
                <ListTodo size={18} />
              </button>
              <button 
                onClick={onToggleShrink}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title={isShrunk ? "Expand Task" : "Fold Task"}
              >
                {isShrunk ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
              <div className={`p-2 rounded-lg bg-white dark:bg-slate-950 border ${style.border} ${style.text}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
          
          <div className="flex-grow flex flex-col gap-6">
            <div 
              className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded p-1 -m-1 transition-colors"
              onClick={onStartEdit}
            >
              {todo.description}
            </div>
            
            {todo.commitMessage && (
              <div className="mt-2 text-xs font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2 rounded-lg inline-flex items-center gap-2 border border-cyan-100 dark:border-cyan-800/50">
                <GitCommit size={14} />
                <span>{todo.commitMessage}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2">
              {todo.timelineId && onGoToTimeline && (
                <button
                  onClick={() => onGoToTimeline(todo.timelineId!)}
                  className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800/50 transition-colors inline-flex"
                >
                  <Layout size={14} />
                  <span>View Linked Timeline Step</span>
                </button>
              )}
            </div>

            {todo.subtask && (
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                     <GitBranch size={12} /> Sub-Tasks
                  </h4>
                </div>
                <div className="space-y-2">
                  {todo.subtask.filter(st => st.text.trim().length > 0).map((st, i) => (
                    <SubTaskRow 
                      key={i} 
                      subtask={st} 
                      onUpdate={(updatedSub) => {
                        const nextSubtasks = [...todo.subtask];
                        nextSubtasks[i] = updatedSub;
                        onUpdate({ ...todo, subtask: nextSubtasks });
                      }}
                      onDelete={() => {
                        const nextSubtasks = todo.subtask.filter((_, idx) => idx !== i);
                        onUpdate({ ...todo, subtask: nextSubtasks });
                      }}
                    />
                  ))}
                  <div className="flex gap-2">
                    <input 
                      value={newSubtask} 
                      onChange={e => setNewSubtask(e.target.value)} 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' && newSubtask.trim()) { 
                          onUpdate({...todo, subtask: [...(todo.subtask || []), {text: newSubtask.trim(), completed: false}]}); 
                          setNewSubtask(''); 
                        } 
                      }} 
                      placeholder="Quick add subtask..." 
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs shadow-sm focus:ring-1 focus:ring-cyan-500 outline-none" 
                    />
                    <button 
                      onClick={() => { 
                        if(newSubtask.trim()) { 
                          onUpdate({...todo, subtask: [...(todo.subtask || []), {text: newSubtask.trim(), completed: false}]}); 
                          setNewSubtask(''); 
                        } 
                      }} 
                      className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
