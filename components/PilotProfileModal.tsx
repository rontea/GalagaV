import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { saveUserProfile, getLocalProfile } from '../services/scoreService';
import { generatePilotCallsign } from '../services/geminiService';
import { Loader2, Sparkles } from 'lucide-react'; // Assuming lucide-react is available, or use SVG if not

interface PilotProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const PilotProfileModal: React.FC<PilotProfileModalProps> = ({ isOpen, onClose, userId }) => {
  const [pilotName, setPilotName] = useState('');
  // Fix: Use UserProfile['themePreference'] to allow 'light' and 'dark' values from saved profile
  const [theme, setTheme] = useState<UserProfile['themePreference']>('retro');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getLocalProfile();
      if (saved) {
        setPilotName(saved.pilotName || '');
        setTheme(saved.themePreference || 'retro');
      }
    }
  }, [isOpen]);

  const handleSave = async () => {
    await saveUserProfile(userId, { pilotName, themePreference: theme });
    onClose();
  };

  const handleAiGenerate = async () => {
    if (!pilotName.trim()) {
      alert("Please enter a name first so the AI can generate a callsign for you!");
      return;
    }
    setLoadingAi(true);
    const callsign = await generatePilotCallsign(pilotName);
    setPilotName(callsign);
    setLoadingAi(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-cyan-500 p-8 rounded-lg max-w-md w-full shadow-[0_0_20px_rgba(6,182,212,0.5)]">
        <h2 className="text-2xl font-arcade text-yellow-400 mb-6 text-center">PILOT ID CARD</h2>
        
        <div className="mb-6">
          <label className="block text-cyan-300 text-xs font-arcade mb-2">CALLSIGN</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              maxLength={10}
              value={pilotName}
              onChange={(e) => setPilotName(e.target.value.toUpperCase())}
              className="bg-black border border-slate-600 text-white font-arcade p-3 flex-1 focus:border-cyan-500 outline-none uppercase"
              placeholder="ENTER NAME"
            />
            <button 
              onClick={handleAiGenerate}
              disabled={loadingAi}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white p-3 border border-fuchsia-400 disabled:opacity-50 transition-colors group relative"
              title="Ask AI for a cool callsign"
            >
              {loadingAi ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
              )}
            </button>
          </div>
          <p className="text-slate-500 text-[10px] mt-1 font-sans">
            Tip: Type your real name and click the star to get an AI-generated callsign.
          </p>
        </div>

        <div className="mb-8">
          <label className="block text-cyan-300 text-xs font-arcade mb-2">THEME</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setTheme('retro')}
              className={`flex-1 py-2 font-arcade text-xs border ${theme === 'retro' ? 'bg-cyan-900 border-cyan-400 text-white' : 'border-slate-700 text-slate-500'}`}
            >
              RETRO
            </button>
            <button 
              onClick={() => setTheme('modern')}
              className={`flex-1 py-2 font-arcade text-xs border ${theme === 'modern' ? 'bg-fuchsia-900 border-fuchsia-400 text-white' : 'border-slate-700 text-slate-500'}`}
            >
              MODERN
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white font-arcade text-xs"
          >
            CANCEL
          </button>
          <button 
            onClick={handleSave}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 font-arcade text-xs border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
};

export default PilotProfileModal;