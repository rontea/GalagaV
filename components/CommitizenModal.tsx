import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Terminal, AlertCircle, RefreshCw, FileText, Plus, CheckSquare, Square, GitMerge } from 'lucide-react';
import { Step, Project } from '../types';

interface CommitizenModalProps {
  step?: Step;
  project: Project;
  onClose: () => void;
  onComplete: () => void;
}

const COMMIT_TYPES = [
  { value: 'feat', label: 'Feat', desc: 'A new feature' },
  { value: 'fix', label: 'Fix', desc: 'A bug fix' },
  { value: 'docs', label: 'Docs', desc: 'Documentation only changes' },
  { value: 'style', label: 'Style', desc: 'Changes that do not affect the meaning of the code' },
  { value: 'refactor', label: 'Refactor', desc: 'A code change that neither fixes a bug nor adds a feature' },
  { value: 'perf', label: 'Perf', desc: 'A code change that improves performance' },
  { value: 'test', label: 'Test', desc: 'Adding missing tests or correcting existing tests' },
  { value: 'build', label: 'Build', desc: 'Changes that affect the build system or external dependencies' },
  { value: 'ci', label: 'CI', desc: 'Changes to our CI configuration files and scripts' },
  { value: 'chore', label: 'Chore', desc: 'Other changes that don\'t modify src or test files' },
];

export const CommitizenModal: React.FC<CommitizenModalProps> = ({ step, project, onClose, onComplete }) => {
  const [activeTab, setActiveTab] = useState<'changes' | 'commit' | 'merge'>('changes');
  const [type, setType] = useState('feat');
  const [scope, setScope] = useState('');
  const [subject, setSubject] = useState(step?.title || '');
  const [body, setBody] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [issues, setIssues] = useState('');
  
  const [isCommitting, setIsCommitting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isLoadingChanges, setIsLoadingChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  
  const [changedFiles, setChangedFiles] = useState<{file: string, status: string}[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [mergeBranch, setMergeBranch] = useState('main');

  const fetchChanges = async () => {
    setIsLoadingChanges(true);
    setError(null);
    try {
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: 'git status -s',
          cwd: project?.localFolderPath || undefined
        })
      });

      if (!response.ok) throw new Error(`Execution failed: ${response.statusText}`);
      
      const reader = response.body?.getReader();
      if (reader) {
         let output = '';
         const decoder = new TextDecoder('utf-8');
         while (true) {
           const { value, done } = await reader.read();
           if (done) break;
           const chunk = decoder.decode(value, { stream: true });
           const lines = chunk.split('\n').filter(line => line.trim().length > 0);
           for (const line of lines) {
             try {
               const parsed = JSON.parse(line);
               if (parsed.type === 'stdout') output += parsed.data + '\n';
             } catch (e) {}
           }
         }
         
         const files = output.split('\n')
           .filter(line => line.trim().length > 0)
           .map(line => {
             const status = line.substring(0, 2);
             const file = line.substring(3).trim();
             return { status, file };
           });
         setChangedFiles(files);
         // Auto-select all by default
         setSelectedFiles(new Set(files.map(f => f.file)));
         
         // If working tree is clean, user might just want to merge
         if (files.length === 0 && activeTab === 'changes') {
           // We can keep it on changes to let them see it's clean
         }
      }
    } catch (err: any) {
      setError('Failed to fetch git changes.');
    } finally {
      setIsLoadingChanges(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, [project.localFolderPath]);

  const toggleFileStatus = (file: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file)) newSelected.delete(file);
    else newSelected.add(file);
    setSelectedFiles(newSelected);
  };

  const toggleAllFiles = () => {
    if (selectedFiles.size === changedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(changedFiles.map(f => f.file)));
    }
  };

  const generateCommitMessage = () => {
    let msg = `${type}`;
    if (scope) msg += `(${scope})`;
    if (isBreaking) msg += `!`;
    msg += `: ${subject}`;
    
    if (body) msg += `\n\n${body}`;
    if (issues) msg += `\n\nCloses ${issues}`;
    return msg;
  };

  const handleCommit = async () => {
    if (selectedFiles.size === 0 && changedFiles.length > 0) {
      setError("Please select at least one file to commit.");
      setActiveTab('changes');
      return;
    }
    if (!subject.trim() && changedFiles.length > 0) {
      setError("Subject is required.");
      setActiveTab('commit');
      return;
    }
    
    setIsCommitting(true);
    setError(null);
    setMergeSuccess(null);
    setCommitSuccess(null);
    const message = generateCommitMessage();
    
    // Build git add command
    let command = '';
    if (changedFiles.length > 0) {
      const filesToAdd = Array.from(selectedFiles).map(f => `"${f}"`).join(' ');
      command = `git add ${filesToAdd} && git commit -m "${message.replace(/"/g, '\\"')}"`;
    } else {
      // Nothing to commit, just proceed to merge
      setIsCommitting(false);
      setActiveTab('merge');
      return;
    }
    
    try {
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command,
          cwd: project?.localFolderPath || undefined
        })
      });

      if (!response.ok) throw new Error(`Execution failed: ${response.statusText}`);
      
      const reader = response.body?.getReader();
      let outputBuf = '';
      if (reader) {
         const decoder = new TextDecoder('utf-8');
         while (true) {
           const { value, done } = await reader.read();
           if (done) break;
           const chunk = decoder.decode(value, { stream: true });
           const lines = chunk.split('\n').filter(line => line.trim().length > 0);
           for (const line of lines) {
             try {
               const parsed = JSON.parse(line);
               if (parsed.type === 'stdout' || parsed.type === 'stderr') outputBuf += parsed.data + '\n';
             } catch (e) {}
           }
         }
      }
      
      // Successfully committed, move to merge
      onComplete();
      setCommitSuccess(outputBuf.trim());
      setActiveTab('merge');
    } catch (err: any) {
      setError(err.message || 'An error occurred while committing.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleMerge = async () => {
    if (changedFiles.length > 0) {
      setError("Please commit all changes before merging.");
      return;
    }
    if (!mergeBranch.trim()) {
      setError("Branch name is required.");
      return;
    }
    
    setIsMerging(true);
    setError(null);
    setMergeSuccess(null);
    
    const command = `git merge ${mergeBranch}`;
    
    try {
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command,
          cwd: project?.localFolderPath || undefined
        })
      });

      if (!response.ok) throw new Error(`Execution failed: ${response.statusText}`);
      
      const reader = response.body?.getReader();
      let outputBuf = '';
      if (reader) {
         const decoder = new TextDecoder('utf-8');
         while (true) {
           const { value, done } = await reader.read();
           if (done) break;
           const chunk = decoder.decode(value, { stream: true });
           const lines = chunk.split('\n').filter(line => line.trim().length > 0);
           for (const line of lines) {
             try {
               const parsed = JSON.parse(line);
               if (parsed.type === 'stdout' || parsed.type === 'stderr') outputBuf += parsed.data + '\n';
             } catch (e) {}
           }
         }
      }
      
      setMergeSuccess(`Successfully merged ${mergeBranch}!\n${outputBuf}`);
      window.dispatchEvent(new Event('project-info-refresh'));
    } catch (err: any) {
      setError(err.message || 'An error occurred while merging.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Terminal size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Commit & Merge</h2>
              <p className="text-xs text-slate-400 font-mono">Stage files, commit, and merge</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('changes')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'changes' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            Changes ({selectedFiles.size}/{changedFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('commit')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'commit' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            Commit Details
          </button>
          <button
            onClick={() => {
              if (changedFiles.length > 0) {
                setError("Please commit all changes before merging.");
                return;
              }
              setActiveTab('merge');
            }}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'merge' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'} ${changedFiles.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={changedFiles.length > 0 ? "Commit changes before merging" : ""}
          >
            Merge
          </button>
        </div>

        <div className="p-6 overflow-y-auto min-h-[300px]">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>{error}</div>
            </div>
          )}
          {commitSuccess && (
            <div className="mb-6 p-4 bg-[#0d1117] border border-slate-700/50 rounded-xl text-slate-300 text-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={16} className="shrink-0" />
                <span className="font-bold">Commit Successful</span>
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap">{commitSuccess}</pre>
            </div>
          )}
          {mergeSuccess && (
            <div className="mb-6 p-4 bg-[#0d1117] border border-slate-700/50 rounded-xl text-slate-300 text-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={16} className="shrink-0" />
                <span className="font-bold">Merge Successful</span>
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap">{mergeSuccess}</pre>
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button 
                  onClick={toggleAllFiles}
                  className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  {selectedFiles.size === changedFiles.length && changedFiles.length > 0 ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} />}
                  <span>Select All</span>
                </button>
                <button 
                  onClick={fetchChanges}
                  disabled={isLoadingChanges}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <RefreshCw size={14} className={isLoadingChanges ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {isLoadingChanges ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <RefreshCw size={24} className="animate-spin mb-4" />
                  <p>Loading git status...</p>
                </div>
              ) : changedFiles.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <CheckCircle size={32} className="mb-4 text-emerald-500/50" />
                  <p>Working tree clean. No changes to commit.</p>
                  <button 
                    onClick={() => setActiveTab('merge')}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
                  >
                    Go to Merge
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-700 overflow-hidden divide-y divide-slate-800 bg-slate-800/30">
                  {changedFiles.map((f, i) => (
                    <div 
                      key={i} 
                      className="group flex items-center justify-between p-3 hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => toggleFileStatus(f.file)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {selectedFiles.has(f.file) ? (
                          <CheckSquare size={16} className="text-indigo-400 shrink-0" />
                        ) : (
                          <Square size={16} className="text-slate-500 shrink-0" />
                        )}
                        <span className="text-xs font-mono w-6 text-center shrink-0 font-bold text-slate-400">{f.status}</span>
                        <span className="text-sm text-slate-300 truncate group-hover:text-white">{f.file}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'commit' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Type of Change</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    {COMMIT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label} - {t.desc}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Scope (Optional)</label>
                  <input type="text" placeholder="e.g. auth, api, ui" value={scope} onChange={(e) => setScope(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Subject</label>
                <input type="text" placeholder="Write a short, imperative tense description of the change" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm" maxLength={100} />
                <div className="text-xs text-slate-500 text-right">{subject.length}/100</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Body (Optional)</label>
                <textarea placeholder="Provide a longer description of the change" value={body} onChange={(e) => setBody(e.target.value)} className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm resize-none" />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isBreaking ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-600 group-hover:border-slate-500 text-transparent'}`}>
                    <CheckCircle size={14} className="stroke-[3]" />
                  </div>
                  <span className="text-sm text-slate-300 select-none">Are there any breaking changes?</span>
                  <input type="checkbox" className="hidden" checked={isBreaking} onChange={(e) => setIsBreaking(e.target.checked)} />
                </label>
                
                <div className={`space-y-2 transition-all ${isBreaking ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                    <label className="text-sm font-semibold text-rose-400">Breaking Change Description (Add to Body)</label>
                    <textarea placeholder="Describe the breaking changes..." onChange={(e) => setBody(prev => (e.target.value ? prev + `\n\nBREAKING CHANGE: ${e.target.value}` : prev))} className="w-full h-24 bg-slate-800 border border-rose-900/50 rounded-lg p-3 text-slate-200 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono text-sm resize-none" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Issues Closed (Optional)</label>
                <input type="text" placeholder="e.g. #123, #456" value={issues} onChange={(e) => setIssues(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm" />
              </div>
            </div>
          )}

          {activeTab === 'merge' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Merge Another Branch</h3>
                <p className="text-xs text-slate-400 mb-4">
                  This will execute <code className="px-1 py-0.5 bg-slate-900 rounded border border-slate-700">git merge &lt;branch&gt;</code> into your current branch.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch to merge</label>
                  <input 
                    type="text" 
                    placeholder="e.g. main, develop, feature/my-feature" 
                    value={mergeBranch} 
                    onChange={(e) => setMergeBranch(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-800/30 shrink-0">
          {activeTab === 'commit' && (
            <div className="bg-[#0d1117] p-4 rounded-xl font-mono text-sm text-slate-300 mb-6 border border-slate-700/50 overflow-x-auto whitespace-pre">
              <div className="text-slate-500 mb-2 select-none">$ git commit -m \</div>
              <span className="text-cyan-400">"{generateCommitMessage()}"</span>
              <div className="mt-2 text-xs text-slate-500">
                Files to add: {selectedFiles.size > 0 ? selectedFiles.size === changedFiles.length ? "All files" : `${selectedFiles.size} selected` : "None"}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              {mergeSuccess ? 'Close' : 'Cancel'}
            </button>
            
            {activeTab === 'changes' && (
              <button 
                onClick={() => setActiveTab('commit')}
                disabled={changedFiles.length > 0 && selectedFiles.size === 0}
                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                Continue <Plus size={18} />
              </button>
            )}
            
            {activeTab === 'commit' && (
              <button 
                onClick={handleCommit}
                disabled={isCommitting || (changedFiles.length > 0 && selectedFiles.size === 0)}
                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                {isCommitting ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Committing...</>
                ) : (
                  <><CheckCircle size={18} />Execute Commit</>
                )}
              </button>
            )}

            {activeTab === 'merge' && (
              <button 
                onClick={handleMerge}
                disabled={isMerging || !mergeBranch.trim()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                {isMerging ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Merging...</>
                ) : (
                  <><GitMerge size={18} />Execute Merge</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


