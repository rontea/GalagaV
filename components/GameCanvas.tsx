import React, { useRef, useEffect } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { GameState, Player, Bullet, Enemy, Particle } from '../types';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  gameRef: React.MutableRefObject<any>; // Expose game control to parent
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, onScoreUpdate, gameRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    playerRef,
    bulletsRef,
    enemiesRef,
    particlesRef,
    gameState,
    startGame,
    update
  } = useGameLoop(onGameOver, onScoreUpdate);

  // Expose startGame to parent
  React.useImperativeHandle(gameRef, () => ({
    startGame
  }));

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Update Physics
      update();

      // 2. Clear
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Draw Stars (Static background for now)
      ctx.fillStyle = '#ffffff';
      for(let i=0; i<50; i++) {
        const x = (Math.sin(i * 132.1 + Date.now()/10000) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(i * 45.3 + Date.now()/5000) * 0.5 + 0.5) * canvas.height;
        ctx.fillRect(x, y, 1, 1);
      }

      // 4. Draw Player
      const p = playerRef.current;
      if (p.active) {
        ctx.fillStyle = '#3b82f6'; // Tailwind blue-500
        // Draw Ship Shape
        ctx.beginPath();
        ctx.moveTo(p.x + p.width / 2, p.y);
        ctx.lineTo(p.x + p.width, p.y + p.height);
        ctx.lineTo(p.x + p.width / 2, p.y + p.height - 5);
        ctx.lineTo(p.x, p.y + p.height);
        ctx.fill();
        
        // Engine Flame
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(p.x + p.width / 2 - 5, p.y + p.height);
        ctx.lineTo(p.x + p.width / 2 + 5, p.y + p.height);
        ctx.lineTo(p.x + p.width / 2, p.y + p.height + (Math.random() * 10));
        ctx.fill();
      }

      // 5. Draw Enemies
      enemiesRef.current.forEach(e => {
        if (!e.active) return;
        if (e.type === 'boss') ctx.fillStyle = '#10b981'; // Green
        else if (e.type === 'butterfly') ctx.fillStyle = '#f43f5e'; // Rose
        else ctx.fillStyle = '#eab308'; // Yellow

        // Simple Enemy Shape
        ctx.fillRect(e.x, e.y, e.width, e.height);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 5, e.y + 10, 5, 5);
        ctx.fillRect(e.x + e.width - 10, e.y + 10, 5, 5);
      });

      // 6. Draw Bullets
      bulletsRef.current.forEach(b => {
        ctx.fillStyle = b.isEnemy ? '#ef4444' : '#60a5fa';
        ctx.fillRect(b.x, b.y, b.width, b.height);
      });

      // 7. Draw Particles
      particlesRef.current.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life / 30;
        ctx.fillRect(pt.x, pt.y, pt.width, pt.height);
        ctx.globalAlpha = 1.0;
      });

      // UI Overlay if playing
      if (gameState.isPlaying) {
        ctx.font = '20px "Press Start 2P"';
        ctx.fillStyle = 'white';
        // Score handled by React UI, but we can draw level here if we want
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [update, playerRef, enemiesRef, bulletsRef, particlesRef, gameState.isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={800} 
      className="border-4 border-slate-800 rounded-lg shadow-2xl bg-black"
    />
  );
};

export default GameCanvas;
