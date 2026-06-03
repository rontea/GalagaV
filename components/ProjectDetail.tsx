
import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import { Project, Step, GlobalConfig, PluginConfig } from '../types';
import ConfirmModal from './ConfirmModal';
import SettingsModal from './SettingsModal';
import PluginView from './PluginView';
import ProjectSettingsModal from './ProjectSettingsModal';
import ArchitectView from './ArchitectView';
import TodoManagerView from '../src/frontend/components/TodoManagerView';
import TerminalView from '../src/frontend/components/TerminalView';
import { Layout, Plus, AppWindow, Blocks, Database, BookOpen, X, CheckSquare, Terminal } from 'lucide-react';
import { BASE_CATEGORIES, BASE_STATUSES, createCategoryStyle, copyToClipboard } from '../lib/ui-constants';
import { ProjectBrief } from './ProjectBrief';
import { TimelineStepCard } from './TimelineStepCard';
import { ArchivedTasks } from './ArchivedTasks';
import { FocusedStepView } from './FocusedStepView';
import { SnippetLibrary } from './SnippetLibrary';
import { CommitizenModal } from './CommitizenModal';
import { GitHistoryModal } from './GitHistoryModal';

interface ProjectDetailProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onDeleteProject: (id: string) => void;
  onBack: () => void;
  globalConfig: GlobalConfig;
  onUpdateGlobalConfig: (config: GlobalConfig) => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: 'core' | 'step' | 'plugin';
  color: string;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ 
  project, onUpdateProject, onDeleteProject, onBack, globalConfig, onUpdateGlobalConfig
}) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [targetTodoId, setTargetTodoId] = useState<string | undefined>(undefined);
  const [hiddenCoreTabs, setHiddenCoreTabs] = useState<string[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Step>>({});
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [focusedEditing, setFocusedEditing] = useState(false);
  const [focusedForm, setFocusedForm] = useState<Step | null>(null);
  const [commitStep, setCommitStep] = useState<Step | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [expandedCompletedSteps, setExpandedCompletedSteps] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{ id: string; type: 'gap' | 'card'; position?: 'before' | 'after' } | null>(null);
  const [draggedSubTask, setDraggedSubTask] = useState<{ parentId: string; index: number } | null>(null);
  const [dragTargetSubTask, setDragTargetSubTask] = useState<{ parentId: string; index: number } | null>(null);
  
  // Tab Drag and Drop State
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => { setFocusedEditing(false); setFocusedForm(null); }, [activeTab]);

  const allCategories = useMemo(() => {
    const cats = { ...BASE_CATEGORIES };
    project.categories?.forEach(c => { cats[c.key] = createCategoryStyle(c.color, Layout); });
    return cats;
  }, [project.categories]);

  const allStatuses = useMemo(() => {
    const statuses = { ...BASE_STATUSES };
    project.statuses?.forEach(s => { statuses[s.key] = s; });
    return statuses;
  }, [project.statuses]);

  const activeSteps = project.steps.filter(s => !s.archivedAt && s.id !== 'architect_schema_data');
  const archivedSteps = project.steps.filter(s => s.archivedAt);
  const tabSteps = activeSteps.filter(s => s.isTab);
  const hasArchitect = project.steps.some(s => s.id === 'architect_schema_data');
  const enabledToolPlugins = (globalConfig.plugins || []).filter(p => p.enabled && p.manifest.type !== 'theme');

  // --- TAB REORDERING LOGIC ---

  const orderedTabs = useMemo(() => {
    const coreTabs: TabItem[] = [
      { id: 'timeline', label: 'Timeline', icon: <Layout size={14} />, type: 'core', color: 'cyan' }
    ];
    if (!hiddenCoreTabs.includes('snippets')) {
      coreTabs.push({ id: 'snippets', label: 'Snippets', icon: <BookOpen size={14} />, type: 'core', color: 'indigo' });
    }
    if (hasArchitect && !hiddenCoreTabs.includes('architect')) {
      coreTabs.push({ id: 'architect', label: 'Architect', icon: <Database size={14} />, type: 'core', color: 'indigo' });
    }
    if (!hiddenCoreTabs.includes('todos')) {
      coreTabs.push({ id: 'todos', label: 'TODO Manager', icon: <CheckSquare size={14} />, type: 'core', color: 'emerald' });
    }

    const stepTabs: TabItem[] = tabSteps.map(s => ({
      id: s.id, label: s.title || 'Untitled', icon: <AppWindow size={14} />, type: 'step', color: 'amber'
    }));

    const pluginTabs: TabItem[] = enabledToolPlugins.map(p => ({
      id: p.id, label: p.manifest?.name || p.id, icon: <Blocks size={14} />, type: 'plugin', color: 'indigo'
    }));

    const allAvailable = [...coreTabs, ...stepTabs, ...pluginTabs];
    
    // Sort based on project.tabOrder if it exists
    if (project.tabOrder && project.tabOrder.length > 0) {
      const orderMap = new Map<string, number>(project.tabOrder.map((id, index) => [id, index]));
      return allAvailable.sort((a, b) => {
        const indexA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : 999;
        const indexB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : 999;
        return indexA - indexB;
      });
    }

    return allAvailable;
  }, [hasArchitect, tabSteps, enabledToolPlugins, project.tabOrder]);

  const handleTabDragStart = (id: string) => {
    setDraggedTabId(id);
  };

  const handleTabDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedTabId === id) return;
    setDragOverTabId(id);
  };

  const handleTabDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      return;
    }

    const currentOrder = orderedTabs.map(t => t.id);
    const fromIndex = currentOrder.indexOf(draggedTabId);
    const toIndex = currentOrder.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const newOrder = [...currentOrder];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      
      onUpdateProject({ ...project, tabOrder: newOrder });
    }

    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  // --- STANDARD HANDLERS ---

  const handleEditClick = (step: Step) => {
    setEditingStepId(step.id);
    setEditFormData({ ...step });
    if (expandedCompletedSteps[step.id] === false) toggleCompletedStep(step.id);
  };
  
  const handleCancelEdit = () => {
    setEditingStepId(null);
    setEditFormData({});
  };

  const handleSaveStep = () => {
    if (!editingStepId) return;
    const finalData = { ...editFormData } as Step;
    if (!finalData.title?.trim()) finalData.title = "Untitled Task";
    if (!finalData.createdAt) finalData.createdAt = Date.now();
    
    // Auto-shrink if completed/failed
    if (finalData.status === 'completed' || finalData.status === 'failed') {
      setExpandedCompletedSteps(p => ({ ...p, [editingStepId]: false }));
    }

    onUpdateProject({ ...project, steps: project.steps.map(s => s.id === editingStepId ? { ...s, ...finalData } : s) });
    
    // Auto-sync to Todo if linked
    if (finalData.todoId) {
      handleGenerateToTodo(finalData);
    }
    
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
    setConfirmModal({ isOpen: true, title: "Archive Task?", message: "Archive this task?", isDanger: false, onConfirm: () => {
      onUpdateProject({ ...project, steps: project.steps.map(s => s.id === stepId ? { ...s, archivedAt: Date.now() } : s) });
      if (activeTab === stepId) setActiveTab('timeline');
      setConfirmModal(null);
    }});
  };

  const handleDuplicateStep = (stepId: string) => {
    const idx = project.steps.findIndex(s => s.id === stepId);
    if (idx === -1) return;
    const original = project.steps[idx];
    
    const cloneStep = (step: Step): Step => {
      const timestamp = Date.now() + Math.floor(Math.random() * 1000);
      return {
        ...step,
        id: `step_${timestamp}`,
        history: [], 
        subSteps: step.subSteps ? step.subSteps.map(ss => cloneStep(ss)) : []
      };
    };

    const newStep: Step = { 
      ...cloneStep(original), 
      title: `${original.title} (Copy)`, 
      isTab: false, 
      createdAt: Date.now() 
    };

    const updated = [...project.steps];
    updated.splice(idx + 1, 0, newStep);
    onUpdateProject({ ...project, steps: updated });
  };

  const handleToggleTab = (stepId: string) => {
    const updatedSteps = project.steps.map(s => s.id === stepId ? { ...s, isTab: !s.isTab } : s);
    onUpdateProject({ ...project, steps: updatedSteps });
    if (!project.steps.find(s => s.id === stepId)?.isTab) {
      setActiveTab(stepId);
    }
  };

  const handleLinkTodoToStep = (stepId: string, todoId: string) => {
    const updateRecursively = (steps: Step[]): Step[] => steps.map(s => {
      if (s.id === stepId) return { ...s, todoId };
      if (s.subSteps) return { ...s, subSteps: updateRecursively(s.subSteps) };
      return s;
    });
    onUpdateProject({ ...project, steps: updateRecursively(project.steps) });
  };

  const handleNavigateToTodo = (todoId: string) => {
    setTargetTodoId(todoId);
    if (activeTab !== 'todos') {
      setActiveTab('todos');
    }
  };

  const handleAddSubStep = (parentId: string) => {
    const newSub: Step = { id: `sub_${Date.now()}_${Math.floor(Math.random()*1000)}`, title: '', category: 'frontend', status: 'pending', content: '', subSteps: [], createdAt: Date.now() };
    const addRecursively = (steps: Step[]): Step[] => steps.map(s => {
      if (s.id === parentId) return { ...s, subSteps: [...(s.subSteps || []), newSub] };
      if (s.subSteps) return { ...s, subSteps: addRecursively(s.subSteps) };
      return s;
    });
    onUpdateProject({ ...project, steps: addRecursively(project.steps) });
  };

  const handlePromoteSubStep = (parentId: string, idx: number) => {
    const updated = [...project.steps];
    const findAndRemove = (steps: Step[]): { steps: Step[], removed: Step | null } => {
      let removed: Step | null = null;
      const newSteps = steps.map(s => {
        if (s.id === parentId && s.subSteps) {
          const subs = [...s.subSteps];
          [removed] = subs.splice(idx, 1);
          return { ...s, subSteps: subs };
        }
        if (s.subSteps) {
          const res = findAndRemove(s.subSteps);
          if (res.removed) removed = res.removed;
          return { ...s, subSteps: res.steps };
        }
        return s;
      });
      return { steps: newSteps, removed };
    };

    const { steps: cleanedSteps, removed } = findAndRemove(updated);
    if (removed) {
      const rootPIdx = cleanedSteps.findIndex(s => s.id === parentId);
      if (rootPIdx !== -1) cleanedSteps.splice(rootPIdx + 1, 0, removed);
      else cleanedSteps.push(removed); 
      onUpdateProject({ ...project, steps: cleanedSteps });
    }
  };

  const handleDeleteSubStep = (parentId: string, idx: number) => {
    setConfirmModal({ isOpen: true, title: "Delete?", message: "Delete sub-task?", isDanger: true, onConfirm: () => {
        const deleteRecursively = (steps: Step[]): Step[] => steps.map(s => {
          if (s.id === parentId && s.subSteps) {
            const subs = [...s.subSteps];
            subs.splice(idx, 1);
            return { ...s, subSteps: subs };
          }
          if (s.subSteps) return { ...s, subSteps: deleteRecursively(s.subSteps) };
          return s;
        });
        onUpdateProject({ ...project, steps: deleteRecursively(project.steps) });
        setConfirmModal(null);
    }});
  };

  const handleUpdateSubStep = (parentId: string, idx: number, updatedSub: Step) => {
    let affectedParent: Step | null = null;
    const updateRecursively = (steps: Step[]): Step[] => steps.map(s => {
      if (s.id === parentId && s.subSteps) {
        const newSubs = [...s.subSteps];
        newSubs[idx] = updatedSub;
        affectedParent = { ...s, subSteps: newSubs };
        return affectedParent;
      }
      if (s.subSteps) return { ...s, subSteps: updateRecursively(s.subSteps) };
      return s;
    });
    
    const newSteps = updateRecursively(project.steps);
    onUpdateProject({ ...project, steps: newSteps });
    
    if (affectedParent && (affectedParent as Step).todoId) {
      handleGenerateToTodo(affectedParent);
    }
  };

  const toggleHistory = (id: string) => setExpandedHistory(p => ({ ...p, [id]: !p[id] }));
  const toggleCompletedStep = (id: string) => setExpandedCompletedSteps(p => ({ ...p, [id]: !p[id] }));
  
  const handleQuickStatusUpdate = (id: string, status: string) => {
    let affectedStep: Step | null = null;
    const updateRecursively = (steps: Step[]): Step[] => steps.map(s => {
      if (s.id === id) {
        if (status === 'completed' || status === 'failed') {
          setExpandedCompletedSteps(p => ({ ...p, [id]: false }));
        }
        affectedStep = { ...s, status };
        return affectedStep;
      }
      if (s.subSteps) return { ...s, subSteps: updateRecursively(s.subSteps) };
      return s;
    });
    
    const newSteps = updateRecursively(project.steps);
    onUpdateProject({ ...project, steps: newSteps });
    
    if (affectedStep && (affectedStep as Step).todoId) {
      handleGenerateToTodo(affectedStep);
    }
  };

  const [loadingStepToTodo, setLoadingStepToTodo] = useState<string | null>(null);

  const handleSmartCopy = async (s: Step) => { if (await copyToClipboard(s.content)) { setCopiedStepId(s.id); setTimeout(() => setCopiedStepId(null), 2000); } };
  const updateField = (field: keyof Step, val: any) => setEditFormData(p => ({ ...p, [field]: val }));
  
  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => updateField('imageUrl', evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpdateNote = (id: string, note: string) => {
    const updateRecursively = (steps: Step[]): Step[] => steps.map(s => {
      if (s.id === id) return { ...s, notes: note };
      if (s.subSteps) return { ...s, subSteps: updateRecursively(s.subSteps) };
      return s;
    });
    onUpdateProject({ ...project, steps: updateRecursively(project.steps) });
  };

  const handleGenerateToTodo = async (step: Step) => {
    if (loadingStepToTodo === step.id) return;
    const isUpdating = !!step.todoId;
    
    setConfirmModal({
      isOpen: true,
      title: isUpdating ? "Update TODO" : "Add to TODO",
      message: `Are you sure you want to ${isUpdating ? 'update' : 'add'} "${step.title || 'this step'}" ${isUpdating ? 'in' : 'to'} the TODO file?`,
      confirmLabel: "Proceed",
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingStepToTodo(step.id);
        try {
          const subtaskArray = step.subSteps?.map(s => ({
            text: s.title,
            completed: s.status === 'completed' || s.status === 'success'
          })) || [];
          const payload = {
            id: step.todoId,
            title: step.title || 'Untitled',
            description: step.content.replace(/<[^>]*>/g, '').trim() || '',
            type: step.category || 'feat',
            status: step.status === 'completed' ? 'Done' : 'To Do',
            assign: 'Unassigned',
            subtask: subtaskArray,
            comments: '',
            todoFolderPath: project.todoFolderPath,
            localFolderPath: project.localFolderPath,
            timelineId: step.id
          };

          const endpoint = isUpdating ? '/api/updatetodo' : '/api/addtodo';
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          let data;
          try {
            data = await res.json();
          } catch (err) {
            console.error('Failed to parse response as JSON. Server might have returned HTML (e.g. 413 Payload Too Large or 502 Bad Gateway). Status:', res.status, res.statusText);
            setToastMessage({ message: 'Server error parsing response.', type: 'error' });
            setTimeout(() => setToastMessage(null), 3000);
            return;
          }

          if (data.success && !isUpdating && data.todo?.id) {
            const updateRecursively = (steps: Step[]): Step[] => steps.map(s => {
              if (s.id === step.id) return { ...s, todoId: data.todo.id };
              if (s.subSteps) return { ...s, subSteps: updateRecursively(s.subSteps) };
              return s;
            });
            onUpdateProject({ ...project, steps: updateRecursively(project.steps) });
          }
          
          if (data.success) {
            setToastMessage({ message: `Successfully ${isUpdating ? 'updated' : 'added'} to TODO file.`, type: 'success' });
            setTimeout(() => setToastMessage(null), 3000);
          } else {
            const errorMsg = data.message || data.error || 'Failed to process request';
            setToastMessage({ message: `Error: ${errorMsg}`, type: 'error' });
            setTimeout(() => setToastMessage(null), 3000);
          }
        } catch (err) {
          console.error('Failed to generate to todo', err);
          setToastMessage({ message: 'Network or internal error occurred.', type: 'error' });
          setTimeout(() => setToastMessage(null), 3000);
        } finally {
          setLoadingStepToTodo(null);
        }
      }
    });
  };

  const handleInitializeArchitect = () => {
    const SCHEMA_STEP_ID = 'architect_schema_data';
    const exists = project.steps.some(s => s.id === SCHEMA_STEP_ID);
    if (exists) {
      setActiveTab('architect');
      return;
    }

    const newStep: Step = {
      id: SCHEMA_STEP_ID,
      title: 'Architect Schema Store',
      category: 'backend',
      status: 'completed',
      content: JSON.stringify({ tables: [], relationships: [] }),
      createdAt: Date.now()
    };
    
    onUpdateProject({ ...project, steps: [...project.steps, newStep] });
    setActiveTab('architect');
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragEnd = () => { setDraggedId(null); setDragTarget(null); };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === null && !draggedSubTask) return;
    if (draggedId === id) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Left section of the timeline is roughly the first 80px
    const isOverTimeline = x < 80;

    if (isOverTimeline || y < 25 || y > rect.height - 25) {
      const isBottom = y > rect.height / 2;
      setDragTarget({ id, type: 'gap', position: isBottom ? 'after' : 'before' });
    } else {
      setDragTarget({ id, type: 'card' });
    }
  };

  const handleDrop = (dropId: string) => {
    let newSteps = [...project.steps];
    
    if (draggedId !== null) {
        const draggedIdx = newSteps.findIndex(s => s.id === draggedId);
        const dropIdx = newSteps.findIndex(s => s.id === dropId);
        
        if (draggedIdx !== -1 && dropIdx !== -1) {
          const [moved] = newSteps.splice(draggedIdx, 1);
          
          if (dragTarget?.type === 'card') {
             const finalSteps = newSteps.map(s => 
               s.id === dropId ? { ...s, subSteps: [...(s.subSteps || []), moved] } : s
             );
             onUpdateProject({ ...project, steps: finalSteps });
          } else {
             const currentDropIdx = newSteps.findIndex(s => s.id === dropId);
             const insertIdx = dragTarget?.position === 'after' ? currentDropIdx + 1 : currentDropIdx;
             newSteps.splice(insertIdx, 0, moved);
             onUpdateProject({ ...project, steps: newSteps });
          }
        }
    } else if (draggedSubTask) {
        let moved: Step | null = null;
        const removeRecursive = (steps: Step[]): Step[] => steps.map(s => {
          if (s.id === draggedSubTask.parentId && s.subSteps) {
            const subs = [...s.subSteps];
            [moved] = subs.splice(draggedSubTask.index, 1);
            return { ...s, subSteps: subs };
          }
          if (s.subSteps) return { ...s, subSteps: removeRecursive(s.subSteps) };
          return s;
        });
        
        const cleanedSteps = removeRecursive(newSteps);
        
        if (moved) {
          if (dragTarget?.type === 'card') {
            const finalSteps = cleanedSteps.map(s => 
              s.id === dropId ? { ...s, subSteps: [...(s.subSteps || []), moved!] } : s
            );
            onUpdateProject({ ...project, steps: finalSteps });
          } else {
            // Gap drop - promote to main task
            const dropIdx = cleanedSteps.findIndex(s => s.id === dropId);
            const insertIdx = dragTarget?.position === 'after' ? dropIdx + 1 : dropIdx;
            cleanedSteps.splice(insertIdx, 0, moved);
            onUpdateProject({ ...project, steps: cleanedSteps });
          }
        }
    }
    
    setDraggedId(null); setDraggedSubTask(null); setDragTarget(null);
  };

  const subTaskDndHandlers = {
    draggedSubTask,
    dragTargetSubTask,
    handleSubTaskDragStart: (e: any, pid: string, i: number) => { e.stopPropagation(); setDraggedSubTask({parentId: pid, index: i}); },
    handleSubTaskDragOver: (e: any, pid: string, i: number) => { e.preventDefault(); setDragTargetSubTask({parentId: pid, index: i}); },
    handleSubTaskDrop: (e: any, pid: string, i: number) => { 
      e.preventDefault();
      if (!draggedSubTask) return;
      const updated = [...project.steps];
      let moved: Step | null = null;
      
      const removeRecursive = (steps: Step[]): Step[] => steps.map(s => {
        if (s.id === draggedSubTask.parentId && s.subSteps) {
          const subs = [...s.subSteps];
          [moved] = subs.splice(draggedSubTask.index, 1);
          return { ...s, subSteps: subs };
        }
        if (s.subSteps) return { ...s, subSteps: removeRecursive(s.subSteps) };
        return s;
      });
      
      const cleaned = removeRecursive(updated);
      const insertRecursive = (steps: Step[]): Step[] => steps.map(s => {
        if (s.id === pid) return { ...s, subSteps: [...(s.subSteps || []).slice(0, i), moved!, ...(s.subSteps || []).slice(i)] };
        if (s.subSteps) return { ...s, subSteps: insertRecursive(s.subSteps) };
        return s;
      });
      
      if (moved) onUpdateProject({...project, steps: insertRecursive(cleaned)});
      setDraggedSubTask(null); setDragTargetSubTask(null); 
    },
    handleSubTaskDragEnd: () => { setDraggedSubTask(null); setDragTargetSubTask(null); }
  };

  return (
    <div className="bg-slate-50 dark:bg-neutral-950 font-sans">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={globalConfig} onUpdateConfig={onUpdateGlobalConfig} />
      <ProjectSettingsModal isOpen={isProjectSettingsOpen} onClose={() => setIsProjectSettingsOpen(false)} project={project} onUpdateProject={onUpdateProject} globalConfig={globalConfig} />

      <div className="w-full mt-6">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 custom-scrollbar px-4 sm:px-6">
          {orderedTabs.map((tab) => (
            <button 
              key={tab.id}
              draggable
              onDragStart={() => handleTabDragStart(tab.id)}
              onDragOver={(e) => handleTabDragOver(e, tab.id)}
              onDrop={(e) => handleTabDrop(e, tab.id)}
              onClick={() => setActiveTab(tab.id)} 
              className={`
                group px-4 py-3 text-xs font-bold uppercase whitespace-nowrap border-b-2 transition-all cursor-grab active:cursor-grabbing
                ${activeTab === tab.id 
                  ? (tab.color === 'cyan' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 
                     tab.color === 'indigo' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 
                     tab.color === 'amber' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 
                     'border-cyan-500 text-cyan-600 dark:text-cyan-400') 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
                ${draggedTabId === tab.id ? 'opacity-50' : ''}
                ${dragOverTabId === tab.id ? 'border-dashed border-slate-400 dark:border-slate-600' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="pointer-events-none flex items-center gap-2">{tab.icon} {tab.label}</span>
                {(tab.type === 'step' || (tab.type === 'core' && tab.id !== 'timeline')) && (
                  <div 
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (tab.type === 'step') {
                        handleToggleTab(tab.id);
                      } else {
                        setHiddenCoreTabs(prev => [...prev, tab.id]);
                        if (activeTab === tab.id) setActiveTab('timeline');
                      }
                    }}
                  >
                    <X size={14} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <main className="w-full">
        {activeTab === 'architect' ? (
          <div className="px-2 sm:px-4 pb-4 h-[calc(100vh-100px)] min-h-[950px]">
            <ArchitectView project={project} onSave={onUpdateProject} theme={globalConfig.theme} />
          </div>
        ) : (
          <div className="px-4 sm:px-8 py-8">
            {activeTab === 'timeline' ? (
            <div className="space-y-8">
               <ProjectBrief 
                 project={project} 
                 onDeleteProject={onDeleteProject} 
                 onOpenSettings={() => setIsProjectSettingsOpen(true)} 
                 hasArchitect={hasArchitect}
                 isArchitectHidden={hiddenCoreTabs.includes('architect')}
                 onInitializeArchitect={() => {
                   setHiddenCoreTabs(prev => prev.filter(t => t !== 'architect'));
                   handleInitializeArchitect();
                 }}
                 onOpenSnippets={() => {
                   setHiddenCoreTabs(prev => prev.filter(t => t !== 'snippets'));
                   setActiveTab('snippets');
                 }}
                 onOpenTodos={() => {
                   setHiddenCoreTabs(prev => prev.filter(t => t !== 'todos'));
                   setActiveTab('todos');
                 }}
                 onOpenTerminal={() => {
                   setIsTerminalOpen(true);
                 }}
                 onOpenCommit={() => {
                   setCommitStep({ id: 'repo-commit', title: 'Commit differences' } as any);
                 }}
                 onOpenHistory={() => {
                   setIsHistoryOpen(true);
                 }}
               />
               <div className="space-y-0 pb-20">
                  {activeSteps.map((step, index) => (
                    <TimelineStepCard key={step.id} step={step} index={index} isLast={index === activeSteps.length - 1} isEditing={editingStepId === step.id} editFormData={editFormData} allCategories={allCategories} allStatuses={allStatuses} snippets={project.snippets} isCopied={copiedStepId === step.id} isDragging={draggedId === step.id} isDragTargetCard={dragTarget?.id === step.id && dragTarget.type === 'card'} dragTargetGapPosition={dragTarget?.id === step.id && dragTarget.type === 'gap' ? dragTarget.position : undefined} isShrunk={(step.status === 'completed' || step.status === 'failed') && !expandedCompletedSteps[step.id] && editingStepId !== step.id} isHistoryExpanded={!!expandedHistory[step.id]} activeNoteId={activeNoteId} handlers={{ updateField, handleCancelEdit, handleSaveStep, handleMainImageUpload, handleEditClick, toggleCompletedStep, toggleHistory, handleSmartCopy, handleToggleTab, handleDuplicateStep, handleAddSubStep, handleDeleteStep, handleLinkTodoToStep, handleNavigateToTodo, setActiveNoteId, handleUpdateNote, handleDragStart, handleDragEnd, handleDragOver, handleDrop, setDragTarget, ...subTaskDndHandlers, handlePromoteSubStep, handleDeleteSubStep, handleUpdateSubStep, handleQuickStatusUpdate, handleGenerateToTodo, loadingStepToTodo: loadingStepToTodo as any, handleCommitStep: (s) => setCommitStep(s) }} />
                  ))}
               </div>
               <ArchivedTasks steps={archivedSteps} onRestore={(id) => onUpdateProject({...project, steps: project.steps.map(s => s.id === id ? {...s, archivedAt: undefined} : s)})} onPermanentDelete={(id) => onUpdateProject({...project, steps: project.steps.filter(s => s.id !== id)})} />
               <div className="fixed bottom-8 right-8 z-30"><button onClick={handleAddStep} className="flex items-center justify-center w-14 h-14 bg-cyan-600 text-white rounded-full shadow-xl hover:bg-cyan-500 transition-all"><Plus size={28} /></button></div>
               <div className="fixed bottom-8 left-8 z-30">
                 <button 
                   onClick={() => setIsTerminalOpen(true)} 
                   className="flex items-center justify-center w-14 h-14 bg-fuchsia-600 text-white rounded-full shadow-xl hover:bg-fuchsia-500 transition-all group/float-term"
                   title="Open Terminal (CI/CD)"
                 >
                   <Terminal size={28} className="group-hover/float-term:scale-110 transition-transform" />
                 </button>
               </div>
            </div>
            ) : activeTab === 'snippets' ? (
              <SnippetLibrary project={project} onUpdateProject={onUpdateProject} />
            ) : activeTab === 'todos' ? (
              <TodoManagerView project={project} onGoToTimeline={setActiveTab} onUpdateProject={onUpdateProject} targetTodoId={targetTodoId} />
            ) : enabledToolPlugins.find(p => p.id === activeTab) ? (
              <PluginView config={enabledToolPlugins.find(p => p.id === activeTab)!} project={project} onSave={onUpdateProject} theme={globalConfig.theme} />
            ) : activeSteps.find(s => s.id === activeTab) ? (
              <FocusedStepView step={activeSteps.find(s => s.id === activeTab)!} isEditing={focusedEditing} formData={focusedForm} allCategories={allCategories} allStatuses={allStatuses} snippets={project.snippets} handlers={{ onBack: () => setActiveTab('timeline'), onStartEdit: () => { setFocusedForm(activeSteps.find(s => s.id === activeTab)!); setFocusedEditing(true); }, onCancelEdit: () => setFocusedEditing(false), onSaveEdit: () => { const idx = project.steps.findIndex(s => s.id === activeTab); const updated = [...project.steps]; updated[idx] = focusedForm!; onUpdateProject({...project, steps: updated}); setFocusedEditing(false); }, onToggleTab: handleToggleTab, updateForm: (f, v) => setFocusedForm(p => p ? ({...p, [f]: v}) : null), handleImageUpload: (e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (evt) => setFocusedForm(p => p ? ({...p, imageUrl: evt.target?.result as string}) : null); reader.readAsDataURL(file); } }, handleAddSubStep, handlePromoteSubStep, handleDeleteSubStep, handleUpdateSubStep, onDeleteStep: () => handleDeleteStep(activeTab), handleGenerateToTodo, handleLinkTodoToStep, handleNavigateToTodo, subTaskDnd: subTaskDndHandlers }} />
            ) : null}
          </div>
        )}
      </main>

      {confirmModal && <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} confirmLabel={confirmModal.confirmLabel || "Confirm"} isDanger={confirmModal.isDanger} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-xl text-sm font-medium animate-in slide-in-from-bottom-5 duration-300 ${toastMessage.type === 'success' ? 'bg-cyan-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Render TerminalView globally if open */}
      {isTerminalOpen && (
        <TerminalView onClose={() => setIsTerminalOpen(false)} project={project} />
      )}

      {isHistoryOpen && (
        <GitHistoryModal project={project} onClose={() => setIsHistoryOpen(false)} />
      )}
      
      {commitStep && (
        <CommitizenModal 
          step={commitStep} 
          project={project} 
          onClose={() => setCommitStep(null)} 
          onComplete={() => {
            // Optional: Show some success toast or just close
            setCommitStep(null);
          }} 
        />
      )}
    </div>
  );
};

export default ProjectDetail;
