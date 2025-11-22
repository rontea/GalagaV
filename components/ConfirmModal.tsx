import React, { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  isDanger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, confirmLabel = "Confirm", isDanger = false 
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Trap focus or at least focus the confirm button on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-desc"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
          <h3 
            id="modal-title"
            className={`text-lg font-bold mb-2 ${isDanger ? 'text-rose-600 dark:text-rose-500' : 'text-slate-900 dark:text-white'} flex items-center gap-2`}
          >
            {isDanger && (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            )}
            {title}
          </h3>
          <p id="modal-desc" className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            {message}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950/50 p-4 flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold uppercase rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
            aria-label="Cancel action"
          >
            Cancel
          </button>
          <button 
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`px-6 py-2 text-white text-xs font-bold uppercase rounded shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20 focus:ring-rose-500' 
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20 focus:ring-cyan-500'
            }`}
            aria-label={`${confirmLabel} action`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;