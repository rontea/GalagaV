
import React from 'react';
import { Edit2, Calendar, Check, Minimize2 } from 'lucide-react';
import { Step, StatusConfig } from '../types';
import { CategoryStyle } from '../lib/ui-constants';

interface TimelineStepDisplayProps {
  step: Step;
  style: CategoryStyle;
  statusConfig: StatusConfig;
  StatusIcon: React.ElementType;
  isCompleted: boolean;
  isFailed: boolean;
  onEditClick: (s: Step) => void;
  onToggleShrink: (id: string) => void;
  onQuickStatusUpdate: (id: string, status: string) => void;
}

export const TimelineStepDisplay: React.FC<TimelineStepDisplayProps> = ({
  step, style, statusConfig, StatusIcon, isCompleted, isFailed, onEditClick, onToggleShrink, onQuickStatusUpdate
}) => {
  const Icon = style.icon;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-1 group/title">
            <h3 
              className={`text-lg font-bold ${isFailed ? 'text-red-500' : 'text-slate-900 dark:text-white'} cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400`} 
              onClick={() => onEditClick(step)}
            >
              {step.title || 'Untitled Task'}
            </h3>
            <button onClick={() => onEditClick(step)} className="opacity-0 group-hover/title:opacity-100 text-slate-500 dark:text-slate-400">
              <Edit2 size={14} />
            </button>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.badgeBorder}`}>
              {step.category}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase text-${statusConfig.color}-600 dark:text-${statusConfig.color}-500`}>
              <StatusIcon size={14} />
              {statusConfig.label}
            </div>
            {step.createdAt && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono ml-2 border-l pl-2 border-slate-200 dark:border-slate-800">
                <Calendar size={10} />
                {new Date(step.createdAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          {!isCompleted && !isFailed && (
            <button 
              onClick={() => onQuickStatusUpdate(step.id, 'completed')}
              className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
              title="Mark as Completed"
            >
              <Check size={18} />
            </button>
          )}
          {(isCompleted || isFailed) && (
            <button 
              onClick={() => onToggleShrink(step.id)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Fold Task"
            >
              <Minimize2 size={18} />
            </button>
          )}
          <div className={`p-2 rounded-lg bg-white dark:bg-slate-950 border ${style.border} ${style.text}`}>
            <Icon size={20} />
          </div>
        </div>
      </div>
      <div className="flex-grow flex flex-col gap-6">
        <div 
          className="rich-content text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1"
          dangerouslySetInnerHTML={{ __html: step.content }}
        />
        {step.imageUrl && (
          <div className="max-w-xl">
            <img 
              src={step.imageUrl} 
              className="max-w-full h-auto rounded cursor-zoom-in shadow-sm border border-slate-200 dark:border-slate-800" 
              onClick={() => window.open(step.imageUrl, '_blank')} 
            />
          </div>
        )}
      </div>
    </div>
  );
};
