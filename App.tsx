import React, { useState, useEffect } from 'react';
import { Project, GlobalConfig } from './types';
import ProjectList, { DEFAULT_PROJECT_KEYS, DEFAULT_STATUS_KEYS } from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import ConfirmModal from './components/ConfirmModal';

// --- Storage Keys ---
const STORAGE_KEY_V1 = 'galaga_project_dashboard_v1';
const STORAGE_KEY_V2 = 'galaga_projects_v2';
const STORAGE_KEY_GLOBAL_CONFIG = 'galaga_global_config_v1';

const DEFAULT_PROJECT: Project = {
  id: 'proj_galagav_default',
  name: 'GalagaV',
  description: 'A classic arcade space shooter clone featuring high scores, custom pilot profiles, and AI-powered callsign generation.',
  systemPrompt: 'ROLE: Senior Game Developer & UI Specialist.\nGOAL: GalagaV - Classic arcade shooter with Firestore High Scores and Custom Pilot Profiles.',
  icon: 'Gamepad2',
  steps: [
    {
      id: 'step_1',
      title: 'Initialize Project Structure',
      category: 'frontend',
      status: 'completed',
      content: 'Setup React, Tailwind CSS, and basic file architecture including types and firebase config.'
    },
    {
      id: 'step_2',
      title: 'Game Loop Engine',
      category: 'frontend',
      status: 'in-progress',
      content: 'Implement useGameLoop hook to handle physics, collision detection, and entity state management.'
    },
    {
      id: 'step_3',
      title: 'Firestore High Scores',
      category: 'backend',
      status: 'pending',
      content: 'Integrate Firebase Firestore to save and retrieve high scores and pilot profiles.'
    },
    {
      id: 'step_4',
      title: 'AI Callsign Generator',
      category: 'backend',
      status: 'pending',
      content: 'Connect Google Gemini API to generate cool sci-fi callsigns based on user pilot names.'
    }
  ]
};

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  isDanger: boolean;
  confirmLabel?: string;
}

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Global Configuration
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    projectIcons: DEFAULT_PROJECT_KEYS,
    statusIcons: DEFAULT_STATUS_KEYS,
    theme: 'dark' // Default to dark
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);

  // Initialization & Migration
  useEffect(() => {
    try {
      const v2Data = localStorage.getItem(STORAGE_KEY_V2);
      if (v2Data) {
        setProjects(JSON.parse(v2Data));
      } else {
        // Check for V1 data migration
        const v1Data = localStorage.getItem(STORAGE_KEY_V1);
        if (v1Data) {
          const p = JSON.parse(v1Data);
          setProjects([p]);
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify([p]));
        } else {
          // Clean slate
          setProjects([DEFAULT_PROJECT]);
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify([DEFAULT_PROJECT]));
        }
      }
      
      // Load Global Config
      const configData = localStorage.getItem(STORAGE_KEY_GLOBAL_CONFIG);
      if (configData) {
        setGlobalConfig(JSON.parse(configData));
      }
    } catch (e) {
      console.warn("Failed to load/migrate projects", e);
      setProjects([DEFAULT_PROJECT]);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Persistence
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(projects));
  }, [projects, isInitialized]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GLOBAL_CONFIG, JSON.stringify(globalConfig));
  }, [globalConfig]);

  // --- Actions ---

  const handleToggleTheme = () => {
    setGlobalConfig(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  const handleCreateProject = (name: string, description: string, systemPrompt: string) => {
    const newProject: Project = {
      ...DEFAULT_PROJECT,
      id: `proj_${Date.now()}`,
      name,
      description,
      systemPrompt: systemPrompt || DEFAULT_PROJECT.systemPrompt,
      icon: 'Terminal', // Default for new projects
      steps: [] // Start clean for new projects
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  const handleImportProject = (importedProject: Project) => {
    // Ensure unique ID to avoid conflicts if importing duplicates
    const uniqueProject = {
      ...importedProject,
      id: `proj_${Date.now()}_imported`,
      name: `${importedProject.name} (Imported)`
    };
    setProjects(prev => [...prev, uniqueProject]);
  };

  // Soft Delete (Move to Archive)
  const handleSoftDeleteProject = (id: string) => {
    // 1. Find the project first
    const project = projects.find(p => p.id === id);
    const projectName = project ? project.name : 'this project';

    setConfirmModal({
      isOpen: true,
      title: "Archive Project?",
      message: `Are you sure you want to archive "${projectName}"? It will be moved to 'Archived Protocols' and removed from your active dashboard.`,
      isDanger: false,
      confirmLabel: "Archive",
      onConfirm: () => {
        setProjects(prev => prev.map(p => 
          p.id === id ? { ...p, deletedAt: Date.now() } : p
        ));
        
        // If we are currently viewing this project, go back to dashboard
        if (activeProjectId === id) {
          setActiveProjectId(null);
        }
        setConfirmModal(null);
      }
    });
  };

  // Restore from Archive
  const handleRestoreProject = (id: string) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, deletedAt: undefined } : p
    ));
  };

  // Permanent Delete (Single Item)
  const handlePermanentDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    const projectName = project ? project.name : 'this project';

    setConfirmModal({
      isOpen: true,
      title: "Delete Permanently?",
      message: `WARNING: This will permanently destroy "${projectName}" and all its history. This action cannot be undone.`,
      isDanger: true,
      confirmLabel: "Destroy",
      onConfirm: () => {
        setProjects(prev => prev.filter(p => p.id !== id));
        setConfirmModal(null);
      }
    });
  };

  // Clear Archive (Delete All Archived)
  const handleClearArchive = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All Archives?",
      message: "WARNING: This will permanently delete ALL archived projects. This action cannot be undone.",
      isDanger: true,
      confirmLabel: "Clear All",
      onConfirm: () => {
        setProjects(prev => prev.filter(p => !p.deletedAt));
        setConfirmModal(null);
      }
    });
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleAddIcon = (type: 'project' | 'status', key: string) => {
    if (type === 'project') {
      if (!globalConfig.projectIcons.includes(key)) {
        setGlobalConfig(prev => ({ ...prev, projectIcons: [...prev.projectIcons, key] }));
      }
    } else {
      if (!globalConfig.statusIcons.includes(key)) {
        setGlobalConfig(prev => ({ ...prev, statusIcons: [...prev.statusIcons, key] }));
      }
    }
  };

  const handleRemoveIcon = (type: 'project' | 'status', key: string) => {
    if (type === 'project') {
      setGlobalConfig(prev => ({ ...prev, projectIcons: prev.projectIcons.filter(k => k !== key) }));
    } else {
      setGlobalConfig(prev => ({ ...prev, statusIcons: prev.statusIcons.filter(k => k !== key) }));
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  // --- Render ---

  return (
    <div className={globalConfig.theme === 'dark' ? 'dark' : ''}>
      <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
        {activeProject ? (
          <ProjectDetail 
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            onBack={() => setActiveProjectId(null)}
            onDeleteProject={handleSoftDeleteProject}
            activeProjectIcons={globalConfig.projectIcons}
            activeStatusIcons={globalConfig.statusIcons}
            theme={globalConfig.theme}
            onToggleTheme={handleToggleTheme}
          />
        ) : (
          <ProjectList 
            projects={projects}
            onCreateProject={handleCreateProject}
            onImportProject={handleImportProject}
            onSelectProject={setActiveProjectId}
            onDeleteProject={handleSoftDeleteProject}
            onRestoreProject={handleRestoreProject}
            onPermanentDeleteProject={handlePermanentDeleteProject}
            onClearArchive={handleClearArchive}
            activeProjectIcons={globalConfig.projectIcons}
            activeStatusIcons={globalConfig.statusIcons}
            onAddIcon={handleAddIcon}
            onRemoveIcon={handleRemoveIcon}
            theme={globalConfig.theme}
            onToggleTheme={handleToggleTheme}
          />
        )}

        {/* Global Confirmation Modal */}
        {confirmModal && (
          <ConfirmModal 
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            isDanger={confirmModal.isDanger}
            confirmLabel={confirmModal.confirmLabel}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
      </div>
    </div>
  );
};

export default App;