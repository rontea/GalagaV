import { useRef, useCallback, useState, useEffect } from 'react';
import { Player, Bullet, Enemy, Particle, GameState } from '../types';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const ENEMY_SPEED = 2;

export const useGameLoop = (
  onGameOver: (score: number) => void,
  onScoreUpdate: (score: number) => void
) => {
  // Game State Refs (Mutable for performance)
  const playerRef = useRef<Player>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, width: 30, height: 30, active: true, speed: PLAYER_SPEED, cooldown: 0 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const frameIdRef = useRef<number>(0);
  
  // React State for UI updates only (not per frame)
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    level: 1,
    isPlaying: false,
    isGameOver: false,
    highScore: 0
  });

  // Inputs
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const initLevel = (level: number) => {
    // Generate Grid of Enemies
    const newEnemies: Enemy[] = [];
    const rows = 3 + Math.min(level, 4);
    const cols = 8;
    const startX = 50;
    const startY = 50;
    const spacingX = 50;
    const spacingY = 40;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: Enemy['type'] = 'bee';
        if (r === 0) type = 'boss';
        else if (r === 1) type = 'butterfly';
        
        newEnemies.push({
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          width: 25,
          height: 25,
          active: true,
          type,
          scoreValue: type === 'boss' ? 150 : (type === 'butterfly' ? 80 : 50),
          originalX: startX + c * spacingX,
          originalY: startY + r * spacingY,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
    enemiesRef.current = newEnemies;
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x, y,
        width: 2, height: 2,
        active: true,
        dx: (Math.random() - 0.5) * 4,
        dy: (Math.random() - 0.5) * 4,
        life: 30,
        color
      });
    }
  };

  const update = useCallback(() => {
    if (!gameState.isPlaying || gameState.isGameOver) return;

    // 1. Player Movement
    if (keysPressed.current['ArrowLeft']) playerRef.current.x = Math.max(0, playerRef.current.x - playerRef.current.speed);
    if (keysPressed.current['ArrowRight']) playerRef.current.x = Math.min(CANVAS_WIDTH - playerRef.current.width, playerRef.current.x + playerRef.current.speed);

    // 2. Shooting
    if (playerRef.current.cooldown > 0) playerRef.current.cooldown--;
    if (keysPressed.current[' '] && playerRef.current.cooldown === 0 && playerRef.current.active) {
      bulletsRef.current.push({
        x: playerRef.current.x + playerRef.current.width / 2 - 2,
        y: playerRef.current.y,
        width: 4,
        height: 10,
        dy: -BULLET_SPEED,
        isEnemy: false,
        active: true
      });
      playerRef.current.cooldown = 15; // Fire rate
    }

    // 3. Bullets Physics
    bulletsRef.current.forEach(b => {
      b.y += b.dy;
      if (b.y < 0 || b.y > CANVAS_HEIGHT) b.active = false;
    });

    // 4. Enemy Movement & Logic
    const time = Date.now() / 1000;
    let activeEnemies = 0;
    enemiesRef.current.forEach(e => {
      if (!e.active) return;
      activeEnemies++;

      // Simple hovering motion
      e.x = e.originalX + Math.sin(time + e.phase) * 20;

      // Random Dive Attack (Basic implementation)
      if (Math.random() < 0.001 * levelRef.current) {
        // In a full implementation, state machine for diving would go here
        // For v1.1, we'll just shoot randomly
        bulletsRef.current.push({
          x: e.x + e.width / 2,
          y: e.y + e.height,
          width: 4, 
          height: 10,
          dy: BULLET_SPEED * 0.6,
          isEnemy: true,
          active: true
        });
      }
    });

    if (activeEnemies === 0) {
      // Next Level
      levelRef.current++;
      initLevel(levelRef.current);
      setGameState(prev => ({ ...prev, level: levelRef.current }));
    }

    // 5. Particles
    particlesRef.current.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      p.life--;
      if (p.life <= 0) p.active = false;
    });

    // 6. Collision Detection
    // Player Bullets hitting Enemies
    bulletsRef.current.filter(b => !b.isEnemy && b.active).forEach(b => {
      enemiesRef.current.filter(e => e.active).forEach(e => {
        if (
          b.x < e.x + e.width &&
          b.x + b.width > e.x &&
          b.y < e.y + e.height &&
          b.y + b.height > e.y
        ) {
          e.active = false;
          b.active = false;
          spawnParticles(e.x + e.width/2, e.y + e.height/2, '#ef4444');
          scoreRef.current += e.scoreValue;
          onScoreUpdate(scoreRef.current);
        }
      });
    });

    // Enemy Bullets/Body hitting Player
    if (playerRef.current.active) {
      // Bullet hit
      bulletsRef.current.filter(b => b.isEnemy && b.active).forEach(b => {
        if (
          b.x < playerRef.current.x + playerRef.current.width &&
          b.x + b.width > playerRef.current.x &&
          b.y < playerRef.current.y + playerRef.current.height &&
          b.y + b.height > playerRef.current.y
        ) {
          handlePlayerDeath();
          b.active = false;
        }
      });
      // Body collision
      enemiesRef.current.filter(e => e.active).forEach(e => {
         if (
          e.x < playerRef.current.x + playerRef.current.width &&
          e.x + e.width > playerRef.current.x &&
          e.y < playerRef.current.y + playerRef.current.height &&
          e.y + e.height > playerRef.current.y
        ) {
          handlePlayerDeath();
          e.active = false;
        }
      });
    }

    // Cleanup arrays
    bulletsRef.current = bulletsRef.current.filter(b => b.active);
    particlesRef.current = particlesRef.current.filter(p => p.active);

  }, [gameState.isPlaying, gameState.isGameOver, onScoreUpdate]);

  const handlePlayerDeath = () => {
    spawnParticles(playerRef.current.x, playerRef.current.y, '#3b82f6');
    livesRef.current--;
    playerRef.current.active = false;
    
    setGameState(prev => ({ ...prev, lives: livesRef.current }));

    if (livesRef.current <= 0) {
      setGameState(prev => ({ ...prev, isGameOver: true, isPlaying: false }));
      onGameOver(scoreRef.current);
    } else {
      setTimeout(() => {
        playerRef.current.active = true;
        playerRef.current.x = CANVAS_WIDTH / 2;
        // Temporary invincibility could be added here
      }, 1500);
    }
  };

  const startGame = () => {
    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    bulletsRef.current = [];
    particlesRef.current = [];
    playerRef.current = { ...playerRef.current, active: true, x: CANVAS_WIDTH / 2 };
    
    initLevel(1);
    
    setGameState({
      score: 0,
      lives: 3,
      level: 1,
      isPlaying: true,
      isGameOver: false,
      highScore: gameState.highScore
    });
  };

  // Keyboard Listeners
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
    const handleUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  return {
    playerRef,
    bulletsRef,
    enemiesRef,
    particlesRef,
    gameState,
    startGame,
    update
  };
};
