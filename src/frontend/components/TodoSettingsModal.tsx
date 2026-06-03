import React, { useState } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { Contributor } from './TodoManagerView';

export default function TodoSettingsModal({ onClose, statuses, types, collections: modules, contributors, developers, onUpdated }: { onClose: () => void, statuses: string[], types: string[], collections: string[], contributors: Contributor[], developers: Contributor[], onUpdated: () => void }) {
  const [localStatuses, setLocalStatuses] = useState<string[]>([...statuses]);
  const [localTypes, setLocalTypes] = useState<string[]>([...types]);
  const [localModules, setLocalModules] = useState<string[]>([...modules]);
  const [newStatus, setNewStatus] = useState('');
  const [newType, setNewType] = useState('');
  const [newModule, setNewModule] = useState('');
  const [newContributorName, setNewContributorName] = useState('');
  const [newContributorAlias, setNewContributorAlias] = useState('');
  const [newDeveloperName, setNewDeveloperName] = useState('');
  const [newDeveloperAlias, setNewDeveloperAlias] = useState('');

  const saveStatuses = async () => {
    await fetch('/api/addstatuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statuses: localStatuses })
    });
    onUpdated();
  };

  const saveTypes = async () => {
    await fetch('/api/addtypes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ types: localTypes })
    });
    onUpdated();
  };

  const saveModules = async () => {
    await fetch('/api/addcollections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collections: localModules })
    });
    onUpdated();
  };

  const addContributor = async () => {
    if (!newContributorName.trim()) return;
    await fetch('/api/addContributor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newContributorName.trim(), alias: newContributorAlias.trim() })
    });
    setNewContributorName('');
    setNewContributorAlias('');
    onUpdated();
  };

  const addDeveloper = async () => {
    if (!newDeveloperName.trim()) return;
    await fetch('/api/addDeveloper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDeveloperName.trim(), alias: newDeveloperAlias.trim() })
    });
    setNewDeveloperName('');
    setNewDeveloperAlias('');
    onUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">TODO Settings</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Statuses */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Manage Statuses</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {localStatuses.map((st, i) => (
                <span key={i} className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm">
                  {st}
                  <button onClick={() => setLocalStatuses(localStatuses.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newStatus} onChange={e => setNewStatus(e.target.value)} placeholder="New Status..." className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm" />
              <button onClick={() => { if(newStatus.trim() && !localStatuses.includes(newStatus.trim())) { setLocalStatuses([...localStatuses, newStatus.trim()]); setNewStatus(''); } }} className="px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors"><Plus size={16} /></button>
              <button onClick={saveStatuses} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"><Save size={14}/> Save</button>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Types */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Manage Types</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {localTypes.map((ty, i) => (
                <span key={i} className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm">
                  {ty}
                  <button onClick={() => setLocalTypes(localTypes.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newType} onChange={e => setNewType(e.target.value)} placeholder="New Type..." className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm" />
              <button onClick={() => { if(newType.trim() && !localTypes.includes(newType.trim())) { setLocalTypes([...localTypes, newType.trim()]); setNewType(''); } }} className="px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors"><Plus size={16} /></button>
              <button onClick={saveTypes} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"><Save size={14}/> Save</button>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Modules */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Manage Modules</h3>
             <div className="text-xs text-slate-500 mb-3 leading-relaxed">
              Modules group your TODOs into separate folders and files (e.g. <code>todo-&lt;name&gt;.md</code>).
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {localModules.map((col, i) => (
                <span key={i} className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm">
                  {col}
                  <button onClick={() => setLocalModules(localModules.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newModule} onChange={e => setNewModule(e.target.value)} placeholder="New Module (e.g., create-website)..." className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm" />
              <button onClick={() => { if(newModule.trim() && !localModules.includes(newModule.trim())) { setLocalModules([...localModules, newModule.trim()]); setNewModule(''); } }} className="px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors"><Plus size={16} /></button>
              <button onClick={saveModules} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"><Save size={14}/> Save</button>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Contributors */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Contributors</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {contributors.map((c, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-200">{c.name}</div>
                  {c.alias && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">@{c.alias}</div>}
                </div>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); addContributor(); }} className="flex gap-2">
              <input value={newContributorName} onChange={e => setNewContributorName(e.target.value)} placeholder="Full Name..." className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm" />
              <input value={newContributorAlias} onChange={e => setNewContributorAlias(e.target.value)} placeholder="Alias (optional)..." className="w-1/3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm" />
              <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-sm font-medium transition-colors">Add</button>
            </form>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Developers */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Developers</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {developers.map((c, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-200">{c.name}</div>
                  {c.alias && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">@{c.alias}</div>}
                </div>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); addDeveloper(); }} className="flex gap-2">
              <input value={newDeveloperName} onChange={e => setNewDeveloperName(e.target.value)} placeholder="Full Name..." className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm" />
              <input value={newDeveloperAlias} onChange={e => setNewDeveloperAlias(e.target.value)} placeholder="Alias (optional)..." className="w-1/3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm" />
              <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-sm font-medium transition-colors">Add</button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
