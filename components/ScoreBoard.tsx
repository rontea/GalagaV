import React, { useEffect, useState } from 'react';
import { getHighScores } from '../services/scoreService';
import { HighScore } from '../types';

interface ScoreBoardProps {
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, lives, level, gameOver }) => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  useEffect(() => {
    if (gameOver) {
      getHighScores().then(setHighScores);
    }
  }, [gameOver]);

  // Initial load
  useEffect(() => {
    getHighScores().then(setHighScores);
  }, []);

  return (
    <div className="w-full max-w-[600px] flex flex-col gap-4 font-arcade text-white">
      {/* HUD */}
      <div className="flex justify-between items-end border-b-2 border-slate-700 pb-2 mb-2">
        <div className="text-red-500 flex flex-col">
          <span className="text-xs mb-1">1UP</span>
          <span className="text-xl">{score.toString().padStart(6, '0')}</span>
        </div>
        <div className="text-yellow-500 flex flex-col items-center">
          <span className="text-xs mb-1">HIGH SCORE</span>
          <span className="text-xl">
             {highScores[0]?.score ? Math.max(score, highScores[0].score).toString().padStart(6, '0') : score.toString().padStart(6, '0')}
          </span>
        </div>
      </div>

      <div className="flex justify-between text-sm text-cyan-400">
        <div>LIVES: {'A'.repeat(Math.max(0, lives))}</div>
        <div>LEVEL: {level}</div>
      </div>

      {/* High Score Table (Only show when game over or not started) */}
      {gameOver && (
        <div className="mt-8 bg-slate-900 p-6 rounded border border-slate-700">
          <h3 className="text-center text-yellow-400 mb-4 text-lg">TOP COMMANDERS</h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-6 gap-2 text-slate-400 border-b border-slate-700 pb-2 mb-2">
              <span className="col-span-1">RNK</span>
              <span className="col-span-2">SCORE</span>
              <span className="col-span-3 text-right">PILOT</span>
            </div>
            {highScores.map((hs, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-2">
                <span className={`col-span-1 ${idx === 0 ? 'text-yellow-400' : 'text-slate-300'}`}>
                  {idx + 1}
                </span>
                <span className="col-span-2 text-white">
                  {hs.score.toString().padStart(6, ' ')}
                </span>
                <span className="col-span-3 text-right text-cyan-300 uppercase truncate">
                  {hs.pilotName || 'UNKNOWN'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreBoard;
