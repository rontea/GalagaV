
import React from 'react';
import { Project } from '../../../types';

interface PluginProps {
  project: Project;
  onSave: (updatedProject: Project) => void;
  theme: 'light' | 'dark';
  onNotify: (msg: string) => void;
}

/**
 * Microsoft 365 System Theme Component
 * Information block showing the current design system tokens.
 */
const Microsoft365Theme: React.FC<PluginProps> = ({ theme, onNotify }) => {
  React.useEffect(() => {
    onNotify("Microsoft 365 Productivity Environment Engaged.");
  }, []);

  return (
    <div className="p-16 flex flex-col items-center justify-center text-center font-sans h-full bg-[#faf9f8] dark:bg-[#201f1e] text-[#323130] dark:text-[#ffffff]">
      <div className="w-20 h-20 bg-[#0078d4] rounded-lg flex items-center justify-center text-white mb-8 shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </div>
      <h1 className="text-3xl font-semibold mb-3 tracking-tight">Microsoft 365 Design System</h1>
      <p className="text-[#605e5c] dark:text-[#c8c6c4] max-w-lg text-base leading-relaxed mb-10">
        The dashboard is optimized with Fluent UI design tokens. Experience a clean, accessible, and high-performance interface designed for modern productivity.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
        <TokenCard label="Primary Blue" value="#0078d4" bg="bg-[#0078d4]" text="text-white" />
        <TokenCard label="Neutral" value={theme === 'dark' ? '#201f1e' : '#faf9f8'} bg={theme === 'dark' ? 'bg-[#201f1e]' : 'bg-[#faf9f8]'} text={theme === 'dark' ? 'text-white' : 'text-[#323130]'} />
        <TokenCard label="Typography" value="Segoe UI" bg="bg-white" text="text-black" />
      </div>
    </div>
  );
};

const TokenCard: React.FC<{ label: string, value: string, bg: string, text: string }> = ({ label, value, bg, text }) => (
  <div className="bg-white dark:bg-[#292827] p-4 rounded border border-[#edebe9] dark:border-[#323130] shadow-sm flex flex-col items-center">
    <div className={`w-10 h-10 ${bg} rounded-sm border border-black/5 mb-2`}></div>
    <span className="text-[10px] uppercase font-bold text-[#605e5c] mb-1">{label}</span>
    <span className={`text-xs font-mono font-bold ${text}`}>{value}</span>
  </div>
);

const plugin = {
  Component: Microsoft365Theme
};

export default plugin;
