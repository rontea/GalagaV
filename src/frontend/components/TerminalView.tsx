import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Play, Trash2, Command, X, Download, Folder } from 'lucide-react';
import { Project } from '../../../types';

interface LogLine {
  type: 'stdout' | 'stderr' | 'error' | 'command' | 'close';
  data: string;
}

interface TerminalViewProps {
  onClose?: () => void;
  project?: Project;
}

export default function TerminalView({ onClose, project }: TerminalViewProps) {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getPromptString = () => {
    return project?.localFolderPath ? `${project.localFolderPath} $` : '$';
  };

  const executeCommand = async (cmdToRun: string) => {
    if (!cmdToRun.trim() || isRunning) return;

    setIsRunning(true);
    setLogs(prev => [...prev, { type: 'command', data: `${getPromptString()} ${cmdToRun}` }]);
    setCommand('');

    try {
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: cmdToRun,
          cwd: project?.localFolderPath || undefined
        })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().length > 0);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'close') {
              setLogs(prev => [...prev, { type: 'close', data: `[Process exited with code ${parsed.code}]` }]);
            } else {
              setLogs(prev => [...prev, { type: parsed.type, data: parsed.data }]);
            }
          } catch (e) {
            console.error("Failed to parse ndjson line", line);
          }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', data: String(err) }]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(command);
    }
  };

  const projectName = project?.name ? project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'my-new-project';
  const missionBrief = project?.description ? project.description.replace(/"/g, '\\"') : 'A new mission brief here';
  const activeContext = project?.systemPrompt ? project.systemPrompt.replace(/"/g, '\\"') : '';

  const presetCommands: { label: string; cmd: string }[] = [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 flex flex-col w-full max-w-5xl h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-800 rounded-md text-slate-300 self-start mt-0.5">
              <TerminalIcon size={18} />
            </div>
            <div className="flex flex-col">
              <h2 className="font-semibold text-slate-200">Terminal (CI/CD) - {project?.name || 'Local'}</h2>
              {project?.localFolderPath && (
                <div className="text-[11px] text-cyan-400/80 font-mono flex items-center gap-1.5 mt-0.5">
                  <Folder size={10} />
                  <span>{project.localFolderPath}</span>
                </div>
              )}
              {project?.description && (
                <div className="text-[11px] text-slate-500 mt-0.5 max-w-md truncate" title={project.description}>
                  {project.description}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto self-start">
            {presetCommands.map((preset, i) => (
               <button
                 key={i}
                 onClick={() => executeCommand(preset.cmd)}
                 disabled={isRunning}
                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
                 title={preset.cmd}
               >
                 <Command size={12} />
                 <span>{preset.label}</span>
               </button>
            ))}
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button 
              onClick={() => {
                const proj = window.prompt("Enter project directory to download:", projectName);
                if (proj) window.location.href = `/api/download/${proj}`;
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-md border border-emerald-600/50 transition"
              title="Download Project Folder"
            >
              <Download size={12} />
              <span>Download</span>
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button 
              onClick={() => setLogs([])}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800 transition shadow-sm border border-transparent hover:border-slate-700"
              title="Clear Terminal"
            >
              <Trash2 size={16} />
            </button>
            {onClose && (
              <>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <button 
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition shadow-sm border border-transparent hover:border-slate-700"
                  title="Close Terminal"
                >
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-[#0d1117] selection:bg-cyan-900">
          {logs.length === 0 && (
            <div className="text-slate-500 italic mt-2">Ready. Enter a command or select a preset to configure CI/CD pipelines.</div>
          )}
          {logs.map((log, i) => (
            <div 
              key={i} 
              className={`whitespace-pre-wrap leading-relaxed ${
                log.type === 'command' ? 'text-cyan-400 font-bold mb-1 mt-3' :
                log.type === 'error' ? 'text-red-400 font-bold' :
                log.type === 'stderr' ? 'text-orange-300' :
                log.type === 'close' ? 'text-slate-500 italic mt-1 pb-2 border-b border-slate-800/50' :
                'text-slate-300'
              }`}
            >
              {log.data}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-3 shrink-0">
          <span className="text-cyan-500 font-bold font-mono pl-2 text-sm shrink-0">{getPromptString()}</span>
          <input 
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            placeholder={isRunning ? "Command running..." : "Enter shell command..."}
            className="flex-1 bg-transparent border-none outline-none text-slate-200 font-mono text-sm focus:ring-0 p-1 placeholder-slate-600"
            autoFocus
          />
          <button 
            onClick={() => executeCommand(command)}
            disabled={isRunning || !command.trim()}
            className="p-2 bg-cyan-600 text-white hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-md transition shadow-md shrink-0"
          >
            <Play fill="currentColor" size={16} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
