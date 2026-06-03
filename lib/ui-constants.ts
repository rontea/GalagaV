
import { LucideIcon, Layout, Database, Palette, Circle, Clock, CheckCircle2, AlertOctagon, Tag } from 'lucide-react';
import { CategoryConfig, StatusConfig } from '../types';

export interface CategoryStyle {
  color: string;
  icon: LucideIcon;
  bg: string;
  border: string;
  text: string;
  badgeBorder: string;
}

/* 
  Tailwind Safelist for dynamic colors used in categories and statuses:
  bg-slate-50 bg-red-50 bg-orange-50 bg-amber-50 bg-yellow-50 bg-lime-50 bg-green-50 bg-emerald-50 bg-teal-50 bg-cyan-50 bg-sky-50 bg-blue-50 bg-indigo-50 bg-violet-50 bg-purple-50 bg-fuchsia-50 bg-pink-50 bg-rose-50
  dark:bg-slate-950/20 dark:bg-red-950/20 dark:bg-orange-950/20 dark:bg-amber-950/20 dark:bg-yellow-950/20 dark:bg-lime-950/20 dark:bg-green-950/20 dark:bg-emerald-950/20 dark:bg-teal-950/20 dark:bg-cyan-950/20 dark:bg-sky-950/20 dark:bg-blue-950/20 dark:bg-indigo-950/20 dark:bg-violet-950/20 dark:bg-purple-950/20 dark:bg-fuchsia-950/20 dark:bg-pink-950/20 dark:bg-rose-950/20
  border-slate-200 border-red-200 border-orange-200 border-amber-200 border-yellow-200 border-lime-200 border-green-200 border-emerald-200 border-teal-200 border-cyan-200 border-sky-200 border-blue-200 border-indigo-200 border-violet-200 border-purple-200 border-fuchsia-200 border-pink-200 border-rose-200
  dark:border-slate-500/30 dark:border-red-500/30 dark:border-orange-500/30 dark:border-amber-500/30 dark:border-yellow-500/30 dark:border-lime-500/30 dark:border-green-500/30 dark:border-emerald-500/30 dark:border-teal-500/30 dark:border-cyan-500/30 dark:border-sky-500/30 dark:border-blue-500/30 dark:border-indigo-500/30 dark:border-violet-500/30 dark:border-purple-500/30 dark:border-fuchsia-500/30 dark:border-pink-500/30 dark:border-rose-500/30
  border-slate-300 border-red-300 border-orange-300 border-amber-300 border-yellow-300 border-lime-300 border-green-300 border-emerald-300 border-teal-300 border-cyan-300 border-sky-300 border-blue-300 border-indigo-300 border-violet-300 border-purple-300 border-fuchsia-300 border-pink-300 border-rose-300
  dark:border-slate-500/50 dark:border-red-500/50 dark:border-orange-500/50 dark:border-amber-500/50 dark:border-yellow-500/50 dark:border-lime-500/50 dark:border-green-500/50 dark:border-emerald-500/50 dark:border-teal-500/50 dark:border-cyan-500/50 dark:border-sky-500/50 dark:border-blue-500/50 dark:border-indigo-500/50 dark:border-violet-500/50 dark:border-purple-500/50 dark:border-fuchsia-500/50 dark:border-pink-500/50 dark:border-rose-500/50
  text-slate-600 text-red-600 text-orange-600 text-amber-600 text-yellow-600 text-lime-600 text-green-600 text-emerald-600 text-teal-600 text-cyan-600 text-sky-600 text-blue-600 text-indigo-600 text-violet-600 text-purple-600 text-fuchsia-600 text-pink-600 text-rose-600
  dark:text-slate-400 dark:text-red-400 dark:text-orange-400 dark:text-amber-400 dark:text-yellow-400 dark:text-lime-400 dark:text-green-400 dark:text-emerald-400 dark:text-teal-400 dark:text-cyan-400 dark:text-sky-400 dark:text-blue-400 dark:text-indigo-400 dark:text-violet-400 dark:text-purple-400 dark:text-fuchsia-400 dark:text-pink-400 dark:text-rose-400
*/

export const createCategoryStyle = (color: string, Icon: LucideIcon): CategoryStyle => ({
  color,
  icon: Icon,
  bg: `bg-${color}-50 dark:bg-${color}-950/20`,
  border: `border-${color}-200 dark:border-${color}-500/30`,
  badgeBorder: `border-${color}-300 dark:border-${color}-500/50`,
  text: `text-${color}-600 dark:text-${color}-400`
});

// Explicitly define all possible dynamic classes so Tailwind's compiler picks them up
export const TAILWIND_SAFELIST = [
  'bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500',
  'text-slate-500', 'text-red-500', 'text-orange-500', 'text-amber-500', 'text-yellow-500', 'text-lime-500', 'text-green-500', 'text-emerald-500', 'text-teal-500', 'text-cyan-500', 'text-sky-500', 'text-blue-500', 'text-indigo-500', 'text-violet-500', 'text-purple-500', 'text-fuchsia-500', 'text-pink-500', 'text-rose-500',
  'bg-slate-50', 'bg-red-50', 'bg-orange-50', 'bg-amber-50', 'bg-yellow-50', 'bg-lime-50', 'bg-green-50', 'bg-emerald-50', 'bg-teal-50', 'bg-cyan-50', 'bg-sky-50', 'bg-blue-50', 'bg-indigo-50', 'bg-violet-50', 'bg-purple-50', 'bg-fuchsia-50', 'bg-pink-50', 'bg-rose-50',
  'dark:bg-slate-950/20', 'dark:bg-red-950/20', 'dark:bg-orange-950/20', 'dark:bg-amber-950/20', 'dark:bg-yellow-950/20', 'dark:bg-lime-950/20', 'dark:bg-green-950/20', 'dark:bg-emerald-950/20', 'dark:bg-teal-950/20', 'dark:bg-cyan-950/20', 'dark:bg-sky-950/20', 'dark:bg-blue-950/20', 'dark:bg-indigo-950/20', 'dark:bg-violet-950/20', 'dark:bg-purple-950/20', 'dark:bg-fuchsia-950/20', 'dark:bg-pink-950/20', 'dark:bg-rose-950/20',
  'dark:bg-slate-900/20', 'dark:bg-red-900/20', 'dark:bg-orange-900/20', 'dark:bg-amber-900/20', 'dark:bg-yellow-900/20', 'dark:bg-lime-900/20', 'dark:bg-green-900/20', 'dark:bg-emerald-900/20', 'dark:bg-teal-900/20', 'dark:bg-cyan-900/20', 'dark:bg-sky-900/20', 'dark:bg-blue-900/20', 'dark:bg-indigo-900/20', 'dark:bg-violet-900/20', 'dark:bg-purple-900/20', 'dark:bg-fuchsia-900/20', 'dark:bg-pink-900/20', 'dark:bg-rose-900/20',
  'border-slate-200', 'border-red-200', 'border-orange-200', 'border-amber-200', 'border-yellow-200', 'border-lime-200', 'border-green-200', 'border-emerald-200', 'border-teal-200', 'border-cyan-200', 'border-sky-200', 'border-blue-200', 'border-indigo-200', 'border-violet-200', 'border-purple-200', 'border-fuchsia-200', 'border-pink-200', 'border-rose-200',
  'dark:border-slate-500/30', 'dark:border-red-500/30', 'dark:border-orange-500/30', 'dark:border-amber-500/30', 'dark:border-yellow-500/30', 'dark:border-lime-500/30', 'dark:border-green-500/30', 'dark:border-emerald-500/30', 'dark:border-teal-500/30', 'dark:border-cyan-500/30', 'dark:border-sky-500/30', 'dark:border-blue-500/30', 'dark:border-indigo-500/30', 'dark:border-violet-500/30', 'dark:border-purple-500/30', 'dark:border-fuchsia-500/30', 'dark:border-pink-500/30', 'dark:border-rose-500/30',
  'border-slate-300', 'border-red-300', 'border-orange-300', 'border-amber-300', 'border-yellow-300', 'border-lime-300', 'border-green-300', 'border-emerald-300', 'border-teal-300', 'border-cyan-300', 'border-sky-300', 'border-blue-300', 'border-indigo-300', 'border-violet-300', 'border-purple-300', 'border-fuchsia-300', 'border-pink-300', 'border-rose-300',
  'dark:border-slate-500/50', 'dark:border-red-500/50', 'dark:border-orange-500/50', 'dark:border-amber-500/50', 'dark:border-yellow-500/50', 'dark:border-lime-500/50', 'dark:border-green-500/50', 'dark:border-emerald-500/50', 'dark:border-teal-500/50', 'dark:border-cyan-500/50', 'dark:border-sky-500/50', 'dark:border-blue-500/50', 'dark:border-indigo-500/50', 'dark:border-violet-500/50', 'dark:border-purple-500/50', 'dark:border-fuchsia-500/50', 'dark:border-pink-500/50', 'dark:border-rose-500/50',
  'text-slate-600', 'text-red-600', 'text-orange-600', 'text-amber-600', 'text-yellow-600', 'text-lime-600', 'text-green-600', 'text-emerald-600', 'text-teal-600', 'text-cyan-600', 'text-sky-600', 'text-blue-600', 'text-indigo-600', 'text-violet-600', 'text-purple-600', 'text-fuchsia-600', 'text-pink-600', 'text-rose-600',
  'dark:text-slate-400', 'dark:text-red-400', 'dark:text-orange-400', 'dark:text-amber-400', 'dark:text-yellow-400', 'dark:text-lime-400', 'dark:text-green-400', 'dark:text-emerald-400', 'dark:text-teal-400', 'dark:text-cyan-400', 'dark:text-sky-400', 'dark:text-blue-400', 'dark:text-indigo-400', 'dark:text-violet-400', 'dark:text-purple-400', 'dark:text-fuchsia-400', 'dark:text-pink-400', 'dark:text-rose-400',
  'dark:text-slate-500', 'dark:text-red-500', 'dark:text-orange-500', 'dark:text-amber-500', 'dark:text-yellow-500', 'dark:text-lime-500', 'dark:text-green-500', 'dark:text-emerald-500', 'dark:text-teal-500', 'dark:text-cyan-500', 'dark:text-sky-500', 'dark:text-blue-500', 'dark:text-indigo-500', 'dark:text-violet-500', 'dark:text-purple-500', 'dark:text-fuchsia-500', 'dark:text-pink-500', 'dark:text-rose-500'
];

export const BASE_CATEGORIES: Record<string, CategoryStyle> = {
  frontend: createCategoryStyle('cyan', Layout),
  backend: createCategoryStyle('violet', Database),
  design: createCategoryStyle('rose', Palette)
};

export const BASE_STATUSES: Record<string, StatusConfig> = {
  'pending': { key: 'pending', label: 'Pending', color: 'slate', icon: 'Circle' },
  'in-progress': { key: 'in-progress', label: 'In Progress', color: 'amber', icon: 'Clock' },
  'completed': { key: 'completed', label: 'Completed', color: 'emerald', icon: 'CheckCircle2' },
  'failed': { key: 'failed', label: 'Failed', color: 'red', icon: 'AlertOctagon' }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard API failed, trying fallback...", err);
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    return result;
  } catch (err) {
    console.error("Copy failed", err);
    return false;
  }
};

export const toLocalISOString = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
