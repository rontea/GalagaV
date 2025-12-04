import React from 'react';
import { Settings, X, ArrowLeft, Sun, Moon, Download } from 'lucide-react';

interface HeaderProps {
  title: string;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onBack?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onDownload?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  isSettingsOpen, 
  onToggleSettings, 
  onBack, 
  theme, 
  onToggleTheme,
  onDownload
}) => {
  return (
    <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-cyan-500 mr-3 shadow-[0_0_10px_rgba(6,182,212,0.5)] animate-pulse"></div>
            <h1 className="text-lg font-bold tracking-wider text-slate-900 dark:text-white font-mono truncate max-w-[200px] sm:max-w-md">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Project */}
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 rounded-md text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors"
              title="Download Project JSON"
            >
              <Download size={18} />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-md text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-yellow-400 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Settings Toggle */}
          <button 
            onClick={onToggleSettings}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-200
              ${isSettingsOpen 
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white shadow-inner' 
                : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-cyan-600 dark:hover:text-cyan-400'}
            `}
          >
            {isSettingsOpen ? (
              <>
                <span className="text-xs font-mono uppercase font-bold hidden sm:inline">Close</span>
                <X size={16} />
              </>
            ) : (
              <>
                <span className="text-xs font-mono uppercase font-bold hidden sm:inline">Settings</span>
                <Settings size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;