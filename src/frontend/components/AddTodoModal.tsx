import React, { useState } from 'react';
import { X, Save, Plus, Trash } from 'lucide-react';
import { Contributor, Subtask } from './TodoManagerView';

export default function AddTodoModal({ onClose, statuses, types, collections: modules, contributors, onAdded, todoFolderPath, localFolderPath }: { onClose: () => void, statuses: string[], types: string[], collections: string[], contributors: Contributor[], onAdded: () => void, todoFolderPath?: string, localFolderPath?: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(types[0] || 'feat');
  const [status, setStatus] = useState(statuses[0] || 'To Do');
  const [assign, setAssign] = useState(contributors[0]?.name || 'Unassigned');
  const [moduleName, setModuleName] = useState('');
  const [comments, setComments] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  const handleSave = async () => {
    if (!title.trim()) return;
    
    let finalSubtasks = [...subtasks];
    if (newSubtask.trim()) {
      finalSubtasks.push({ text: newSubtask.trim(), completed: false });
    }

    await fetch('/api/addtodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        type,
        status,
        assign,
        collection: moduleName,
        subtask: finalSubtasks,
        comments,
        commitMessage,
        todoFolderPath,
        localFolderPath
      })
    });
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create New Task</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Implement authentication..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm">
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assignee</label>
              <select value={assign} onChange={e => setAssign(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm">
                <option value="Unassigned">Unassigned</option>
                {contributors.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Module</label>
              <select value={moduleName} onChange={e => setModuleName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm">
                <option value="">None (TODO.md)</option>
                {modules.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Commit Message</label>
             <input value={commitMessage} onChange={e => setCommitMessage(e.target.value)} placeholder="e.g. feat(auth): add login modal" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm font-mono" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm resize-none" placeholder="Detailed description of the task..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subtasks (Checklist)</label>
            <div className="space-y-2 mb-2">
              {subtasks.map((st, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-200">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-500 bg-white dark:bg-slate-900" 
                      checked={st.completed} 
                      onChange={(e) => {
                        const next = [...subtasks];
                        next[i].completed = e.target.checked;
                        setSubtasks(next);
                      }} 
                    />
                    <span className={st.completed ? 'line-through opacity-70' : ''}>{st.text}</span>
                  </div>
                  <button type="button" onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"><Trash size={16}/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newSubtask.trim()) { setSubtasks([...subtasks, {text: newSubtask.trim(), completed: false}]); setNewSubtask(''); } } }} placeholder="Add subtask..." className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm" />
              <button type="button" onClick={() => { if(newSubtask.trim()) { setSubtasks([...subtasks, {text: newSubtask.trim(), completed: false}]); setNewSubtask(''); } }} className="px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors"><Plus size={16} /></button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comments / Notes</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm resize-none" placeholder="Additional notes..." />
          </div>

        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 font-medium text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 font-medium text-sm text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 shadow-sm flex items-center gap-2 transition-colors"><Save size={16} /> Create Task</button>
        </div>
      </div>
    </div>
  );
}
