
import React from 'react';
import { Save, Upload, X } from 'lucide-react';
import { Step, StatusConfig, Snippet } from '../types';
import { CategoryStyle, toLocalISOString } from '../lib/ui-constants';
import { RichTextEditor } from './RichTextEditor';

interface TimelineStepEditFormProps {
  editFormData: Partial<Step>;
  allCategories: Record<string, CategoryStyle>;
  allStatuses: Record<string, StatusConfig>;
  snippets?: Snippet[];
  handlers: {
    updateField: (field: keyof Step, val: any) => void;
    handleCancelEdit: () => void;
    handleSaveStep: () => void;
    handleMainImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

export const TimelineStepEditForm: React.FC<TimelineStepEditFormProps> = ({
  editFormData, allCategories, allStatuses, snippets, handlers
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 mr-4">
            <label className="text-[10px] uppercase font-bold text-cyan-600 mb-1">Editing Task</label>
            <input 
              className="bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none w-full" 
              value={editFormData.title} 
              onChange={e => handlers.updateField('title', e.target.value)} 
              autoFocus 
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col w-32">
            <label className="text-[9px] uppercase font-bold text-slate-500 mb-1">Category</label>
            <select 
              value={editFormData.category} 
              onChange={e => handlers.updateField('category', e.target.value)} 
              className="bg-white dark:bg-slate-950 border border-slate-300 text-xs rounded p-1.5"
            >
              {Object.keys(allCategories).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex flex-col w-32">
            <label className="text-[9px] uppercase font-bold text-slate-500 mb-1">Status</label>
            <select 
              value={editFormData.status} 
              onChange={e => handlers.updateField('status', e.target.value)} 
              className="bg-white dark:bg-slate-950 border border-slate-300 text-xs rounded p-1.5"
            >
              {(Object.values(allStatuses) as StatusConfig[]).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col w-40">
            <label className="text-[9px] uppercase font-bold text-slate-500 mb-1">Created At</label>
            <input 
              type="datetime-local" 
              value={toLocalISOString(editFormData.createdAt)} 
              onChange={e => handlers.updateField('createdAt', new Date(e.target.value).getTime())} 
              className="bg-white dark:bg-slate-950 border border-slate-300 text-xs rounded p-1.5" 
            />
          </div>
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Step Details</label>
        <RichTextEditor 
          value={editFormData.content || ''} 
          onChange={val => handlers.updateField('content', val)} 
          placeholder="Step details..." 
          className="mb-6"
          snippets={snippets}
        />
      </div>
      <div className="mb-6">
        <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Reference Schematic</label>
        <div className="flex items-center gap-4">
          {editFormData.imageUrl && (
            <div className="relative group/img">
              <img src={editFormData.imageUrl} className="h-24 w-40 object-cover rounded shadow-sm" />
              <button 
                onClick={() => handlers.updateField('imageUrl', undefined)} 
                className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="h-24 w-40 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded bg-slate-50 dark:bg-slate-950/50"
          >
            <Upload size={24} className="text-slate-400" />
            <span className="text-[9px] uppercase font-bold">Attach Image</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlers.handleMainImageUpload} className="hidden" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button onClick={handlers.handleCancelEdit} className="px-4 py-2 text-slate-500 text-xs font-bold uppercase">Cancel</button>
        <button onClick={handlers.handleSaveStep} className="px-6 py-2 bg-cyan-600 text-white rounded font-bold text-xs uppercase shadow-lg flex items-center gap-2">
          <Save size={14} />Save Changes
        </button>
      </div>
    </div>
  );
};
