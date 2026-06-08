import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type AlertTone = 'success' | 'error' | 'info';

interface AlertItem {
  id: number;
  message: string;
}

interface AlertProviderProps {
  children: ReactNode;
}

const getAlertTone = (message: string): AlertTone => {
  const normalized = message.toLowerCase();
  if (/(failed|error|invalid|required|not found|unknown)/.test(normalized)) return 'error';
  if (/(success|ready|applied|archived|deleted|restored|updated|added|detected)/.test(normalized)) return 'success';
  return 'info';
};

const toneStyles: Record<AlertTone, {
  title: string;
  icon: React.ElementType;
  iconWrap: string;
  iconText: string;
  button: string;
}> = {
  success: {
    title: 'Success',
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    button: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500 shadow-emerald-900/20',
  },
  error: {
    title: 'Action Needed',
    icon: AlertCircle,
    iconWrap: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70',
    iconText: 'text-rose-600 dark:text-rose-400',
    button: 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500 shadow-rose-900/20',
  },
  info: {
    title: 'Notice',
    icon: Info,
    iconWrap: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/70',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    button: 'bg-cyan-600 hover:bg-cyan-500 focus:ring-cyan-500 shadow-cyan-900/20',
  },
};

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [queue, setQueue] = useState<AlertItem[]>([]);
  const [activeAlert, setActiveAlert] = useState<AlertItem | null>(null);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);
  const nextIdRef = useRef(1);

  const showAlert = useCallback((message?: unknown) => {
    const text = String(message ?? '');
    setQueue((current) => [...current, { id: nextIdRef.current++, message: text }]);
  }, []);

  useEffect(() => {
    if (!activeAlert && queue.length > 0) {
      const [nextAlert, ...remaining] = queue;
      setActiveAlert(nextAlert);
      setQueue(remaining);
    }
  }, [activeAlert, queue]);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = showAlert;

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert]);

  useEffect(() => {
    if (!activeAlert) return;

    const timeoutId = window.setTimeout(() => {
      dismissButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        setActiveAlert(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeAlert]);

  const modalContent = useMemo(() => {
    if (!activeAlert) return null;

    const tone = getAlertTone(activeAlert.message);
    const styles = toneStyles[tone];
    const Icon = styles.icon;
    const lines = activeAlert.message.split(/\r?\n/);

    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        aria-describedby="alert-modal-message"
      >
        <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close alert"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 pr-12">
            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl border ${styles.iconWrap}`}>
              <Icon className={`h-6 w-6 ${styles.iconText}`} aria-hidden="true" />
            </div>

            <h3 id="alert-modal-title" className="text-lg font-bold text-slate-950 dark:text-white">
              {styles.title}
            </h3>
            <div id="alert-modal-message" className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {lines.map((line, index) => (
                <p key={`${activeAlert.id}-${index}`}>{line || '\u00a0'}</p>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
            <button
              ref={dismissButtonRef}
              type="button"
              onClick={() => setActiveAlert(null)}
              className={`rounded-lg px-5 py-2 text-xs font-bold uppercase text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${styles.button}`}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }, [activeAlert]);

  return (
    <>
      {children}
      {modalContent}
    </>
  );
};

export default AlertProvider;
