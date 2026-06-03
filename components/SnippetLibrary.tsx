
import React, { useState } from 'react';
import { Project, Snippet } from '../types';
import { Plus, Trash2, Edit2, Save, X, BookOpen } from 'lucide-react';

interface SnippetLibraryProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

export const SnippetLibrary: React.FC<SnippetLibraryProps> = ({ project, onUpdateProject }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Snippet>>({ name: '', content: '' });

  const snippets = project.snippets || [];

  const handleAdd = () => {
    if (!formData.name?.trim() || !formData.content?.trim()) return;
    const newSnippet: Snippet = {
      id: `snippet_${Date.now()}`,
      name: formData.name.trim(),
      content: formData.content.trim(),
    };
    onUpdateProject({
      ...project,
      snippets: [...snippets, newSnippet],
    });
    setFormData({ name: '', content: '' });
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editingId || !formData.name?.trim() || !formData.content?.trim()) return;
    onUpdateProject({
      ...project,
      snippets: snippets.map((s) =>
        s.id === editingId ? { ...s, name: formData.name!.trim(), content: formData.content!.trim() } : s
      ),
    });
    setEditingId(null);
    setFormData({ name: '', content: '' });
  };

  const handleDelete = (id: string) => {
    onUpdateProject({
      ...project,
      snippets: snippets.filter((s) => s.id !== id),
    });
  };

  const startEdit = (snippet: Snippet) => {
    setEditingId(snippet.id);
    setFormData({ name: snippet.name, content: snippet.content });
    setIsAdding(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <BookOpen className="text-cyan-500" />
            Snippet Library
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage reusable terms and snippets. Use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-cyan-600">@</code> in the editor to insert them.
          </p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus size={18} />
            Add Snippet
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {editingId ? 'Edit Snippet' : 'New Snippet'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Snippet Name (Trigger)</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                placeholder="e.g. api_endpoint"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all min-h-[100px]"
                placeholder="The text to be inserted..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData({ name: '', content: '' });
                }}
                className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase hover:text-slate-700 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={editingId ? handleSaveEdit : handleAdd}
                className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase hover:opacity-90 transition-all"
              >
                <Save size={14} />
                {editingId ? 'Save Changes' : 'Create Snippet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {snippets.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <BookOpen className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No snippets yet. Add your first reusable term!</p>
          </div>
        ) : (
          snippets.map((snippet) => (
            <div
              key={snippet.id}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-cyan-500/50 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <span className="text-xs font-bold">@</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                    {snippet.name}
                  </h4>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(snippet)}
                    className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-lg transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(snippet.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 font-mono bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                {snippet.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
