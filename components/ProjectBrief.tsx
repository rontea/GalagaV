
import React, { useState, useEffect } from 'react';
import { Bot, Archive, Settings, Terminal, Database, Sparkles, BookOpen, CheckSquare, Github, Folder, GitBranch, Tag, History, RefreshCw } from 'lucide-react';
import { Project } from '../types';
import { FULL_ICON_MAP } from './ProjectList';

interface ProjectBriefProps {
  project: Project;
  onDeleteProject: (id: string) => void;
  onOpenSettings: () => void;
  hasArchitect: boolean;
  onInitializeArchitect: () => void;
  onOpenSnippets: () => void;
  onOpenTodos?: () => void;
  onOpenTerminal?: () => void;
  onOpenCommit?: () => void;
  onOpenHistory?: () => void;
  isArchitectHidden?: boolean;
}

export const ProjectBrief: React.FC<ProjectBriefProps> = ({ 
  project, 
  onDeleteProject, 
  onOpenSettings, 
  hasArchitect, 
  onInitializeArchitect,
  onOpenSnippets,
  onOpenTodos,
  onOpenTerminal,
  onOpenCommit,
  onOpenHistory,
  isArchitectHidden
}) => {
  const ProjectIcon = FULL_ICON_MAP[project.icon || 'Terminal'] || Terminal;
  const [projectInfo, setProjectInfo] = useState<{ currentBranch: string; systemVersion: string } | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);
  const [hasUncommitted, setHasUncommitted] = useState(false);
  const [targetBranch, setTargetBranch] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const readTerminalStream = async (response: Response) => {
    const reader = response.body?.getReader();
    let output = '';

    if (reader) {
      const decoder = new TextDecoder('utf-8');
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
      }
    }

    return output;
  };

  const hasStdoutData = (output: string) => {
    return output.split('\n').some(line => {
      if (!line.trim()) return false;
      try {
        const parsed = JSON.parse(line);
        return parsed.type === 'stdout' && parsed.data.trim().length > 0;
      } catch (e) {
        return false;
      }
    });
  };

  const readJsonResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!contentType.includes('application/json')) {
      const receivedHtml = text.trimStart().startsWith('<!doctype') || text.trimStart().startsWith('<html');
      throw new Error(
        receivedHtml
          ? 'Branch API returned the dashboard HTML instead of JSON. Open the app from the backend server or enable the Vite API proxy.'
          : `Branch API returned ${contentType || 'an unknown content type'} instead of JSON.`
      );
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Branch API returned invalid JSON.');
    }
  };

  const fetchInfo = async () => {
    const query = project.localFolderPath ? `?cwd=${encodeURIComponent(project.localFolderPath)}` : '';
    try {
      const infoRes = await fetch(`/api/project-info${query}`);
      const infoData = await infoRes.json();
      setProjectInfo(infoData);
      
      if (project.localFolderPath) {
        const statusRes = await fetch('/api/terminal/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            command: 'git status --porcelain',
            cwd: project.localFolderPath
          })
        });
        if (statusRes.ok) {
          setHasUncommitted(hasStdoutData(await readTerminalStream(statusRes)));
        }
      }
    } catch (err) {
      console.error("Could not load project info", err);
    }
  };

  useEffect(() => {
    fetchInfo();
    window.addEventListener('project-info-refresh', fetchInfo);
    return () => window.removeEventListener('project-info-refresh', fetchInfo);
  }, [project.localFolderPath, project.todoFolderPath]);

  const openBranchSwitcher = async () => {
    setShowBranchModal(true);
    setIsCheckingChanges(true);
    setBranchError(null);
    setTargetBranch('');
    setBranches([]);
    try {
      // First, get git status
      const statusRes = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: 'git status --porcelain',
          cwd: project?.localFolderPath || undefined
        })
      });
      if (statusRes.ok) {
        setHasUncommitted(hasStdoutData(await readTerminalStream(statusRes)));
      }

      const query = project?.localFolderPath ? `?cwd=${encodeURIComponent(project.localFolderPath)}` : '';
      const branchRes = await fetch(`/api/git/branches${query}`);
      if (branchRes.ok) {
        const branchData = await readJsonResponse(branchRes);
        if (branchData.success) {
          setBranches(branchData.branches || []);
          setProjectInfo(info => ({
            currentBranch: branchData.currentBranch || info?.currentBranch || 'Unknown',
            systemVersion: info?.systemVersion || projectInfo?.systemVersion || 'Unknown',
          }));
        } else {
          setBranchError(branchData.error || 'Failed to load git branches');
        }
      } else {
        const branchData = await readJsonResponse(branchRes).catch(() => null);
        setBranchError(branchData?.error || 'Failed to load git branches');
      }
    } catch (e) {
      console.error(e);
      setBranchError(e instanceof Error ? e.message : 'Failed to load git branches');
    } finally {
      setIsCheckingChanges(false);
    }
  };

  const handleSwitchBranch = async (branchName?: string) => {
    const branchToSwitch = branchName || targetBranch;
    if (!branchToSwitch.trim()) return;
    setIsSwitching(true);
    setBranchError(null);
    try {
      const response = await fetch('/api/git/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          branch: branchToSwitch.trim(),
          cwd: project?.localFolderPath || undefined
        })
      });

      const data = await readJsonResponse(response).catch((err) => ({ success: false, error: err.message }));
      if (!response.ok || !data?.success) {
        setBranchError(data?.error || 'Failed to switch branch');
        return;
      }

      setBranches(data.branches || branches);
      setProjectInfo(info => ({
        currentBranch: data.currentBranch || branchToSwitch.trim(),
        systemVersion: info?.systemVersion || projectInfo?.systemVersion || 'Unknown',
      }));
      fetchInfo();
      setShowBranchModal(false);
    } catch(err: any) {
      setBranchError(err.message || 'Failed to switch branch');
    } finally {
      setIsSwitching(false);
    }
  };

  
  return (
    <div className="mb-16 p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl relative group/info">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
          <ProjectIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
             {project.name}
             {project.repositoryUrl && (
                <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors" title="View Repository">
                  <Github size={20} />
                </a>
             )}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Project Dashboard</span>
            {(project.defaultBranch || projectInfo) && (
              <>
                <span className="text-xs text-slate-400">&bull;</span>
                <button 
                  onClick={openBranchSwitcher}
                  className="flex items-center gap-1 text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-2 py-0.5 rounded hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors cursor-pointer"
                  title="Designated Default Branch (Click to Switch)"
                >
                  <GitBranch size={12} /> {projectInfo?.currentBranch || project.defaultBranch || 'Unknown'}
                  {hasUncommitted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-1" title="Uncommitted changes detected" />
                  )}
                </button>
              </>
            )}
            {(project.version || projectInfo) && (
              <>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="flex items-center gap-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded" title="Project Version">
                  <Tag size={12} /> v{project.version || projectInfo?.systemVersion || '0.0.0'}
                </span>
              </>
            )}
            {projectInfo && (
              <>
                <button
                  onClick={onOpenHistory}
                  className="flex items-center gap-1 text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                  title="View Git History"
                >
                  <History size={12} /> History
                </button>
                <span className="text-xs text-slate-400">&bull;</span>
                <button 
                  onClick={fetchInfo}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500 hover:text-cyan-500 transition-colors px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                  title="Refresh project information from local folder"
                >
                  <RefreshCw size={10} className={projectInfo ? "" : "animate-spin"} />
                  <span className="text-[10px]">Sync</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <button 
          onClick={onOpenTodos} 
          className="flex items-center gap-2 px-3 py-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-all bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-500/30 hover:border-emerald-400 shadow-sm group/todos-btn" 
          title="TODO Manager"
        >
          <CheckSquare size={18} className="group-hover/todos-btn:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">TODOs</span>
        </button>
        <button 
          onClick={onOpenSnippets} 
          className="flex items-center gap-2 px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-all bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-500/30 hover:border-indigo-400 shadow-sm group/snip-btn" 
          title="Snippet Library"
        >
          <BookOpen size={18} className="group-hover/snip-btn:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Snippets</span>
        </button>
        {(!hasArchitect || isArchitectHidden) && (
          <button 
            onClick={onInitializeArchitect} 
            className="flex items-center gap-2 px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-all bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-500/30 hover:border-indigo-400 shadow-sm group/arch-btn" 
            title={hasArchitect ? "Open Architect" : "Initialize Architect Schema"}
          >
            <Database size={18} className="group-hover/arch-btn:animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{hasArchitect ? "Architect" : "Engage Architect"}</span>
          </button>
        )}
        <button onClick={() => onDeleteProject(project.id)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors bg-white/50 dark:bg-black/20 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50" title="Archive Project"><Archive size={18} /></button>
        <button onClick={onOpenSettings} className="p-2 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors bg-white/50 dark:bg-black/20 rounded-lg border border-transparent hover:border-cyan-200 dark:hover:border-cyan-900/50" title="Settings"><Settings size={18} /></button>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3">Mission Brief</h2>
          <p className="text-xl text-slate-700 dark:text-slate-100 leading-relaxed font-light break-words">{project.description}</p>
          {project.localFolderPath && (
             <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <Folder size={16} className="text-cyan-500" />
                <span className="break-all">{project.localFolderPath}</span>
             </div>
          )}
        </div>
        <div className="mt-2">
          <h2 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3">Active Context</h2>
          <div className="bg-slate-50 dark:bg-black/60 rounded-lg p-5 border border-slate-200 dark:border-slate-800/60 font-mono text-xs sm:text-sm text-emerald-600 dark:text-emerald-500/80 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar break-words">
            {project.systemPrompt}
          </div>
        </div>
        {project.snippets && project.snippets.length > 0 && (
          <div className="mt-2">
            <h2 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3">Snippet Library</h2>
            <div className="flex flex-wrap gap-2">
              {project.snippets.map(s => (
                <div key={s.id} className="px-2 py-1 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/50 rounded text-[10px] font-mono text-cyan-700 dark:text-cyan-400">
                  @{s.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showBranchModal && (
        <div className="absolute top-12 left-20 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72">
          <h3 className="text-sm font-semibold text-white mb-3">Switch Branch</h3>
          
          {isCheckingChanges ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Checking status...
            </div>
          ) : hasUncommitted ? (
            <div className="mb-4">
              <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-500 text-xs mb-3">
                <span className="font-bold shrink-0">Warning:</span>
                <span>You have uncommitted changes. Switching branch might overwrite them.</span>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                     setShowBranchModal(false);
                     if (onOpenCommit) onOpenCommit();
                  }}
                  className="w-full px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded transition-colors"
                >
                  Commit Changes First
                </button>
              </div>
              <hr className="my-3 border-slate-800" />
            </div>
          ) : null}

          {!isCheckingChanges && (
            <div>
              <input
                type="text"
                autoFocus
                placeholder="Search or target (-b new-branch)..."
                value={targetBranch}
                onChange={e => setTargetBranch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-sm outline-none focus:border-cyan-500 font-mono mb-3"
              />
              {branches.length > 0 && (
                <div className="mb-3 max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                  {branches.filter(b => b.toLowerCase().includes(targetBranch.toLowerCase())).map(b => (
                    <button
                      key={b}
                      onClick={() => handleSwitchBranch(b)}
                      disabled={isSwitching}
                      className={`text-left px-3 py-2 rounded text-sm font-mono flex items-center justify-between ${
                        b === projectInfo?.currentBranch 
                          ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30' 
                          : 'hover:bg-slate-800 text-slate-300 border border-transparent hover:border-slate-700'
                      }`}
                    >
                      <span>{b}</span>
                      {b === projectInfo?.currentBranch && <span className="text-[10px] uppercase tracking-wider text-cyan-500 bg-cyan-950 px-1.5 py-0.5 rounded">Current</span>}
                    </button>
                  ))}
                  {branches.filter(b => b.toLowerCase().includes(targetBranch.toLowerCase())).length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-2">No matching branches found.</div>
                  )}
                </div>
              )}
              {branchError && (
                <div className="text-xs text-rose-400 mb-3 break-all">{branchError}</div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowBranchModal(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                  Close
                </button>
                <button 
                  onClick={() => handleSwitchBranch()} 
                  disabled={isSwitching || !targetBranch.trim()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-xs font-semibold rounded transition-colors flex items-center gap-2"
                >
                  {isSwitching && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Switch
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
