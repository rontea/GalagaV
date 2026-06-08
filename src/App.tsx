import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, GlobalConfig } from '../types';
import { initDB, getProjectsFromDB, saveProjectsToDB, getConfigFromDB, saveConfigToDB } from '../lib/sqlite';
import Header from '../components/Header';
import ProjectList, { DEFAULT_PROJECT_KEYS, DEFAULT_STATUS_KEYS } from '../components/ProjectList';
import ProjectDetail from '../components/ProjectDetail';
import SettingsModal from '../components/SettingsModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const DEFAULT_CONFIG: GlobalConfig = {
  projectIcons: DEFAULT_PROJECT_KEYS,
  statusIcons: DEFAULT_STATUS_KEYS,
  plugins: []
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize DB and Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        let loadedProjects = getProjectsFromDB();
        const loadedConfig = getConfigFromDB();

        setProjects(loadedProjects);
        if (loadedConfig) {
          setConfig(loadedConfig);
          if (loadedConfig.theme) setTheme(loadedConfig.theme);
        }
        
        // Load theme preference from localStorage (overrides config if set)
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        if (savedTheme) setTheme(savedTheme);
        else if (!loadedConfig?.theme && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Sync Theme with DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persistence Handlers
  const handleUpdateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    saveProjectsToDB(newProjects);
  };

  const handleUpdateConfig = (newConfig: GlobalConfig) => {
    setConfig(newConfig);
    saveConfigToDB(newConfig);
    if (newConfig.theme && newConfig.theme !== theme) {
      setTheme(newConfig.theme);
    }
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    handleUpdateConfig({ ...config, theme: newTheme });
  };

  // Project Handlers
  const handleCreateProject = async (name: string, description: string, systemPrompt: string, icon?: string, localFolderPath?: string, todoFolderPath?: string, initGit?: boolean) => {
    const projectId = `proj_${Date.now()}`;
    const newProject: Project = {
      id: projectId,
      name,
      description,
      systemPrompt,
      icon,
      localFolderPath,
      todoFolderPath,
      steps: []
    };

    if (localFolderPath && localFolderPath.trim() !== '') {
      try {
        const res = await fetch('/api/init-folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
             localFolderPath, 
             initGit, 
             todoFolderPath 
          })
        });
        
        const data = await res.json();
        if (!data.success) {
          console.error("Failed to initialize folders", data.error);
          setTimeout(() => alert("Failed to link project folder: " + data.error), 100);
          return;
        }

      } catch (err) {
        console.error('Failed to link folder:', err);
        setTimeout(() => alert("Failed to link project folder."), 100);
        return;
      }
    }

    if (localFolderPath && localFolderPath.trim() !== '') {
      try {
        const infoRes = await fetch(`/api/project-info?cwd=${encodeURIComponent(localFolderPath)}`);
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          newProject.defaultBranch = infoData.currentBranch !== 'Unknown' ? infoData.currentBranch : undefined;
          newProject.version = infoData.systemVersion !== 'Unknown' ? infoData.systemVersion : undefined;
        }
      } catch (err) {
        console.error('Failed to read project info:', err);
      }
    }

    handleUpdateProjects([...projects, newProject]);
  };

  const handleDeleteProject = (id: string) => {
    // Soft delete (confirmation should be handled by the caller/modal)
    handleUpdateProjects(projects.map(p => p.id === id ? { ...p, deletedAt: Date.now() } : p));
  };

  const handleRestoreProject = (id: string) => {
    handleUpdateProjects(projects.map(p => p.id === id ? { ...p, deletedAt: undefined } : p));
  };

  const handlePermanentDeleteProject = (id: string) => {
    // Permanent delete (confirmation should be handled by the caller/modal)
    handleUpdateProjects(projects.filter(p => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
  };

  const handleClearArchive = () => {
    handleUpdateProjects(projects.filter(p => !p.deletedAt));
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    const originalProject = projects.find(p => p.id === updatedProject.id);
    const pathChanged = originalProject && (
      originalProject.localFolderPath !== updatedProject.localFolderPath ||
      originalProject.todoFolderPath !== updatedProject.todoFolderPath
    );

    let projectToSave = { ...updatedProject };

    if (updatedProject.localFolderPath && (updatedProject.localFolderPath.trim() !== '') && pathChanged) {
      try {
        const infoRes = await fetch(`/api/project-info?cwd=${encodeURIComponent(updatedProject.localFolderPath)}`);
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          projectToSave.defaultBranch = infoData.currentBranch !== 'Unknown' ? infoData.currentBranch : projectToSave.defaultBranch;
          projectToSave.version = infoData.systemVersion !== 'Unknown' ? infoData.systemVersion : projectToSave.version;
        }
      } catch (err) {
        console.error('Failed to read project info on update:', err);
      }
    }

    handleUpdateProjects(projects.map(p => p.id === updatedProject.id ? projectToSave : p));
  };

  const handleImportProject = async (project: Project) => {
    // Ensure ID is unique if it conflicts
    let finalProject = { ...project };
    if (projects.some(p => p.id === project.id)) {
      finalProject.id = `proj_import_${Date.now()}`;
    }

    handleUpdateProjects([...projects, finalProject]);
  };

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
    [projects, selectedProjectId]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-mono text-sm animate-pulse">INITIALIZING_SYSTEM...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Header 
          title={selectedProject ? selectedProject.name : "Project Dashboard"}
          isSettingsOpen={isSettingsOpen}
          onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
          onBack={selectedProjectId ? () => setSelectedProjectId(null) : undefined}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onDownload={selectedProject ? () => {
            const data = JSON.stringify(selectedProject, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedProject.name.toLowerCase().replace(/\s+/g, '_')}_export.json`;
            a.click();
            URL.revokeObjectURL(url);
          } : undefined}
        />

        <main className="w-full">
          <AnimatePresence mode="wait">
            {!selectedProjectId ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ProjectList 
                  projects={projects}
                  onSelectProject={setSelectedProjectId}
                  onCreateProject={handleCreateProject}
                  onDeleteProject={handleDeleteProject}
                  onRestoreProject={handleRestoreProject}
                  onPermanentDeleteProject={handlePermanentDeleteProject}
                  onClearArchive={handleClearArchive}
                  onImportProject={handleImportProject}
                  globalConfig={config}
                  onUpdateGlobalConfig={handleUpdateConfig}
                />
              </motion.div>
            ) : selectedProject ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ProjectDetail 
                  project={selectedProject}
                  onBack={() => setSelectedProjectId(null)}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  globalConfig={config}
                  onUpdateGlobalConfig={handleUpdateConfig}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onUpdateConfig={handleUpdateConfig}
        />
      </div>
    </ErrorBoundary>
  );
}
