import React from 'react';

interface GameOverModalProps {
  score: number;
  onRestart: () => void;
  onProfile: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ score, onRestart, onProfile }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-[2px]">
      <div className="text-center animate-bounce-slow">
        <h1 className="text-6xl font-arcade text-red-600 mb-4 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
          GAME OVER
        </h1>
        <div className="text-2xl font-arcade text-white mb-8">
          SCORE: <span className="text-yellow-400">{score}</span>
        </div>
        
        <div className="flex flex-col gap-4 items-center">
          <button 
            onClick={onRestart}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 font-arcade text-sm border-2 border-cyan-300 w-64 animate-pulse"
          >
            INSERT COIN (RESTART)
          </button>
          
          <button 
            onClick={onProfile}
            className="text-slate-400 hover:text-white font-arcade text-xs underline"
          >
            EDIT PILOT PROFILE
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
