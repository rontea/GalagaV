
import React, { useState, useEffect } from 'react';
import { Project, GlobalConfig, PluginConfig } from './types';
import ProjectList, { DEFAULT_PROJECT_KEYS, DEFAULT_STATUS_KEYS } from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import ConfirmModal from './components/ConfirmModal';
import PluginBootstrap from './components/PluginBootstrap';
import { getJiraPlugin } from './data/defaultPlugins';

// --- Storage Keys ---
const STORAGE_KEY_V1 = 'galaga_project_dashboard_v1';
const STORAGE_KEY_V2 = 'galaga_projects_v2';
const STORAGE_KEY_GLOBAL_CONFIG = 'galaga_global_config_v1';
const STORAGE_KEY_INSTALLED_DEFAULTS = 'galaga_installed_default_plugins';
const STORAGE_KEY_BLOCKED_PLUGINS = 'galaga_blocked_plugins';
const STORAGE_KEY_DESTROYED_PLUGINS = 'galaga_destroyed_plugins';

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
      content: 'Setup React, Tailwind CSS, and basic file architecture including types and firebase config.',
      createdAt: Date.now()
    },
    {
      id: 'step_2',
      title: 'Game Loop Engine',
      category: 'frontend',
      status: 'in-progress',
      content: 'Implement useGameLoop hook to handle physics, collision detection, and entity state management.',
      createdAt: Date.now()
    },
    {
      id: 'step_3',
      title: 'Firestore High Scores',
      category: 'backend',
      status: 'pending',
      content: 'Integrate Firebase Firestore to save and retrieve high scores and pilot profiles.',
      createdAt: Date.now()
    },
    {
      id: 'step_4',
      title: 'AI Callsign Generator',
      category: 'backend',
      status: 'pending',
      content: 'Connect Google Gemini API to generate cool sci-fi callsigns based on user pilot names.',
      createdAt: Date.now()
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
  const [newPluginsCount, setNewPluginsCount] = useState(0);
  
  // Global Configuration
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    projectIcons: DEFAULT_PROJECT_KEYS,
    statusIcons: DEFAULT_STATUS_KEYS,
    plugins: [],
    theme: 'dark' // Default to dark
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);

  // Initialization & Migration
  useEffect(() => {
    const initialize = async () => {
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
        let loadedConfig: GlobalConfig = {
          projectIcons: DEFAULT_PROJECT_KEYS,
          statusIcons: DEFAULT_STATUS_KEYS,
          plugins: [],
          theme: 'dark'
        };

        if (configData) {
          const parsed = JSON.parse(configData);
          if (!parsed.plugins) parsed.plugins = [];
          loadedConfig = parsed;
        }

        // --- AUTO-INSTALL / UPDATE DEFAULT PLUGINS ---
        const previouslyInstalledIds: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_INSTALLED_DEFAULTS) || '[]');
        const blockedPlugins: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_BLOCKED_PLUGINS) || '[]');
        const destroyedPlugins: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_DESTROYED_PLUGINS) || '[]');
        
        const defaultPlugins = [getJiraPlugin()];
        let defaultsTrackerChanged = false;

        defaultPlugins.forEach(defPlugin => {
            // Check if explicitly blocked or destroyed by user
            if (blockedPlugins.includes(defPlugin.id) || destroyedPlugins.includes(defPlugin.id)) {
                return;
            }

            const hasBeenInstalled = previouslyInstalledIds.includes(defPlugin.id);
            const existingPluginIndex = loadedConfig.plugins.findIndex(p => p.id === defPlugin.id);

            if (!hasBeenInstalled) {
                // If it's a new default plugin, add it
                if (existingPluginIndex === -1) {
                    loadedConfig.plugins.push(defPlugin);
                    console.log(`[BOOT] Auto-installed default plugin: ${defPlugin.id}`);
                } else {
                    // Update existing instance if found but not in 'defaults' registry
                    loadedConfig.plugins[existingPluginIndex] = {
                        ...defPlugin,
                        enabled: loadedConfig.plugins[existingPluginIndex].enabled
                    };
                }
                previouslyInstalledIds.push(defPlugin.id);
                defaultsTrackerChanged = true;
            } else {
                // Already processed defaults, just ensure the code (files/manifest) is latest
                if (existingPluginIndex !== -1) {
                    loadedConfig.plugins[existingPluginIndex] = {
                        ...defPlugin,
                        enabled: loadedConfig.plugins[existingPluginIndex].enabled
                    };
                }
            }
        });

        if (defaultsTrackerChanged) {
            localStorage.setItem(STORAGE_KEY_INSTALLED_DEFAULTS, JSON.stringify(previouslyInstalledIds));
        }

        setGlobalConfig(loadedConfig);

        // --- SCAN DISK FOR NEW PLUGINS ---
        try {
            const res = await fetch(`/__system/list-plugins?t=${Date.now()}`);
            if (res.ok) {
                const diskPlugins: PluginConfig[] = await res.json();
                const installedIds = loadedConfig.plugins.map(p => p.id);
                const count = diskPlugins.filter(p => 
                    !installedIds.includes(p.id) && 
                    !blockedPlugins.includes(p.id) && 
                    !destroyedPlugins.includes(p.id)
                ).length;
                setNewPluginsCount(count);
            }
        } catch (e) {
            // Silently fail scanning if endpoint not available
        }

      } catch (e) {
        console.warn("Failed to load/migrate projects", e);
        setProjects([DEFAULT_PROJECT]);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  // Persistence
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(projects));
  }, [projects, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY_GLOBAL_CONFIG, JSON.stringify(globalConfig));
    } catch (e) {
      console.error("Failed to save global config:", e);
    }
  }, [globalConfig, isInitialized]);

  // --- Actions ---

  const handleUpdateGlobalConfig = (newConfig: GlobalConfig) => {
    setGlobalConfig(newConfig);
  };

  const handleCreateProject = (name: string, description: string, systemPrompt: string) => {
    const newProject: Project = {
      ...DEFAULT_PROJECT,
      id: `proj_${Date.now()}`,
      name,
      description,
      systemPrompt: systemPrompt || DEFAULT_PROJECT.systemPrompt,
      icon: 'Terminal',
      steps: []
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  const handleImportProject = (importedProject: Project) => {
    const uniqueProject = {
      ...importedProject,
      id: `proj_${Date.now()}_imported`,
      name: `${importedProject.name} (Imported)`
    };
    setProjects(prev => [...prev, uniqueProject]);
  };

  const handleSoftDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    const projectName = project ? project.name : 'this project';

    setConfirmModal({
      isOpen: true,
      title: "Archive Project?",
      message: `Are you sure you want to archive "${projectName}"? It will be moved to 'Archived Protocols'.`,
      isDanger: false,
      confirmLabel: "Archive",
      onConfirm: () => {
        setProjects(prev => prev.map(p => 
          p.id === id ? { ...p, deletedAt: Date.now() } : p
        ));
        if (activeProjectId === id) setActiveProjectId(null);
        setConfirmModal(null);
      }
    });
  };

  const handleRestoreProject = (id: string) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, deletedAt: undefined } : p
    ));
  };

  const handlePermanentDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    const projectName = project ? project.name : 'this project';

    setConfirmModal({
      isOpen: true,
      title: "Delete Permanently?",
      message: `WARNING: This will permanently destroy "${projectName}".`,
      isDanger: true,
      confirmLabel: "Destroy",
      onConfirm: () => {
        setProjects(prev => prev.filter(p => p.id !== id));
        setConfirmModal(null);
      }
    });
  };

  const handleClearArchive = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All Archives?",
      message: "WARNING: This will permanently delete ALL archived projects.",
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

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className={globalConfig.theme === 'dark' ? 'dark' : ''}>
      <PluginBootstrap globalConfig={globalConfig} />
      <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
        {activeProject ? (
          <ProjectDetail 
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            onBack={() => setActiveProjectId(null)}
            onDeleteProject={handleSoftDeleteProject}
            globalConfig={globalConfig}
            onUpdateGlobalConfig={handleUpdateGlobalConfig}
            newPluginsCount={newPluginsCount}
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
            globalConfig={globalConfig}
            onUpdateGlobalConfig={handleUpdateGlobalConfig}
            newPluginsCount={newPluginsCount}
          />
        )}

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
