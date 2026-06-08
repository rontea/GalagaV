
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
  timelineLabel?: string;
  timelineLinkId?: string;
  onTimelineLabelClick?: (timelineId: string) => void;
  onEditClick: (s: Step) => void;
  onToggleShrink: (id: string) => void;
  onQuickStatusUpdate: (id: string, status: string) => void;
}

export const TimelineStepDisplay: React.FC<TimelineStepDisplayProps> = ({
  step, style, statusConfig, StatusIcon, isCompleted, isFailed, timelineLabel, timelineLinkId, onTimelineLabelClick, onEditClick, onToggleShrink, onQuickStatusUpdate
}) => {
  const Icon = style.icon;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3 group/title flex-wrap">
            <h3 
              className={`text-xl font-bold bg-gradient-to-r ${isFailed ? 'from-red-600 to-red-500 dark:from-red-500 dark:to-red-400' : 'from-slate-900 to-slate-700 dark:from-white dark:to-slate-200'} bg-clip-text text-transparent cursor-pointer transition-all duration-200 hover:from-cyan-600 hover:to-cyan-500 dark:hover:from-cyan-400 dark:hover:to-cyan-300 line-clamp-2`} 
              onClick={() => onEditClick(step)}
            >
              {step.title || 'Untitled Task'}
            </h3>
            <button 
              onClick={() => onEditClick(step)} 
              className="opacity-0 group-hover/title:opacity-100 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-200 flex-shrink-0"
              title="Edit task"
            >
              <Edit2 size={16} />
            </button>
            <span className={`text-[11px] font-bold uppercase px-3 py-1.5 rounded-lg border-2 bg-gradient-to-r ${style.bg} ${style.text} ${style.badgeBorder} flex-shrink-0 shadow-sm`}>
              {step.category}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className={`flex items-center gap-2 font-semibold px-2.5 py-1 rounded-lg bg-opacity-10 bg-${statusConfig.color}-600 dark:bg-opacity-20 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-400`}>
              <StatusIcon size={16} className="flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">{statusConfig.label}</span>
            </div>
            {step.createdAt && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                <Calendar size={12} className="flex-shrink-0" />
                {new Date(step.createdAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 flex-wrap justify-end flex-shrink-0">
          {timelineLabel && (
            <button
              type="button"
              onClick={() => timelineLinkId && onTimelineLabelClick?.(timelineLinkId)}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border-2 border-cyan-300 dark:border-cyan-600 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 px-3 py-2 text-[11px] font-bold uppercase text-cyan-700 dark:text-cyan-300 hover:from-cyan-100 hover:to-blue-100 dark:hover:from-cyan-900/60 dark:hover:to-blue-900/60 transition-all duration-200 shadow-sm"
              title={`Open ${timelineLabel}`}
            >
              <span className="text-slate-600 dark:text-slate-400">Timeline:</span>
              <span className="font-black">{timelineLabel}</span>
            </button>
          )}
          {!isCompleted && !isFailed && (
            <button 
              onClick={() => onQuickStatusUpdate(step.id, 'completed')}
              className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-300 dark:border-emerald-800/50 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/60 dark:hover:to-green-900/60 transition-all duration-200 shadow-sm transform hover:scale-105"
              title="Mark as Completed"
            >
              <Check size={18} />
            </button>
          )}
          {(isCompleted || isFailed) && (
            <button 
              onClick={() => onToggleShrink(step.id)}
              className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all duration-200 shadow-sm transform hover:scale-105"
              title="Fold Task"
            >
              <Minimize2 size={18} />
            </button>
          )}
          <div className={`p-2.5 rounded-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 ${style.border} ${style.text} shadow-md`}>
            <Icon size={20} className="flex-shrink-0" />
          </div>
        </div>
      </div>
      <div className="flex-grow flex flex-col gap-6">
        <div 
          className="rich-content text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1 prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: step.content }}
        />
        {step.imageUrl && (
          <div className="max-w-2xl">
            <img 
              src={step.imageUrl} 
              className="max-w-full h-auto rounded-xl cursor-zoom-in shadow-lg border-2 border-slate-200 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105" 
              onClick={() => window.open(step.imageUrl, '_blank')} 
            />
          </div>
        )}
      </div>
    </div>
  );
};
