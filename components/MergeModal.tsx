import React, { useState, useEffect } from 'react';
import { X, GitMerge, CheckCircle, AlertCircle } from 'lucide-react';
import { Project } from '../types';

interface MergeModalProps {
  project: Project;
  onClose: () => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({ project, onClose }) => {
  const [mergeBranch, setMergeBranch] = useState('');
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranchInfo = async () => {
      setIsLoadingBranches(true);
      try {
        const cwdQuery = project?.localFolderPath ? `?cwd=${encodeURIComponent(project.localFolderPath)}` : '';
        const response = await fetch(`/api/git/branches${cwdQuery}`);
        if (!response.ok) return;
        const data = await response.json();
        const current = data.currentBranch || null;
        setCurrentBranch(current);
        const branchList = Array.isArray(data.branches) ? data.branches : [];
        setBranches(branchList);
        const defaultBranch = branchList.find((b: string) => b !== current) || branchList[0] || '';
        setMergeBranch(defaultBranch);
      } catch {
        setCurrentBranch(null);
        setBranches([]);
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranchInfo();
  }, [project.localFolderPath]);

  const handleMerge = async () => {
    if (!mergeBranch.trim()) {
      setError('Branch name is required.');
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
          cwd: project?.localFolderPath || undefined,
        }),
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
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <GitMerge size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Merge</h2>
              <p className="text-xs text-slate-400 font-mono">Check merge branch before applying</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto min-h-[220px]">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>{error}</div>
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

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-slate-500">Current destination branch</p>
              <div className="text-sm text-slate-200 font-semibold bg-slate-950 border border-slate-700 rounded-lg px-3 py-2">
                {currentBranch || 'Loading current branch...'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Branch to merge into {currentBranch ? currentBranch : 'current branch'}</label>
              {isLoadingBranches ? (
                <div className="p-3 text-sm text-slate-400 bg-slate-950 border border-slate-700 rounded-lg">Loading branches...</div>
              ) : branches.length > 0 ? (
                <select
                  value={mergeBranch}
                  onChange={(e) => setMergeBranch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
                >
                  <option value="" disabled>Select a branch</option>
                  {branches.filter(b => b !== currentBranch).map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. feature/my-feature"
                  value={mergeBranch}
                  onChange={(e) => setMergeBranch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
                />
              )}
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 text-sm">
              <p className="text-slate-300 font-semibold">Merge check</p>
              <p className="mt-2 text-xs leading-6">This will execute <code className="px-1 py-0.5 bg-slate-900 rounded border border-slate-700">git merge &lt;branch&gt;</code> into <span className="font-semibold text-slate-200">{currentBranch || 'your current branch'}</span>. Make sure your changes are committed first.</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-800/30 shrink-0">
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              Cancel
            </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};
