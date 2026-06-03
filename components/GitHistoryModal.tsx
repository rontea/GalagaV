import React, { useState, useEffect } from 'react';
import { X, GitCommit, GitBranch, History, Tag } from 'lucide-react';
import { Project } from '../types';

interface GitHistoryModalProps {
  project: Project;
  onClose: () => void;
}

interface Commit {
  hash: string;
  abbrevHash: string;
  authorName: string;
  relativeTime: string;
  subject: string;
  refs: string;
  parents: string;
}

export const GitHistoryModal: React.FC<GitHistoryModalProps> = ({ project, onClose }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/terminal/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            // delimiter: |:|
            command: 'git log --all -n 100 --pretty=format:"%H|:|%h|:|%an|:|%ar|:|%s|:|%d|:|%p"',
            cwd: project?.localFolderPath || undefined
          })
        });

        if (!response.ok) throw new Error(`Execution failed: ${response.statusText}`);
        
        let output = '';
        const reader = response.body?.getReader();
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
                if (parsed.type === 'stdout') output += parsed.data + '\n';
              } catch (e) {}
            }
          }
        }

        const parsedCommits = output.split('\n').filter(line => line.trim().length > 0).map(line => {
          const parts = line.split('|:|');
          return {
            hash: parts[0] || '',
            abbrevHash: parts[1] || '',
            authorName: parts[2] || '',
            relativeTime: parts[3] || '',
            subject: parts[4] || '',
            refs: parts[5] ? parts[5].trim().replace(/^\(|\)$/g, '') : '',
            parents: parts[6] || ''
          };
        });

        setCommits(parsedCommits);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching git history.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [project]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Commit History</h2>
              <p className="text-xs text-slate-400 font-mono">View project timeline and branches</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-0 overflow-y-auto min-h-[400px] flex-1 flex flex-col bg-[#0d1117]">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              Loading history...
            </div>
          ) : error ? (
            <div className="p-6 text-rose-400 bg-rose-500/10 m-6 rounded-xl border border-rose-500/20">
              {error}
            </div>
          ) : commits.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <History size={32} className="mb-4 text-slate-600" />
              <p>No commits found.</p>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#161b22] sticky top-0 z-10 box-border border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-3/5">Message</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-1/5 whitespace-nowrap">Commit</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-1/5">Author & Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {commits.map((commit, i) => (
                    <tr key={commit.hash} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3 px-4 flex items-start gap-3">
                        <div className="mt-1 relative flex flex-col items-center">
                          {i !== commits.length - 1 && (
                            <div className="absolute top-4 bottom-[-24px] w-[2px] bg-slate-700/50" />
                          )}
                          <div className="relative w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-[#0d1117] z-10" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-200 group-hover:text-white transition-colors">{commit.subject}</span>
                          {commit.refs && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {commit.refs.split(',').map((ref, idx) => {
                                const trimmed = ref.trim();
                                const isHead = trimmed.includes('HEAD');
                                const isTag = trimmed.includes('tag:');
                                return (
                                  <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
                                    isHead ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-500/30' :
                                    isTag ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' :
                                    'bg-indigo-900/40 text-indigo-400 border border-indigo-500/30'
                                  }`}>
                                    {isHead ? <GitBranch size={10} /> : isTag ? <Tag size={10} /> : <GitBranch size={10} />}
                                    {trimmed.replace('tag: ', '')}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
                          <GitCommit size={14} className="text-slate-500" />
                          <span>{commit.abbrevHash}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300">{commit.authorName}</span>
                          <span className="text-xs text-slate-500">{commit.relativeTime}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
