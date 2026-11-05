import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Shield, Flame, Sparkles, Play, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Player, Room } from '../types/game';
import { audioTheme } from '../utils/audioTheme';

interface MinigameStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  onStartMinigame: () => Promise<void>;
  onSubmitScore: (score: number, lastPopTimeMs: number) => Promise<void>;
  onCrownWinner: () => Promise<void>;
  onProceedToReveal: () => Promise<void>;
}

interface Balloon {
  id: number;
  x: number;
  y: number;
  radius: number;
  speedY: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobbleOffset: number;
  type: 'normal' | 'golden' | 'bomb';
  color: string;
  popped: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface PopFloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  yOffset: number;
}

const BALLOON_COLORS = [
  '#f43f5e', // Ruby
  '#3b82f6', // Sapphire
  '#10b981', // Emerald
  '#a855f7', // Amethyst
  '#f97316', // Amber orange
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

export const MinigameStage: React.FC<MinigameStageProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onStartMinigame,
  onSubmitScore,
  onCrownWinner,
  onProceedToReveal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronized countdown timings
  const targetEndTime = room.minigameTargetTime || null;
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [readyCountdown, setReadyCountdown] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);

  // Local game state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const scoreRef = useRef(0);
  const lastPopTimestampRef = useRef<number>(0);
  const hasSubmittedRef = useRef(false);
  const crownedRef = useRef(false);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Game entities refs
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatTextsRef = useRef<PopFloatText[]>([]);
  const nextBalloonIdRef = useRef(1);
  const nextTextIdRef = useRef(1);
  const lastSpawnTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Check if winner1 is already crowned
  const winner1 = room.winner1Id ? players.find((p) => p.id === room.winner1Id) || null : null;

  // Beep sound tracking
  const lastBeepSecondRef = useRef<number | null>(null);

  // Synchronized Room Clock Effect
  useEffect(() => {
    if (!targetEndTime) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const startTime = targetEndTime - 30000; // 30s game
      const diffToStart = startTime - now;
      const diffToEnd = targetEndTime - now;

      if (diffToStart > 0) {
        // Pre-game 3-second sync countdown
        const readySec = Math.ceil(diffToStart / 1000);
        setReadyCountdown(readySec);
        setIsPlaying(false);
        setIsEnded(false);

        if (lastBeepSecondRef.current !== readySec) {
          lastBeepSecondRef.current = readySec;
          audioTheme.playCountdownBeep(false);
        }
      } else if (diffToEnd > 0) {
        // Active 30s Balloon Popping Frenzy
        if (readyCountdown !== null) {
          setReadyCountdown(null);
          audioTheme.playCountdownBeep(true); // "GO!" beep
        }
        setIsPlaying(true);
        setIsEnded(false);
        const rem = Math.max(0, Math.ceil(diffToEnd / 1000));
        setSecondsRemaining(rem);

        // Sound cues for final 5 seconds
        if (rem <= 5 && rem > 0 && lastBeepSecondRef.current !== rem) {
          lastBeepSecondRef.current = rem;
          audioTheme.playCountdownBeep(false);
        }
      } else {
        // Game has finished (t = 0)
        setIsPlaying(false);
        setIsEnded(true);
        setSecondsRemaining(0);
        setReadyCountdown(null);

        // Submit client score exactly once
        if (!hasSubmittedRef.current && currentPlayer) {
          hasSubmittedRef.current = true;
          const finalScore = scoreRef.current;
          const finalPop = lastPopTimestampRef.current || now;
          onSubmitScore(finalScore, finalPop).catch((err) =>
            console.warn('Error submitting minigame score:', err)
          );
        }

        // Host triggers Winner 1 crowning after a brief 1.5s grace period for cloud sync
        if (isHost && !crownedRef.current && !room.winner1Id) {
          crownedRef.current = true;
          setTimeout(() => {
            onCrownWinner().catch((err) => console.warn('Error crowning winner:', err));
          }, 1500);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [targetEndTime, isHost, currentPlayer, room.winner1Id, onSubmitScore, onCrownWinner, readyCountdown]);

  // Fire celebratory confetti when Winner 1 is crowned
  useEffect(() => {
    if (winner1) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
        });
      } catch {
        // ignore
      }
    }
  }, [winner1]);

  // Spawn Balloon helper
  const spawnBalloon = useCallback((width: number, height: number) => {
    const rand = Math.random();
    let type: 'normal' | 'golden' | 'bomb' = 'normal';
    let color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    let radius = Math.floor(Math.random() * 12) + 34; // 34 - 46px
    let speedY = Math.random() * 70 + 110; // 110 - 180 px/s

    if (rand < 0.12) {
      // 12% Golden Balloon (+3 pts)
      type = 'golden';
      color = '#fbbf24';
      radius = Math.floor(Math.random() * 6) + 30; // slightly smaller
      speedY = Math.random() * 80 + 140; // slightly faster
    } else if (rand < 0.22) {
      // 10% Bomb Balloon (-2 pts)
      type = 'bomb';
      color = '#27272a';
      radius = Math.floor(Math.random() * 8) + 36;
      speedY = Math.random() * 60 + 90;
    }

    const minX = radius + 20;
    const maxX = Math.max(minX + 20, width - radius - 20);
    const x = Math.random() * (maxX - minX) + minX;
    const y = height + radius + 10;

    const balloon: Balloon = {
      id: nextBalloonIdRef.current++,
      x,
      y,
      radius,
      speedY,
      wobbleSpeed: Math.random() * 0.003 + 0.002,
      wobbleAmount: Math.random() * 20 + 12,
      wobbleOffset: Math.random() * Math.PI * 2,
      type,
      color,
      popped: false,
    };

    balloonsRef.current.push(balloon);
  }, []);

  // Main Canvas Render & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Spawn balloons periodically while game is playing
      if (isPlaying) {
        if (time - lastSpawnTimeRef.current > 420) {
          lastSpawnTimeRef.current = time;
          spawnBalloon(width, height);
          if (Math.random() > 0.6) {
            spawnBalloon(width, height);
          }
        }
      }

      // 1. Update and Draw Balloons
      const activeBalloons: Balloon[] = [];
      for (const b of balloonsRef.current) {
        if (b.popped) continue;

        if (isPlaying) {
          b.y -= b.speedY * dt;
          b.x += Math.sin(time * b.wobbleSpeed + b.wobbleOffset) * b.wobbleAmount * dt;
        }

        // Despawn if floated above screen
        if (b.y < -b.radius * 2) {
          continue;
        }

        activeBalloons.push(b);

        // Draw Balloon String
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.radius + 6);
        ctx.quadraticCurveTo(
          b.x + Math.sin(time * 0.004 + b.id) * 8,
          b.y + b.radius + 24,
          b.x + Math.sin(time * 0.003 + b.id) * 4,
          b.y + b.radius + 38
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw Balloon Body
        ctx.beginPath();
        // Slightly teardrop/elliptical shape
        ctx.ellipse(b.x, b.y, b.radius * 0.88, b.radius, 0, 0, Math.PI * 2);

        if (b.type === 'golden') {
          // Shimmering Golden Gradient
          const grad = ctx.createRadialGradient(
            b.x - b.radius * 0.3,
            b.y - b.radius * 0.3,
            b.radius * 0.1,
            b.x,
            b.y,
            b.radius
          );
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(0.5, '#fbbf24');
          grad.addColorStop(1, '#b45309');
          ctx.fillStyle = grad;

          // Golden halo glow
          ctx.shadowColor = 'rgba(251, 191, 36, 0.7)';
          ctx.shadowBlur = 18;
        } else if (b.type === 'bomb') {
          // Bomb balloon: Dark obsidian with red warning pulse
          const grad = ctx.createRadialGradient(
            b.x - b.radius * 0.3,
            b.y - b.radius * 0.3,
            b.radius * 0.1,
            b.x,
            b.y,
            b.radius
          );
          grad.addColorStop(0, '#52525b');
          grad.addColorStop(0.8, '#18181b');
          grad.addColorStop(1, '#09090b');
          ctx.fillStyle = grad;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
          ctx.shadowBlur = 12;
        } else {
          // Normal colorful balloon
          const grad = ctx.createRadialGradient(
            b.x - b.radius * 0.3,
            b.y - b.radius * 0.3,
            b.radius * 0.1,
            b.x,
            b.y,
            b.radius
          );
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.3, b.color);
          grad.addColorStop(1, '#000000');
          ctx.fillStyle = grad;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 10;
        }

        ctx.fill();
        ctx.restore();

        // Knot at bottom
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(b.x - 4, b.y + b.radius);
        ctx.lineTo(b.x + 4, b.y + b.radius);
        ctx.lineTo(b.x, b.y + b.radius + 6);
        ctx.closePath();
        ctx.fillStyle = b.type === 'golden' ? '#d97706' : b.type === 'bomb' ? '#3f3f46' : b.color;
        ctx.fill();

        // Specular 3D Reflection Highlight
        ctx.beginPath();
        ctx.ellipse(
          b.x - b.radius * 0.35,
          b.y - b.radius * 0.35,
          b.radius * 0.22,
          b.radius * 0.12,
          -Math.PI / 4,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fill();

        // Special Badges
        if (b.type === 'golden') {
          ctx.fillStyle = '#000';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+3★', b.x, b.y);
        } else if (b.type === 'bomb') {
          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', b.x, b.y);
        }

        ctx.restore();
      }
      balloonsRef.current = activeBalloons;

      // 2. Update and Draw Particles
      const activeParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vy += 0.25; // gravity
        p.alpha -= p.decay * dt * 60;

        if (p.alpha > 0) {
          activeParticles.push(p);
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();
        }
      }
      particlesRef.current = activeParticles;

      // 3. Update and Draw Floating Point Indicators
      const activeTexts: PopFloatText[] = [];
      for (const ft of floatTextsRef.current) {
        ft.yOffset += dt * 50;
        ft.alpha -= dt * 1.5;

        if (ft.alpha > 0) {
          activeTexts.push(ft);
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = 'bold 18px "Cinzel", Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = ft.color;
          ctx.shadowColor = ft.color;
          ctx.shadowBlur = 8;
          ctx.fillText(ft.text, ft.x, ft.y - ft.yOffset);
          ctx.restore();
        }
      }
      floatTextsRef.current = activeTexts;

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, spawnBalloon]);

  // Resize canvas according to container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle click / tap on canvas
  const handleCanvasInteraction = (clientX: number, clientY: number) => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // Search balloons in reverse order (topmost first)
    const balloons = balloonsRef.current;
    let hitIndex = -1;

    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      if (b.popped) continue;
      // Generous hit radius (+12px) for comfortable tapping on touchscreens
      const dist = Math.hypot(clickX - b.x, clickY - b.y);
      if (dist <= b.radius + 12) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== -1) {
      const b = balloons[hitIndex];
      b.popped = true;
      lastPopTimestampRef.current = Date.now();

      // Play procedural synthetic pop sound
      audioTheme.playBalloonPop(b.type);

      // Score Delta & Visual Float
      let delta = 1;
      let text = '+1';
      let textColor = '#38bdf8';

      if (b.type === 'golden') {
        delta = 3;
        text = '+3 GOLDEN!';
        textColor = '#fbbf24';
      } else if (b.type === 'bomb') {
        delta = -2;
        text = '-2 BOMB!';
        textColor = '#f87171';
      }

      setScore((prev) => {
        const next = Math.max(0, prev + delta);
        scoreRef.current = next;
        return next;
      });

      setCombo((prev) => prev + 1);

      // Spawn burst particles
      const particleCount = b.type === 'golden' ? 24 : b.type === 'bomb' ? 30 : 16;
      for (let p = 0; p < particleCount; p++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particlesRef.current.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 3 + 2,
          color: b.type === 'golden' ? '#fde047' : b.type === 'bomb' ? '#ef4444' : b.color,
          alpha: 1,
          decay: Math.random() * 0.03 + 0.02,
        });
      }

      // Add floating score text
      floatTextsRef.current.push({
        id: nextTextIdRef.current++,
        x: b.x,
        y: b.y,
        text,
        color: textColor,
        alpha: 1,
        yOffset: 0,
      });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleCanvasInteraction(e.clientX, e.clientY);
  };

  // Host starts minigame
  const handleHostStart = async () => {
    audioTheme.playClickSound();
    setIsStarting(true);
    try {
      await onStartMinigame();
    } finally {
      setIsStarting(false);
    }
  };

  // Host advances to reveal
  const handleProceedToReveal = async () => {
    audioTheme.playClickSound();
    setIsProceeding(true);
    try {
      await onProceedToReveal();
    } finally {
      setIsProceeding(false);
    }
  };

  // Sorted leaderboard for results
  const sortedPlayers = [...players].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }
    // Tie-breaker
    const timeA = a.reactionTimeMs ?? Number.MAX_SAFE_INTEGER;
    const timeB = b.reactionTimeMs ?? Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-3 sm:p-4 max-w-4xl mx-auto font-serif select-none">
      {/* Stage Header */}
      <div className="text-center mb-3">
        <span className="text-xs font-serif tracking-widest text-amber-400 uppercase bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1.5 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Stage 3: Round 1 Minigame
        </span>
        <h1 className="text-2xl sm:text-4xl font-serif text-white mt-1.5">
          Balloon Popping Frenzy
        </h1>
        <p className="text-white/60 text-xs sm:text-sm mt-1 max-w-lg mx-auto font-sans">
          Pop floating balloons to rack up points in 30 seconds. Golden balloons award +3, bombs deduct -2.
          Highest score wins <strong className="text-amber-300">Immunity (Winner 1)</strong>!
        </p>
      </div>

      {/* Main Game Card */}
      <div className="w-full max-w-2xl bg-[#121214] border border-white/15 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        {/* Top Control & HUD Bar */}
        <div className="px-5 py-3.5 bg-black/60 border-b border-white/10 flex items-center justify-between font-sans">
          {/* Synchronized Timer Gauge */}
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center border font-mono font-bold text-sm ${
                secondsRemaining !== null && secondsRemaining <= 5
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <Timer className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-widest block font-bold">
                Time Remaining
              </span>
              <span
                className={`text-base font-mono font-black ${
                  secondsRemaining !== null && secondsRemaining <= 5
                    ? 'text-rose-400 animate-pulse'
                    : 'text-white'
                }`}
              >
                {secondsRemaining !== null ? `${secondsRemaining}s` : '30s'}
              </span>
            </div>
          </div>

          {/* Player Active Score Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-white/40 uppercase tracking-widest block font-bold">
                Your Score
              </span>
              <span className="text-xl font-mono font-black text-[#fbbf24]">{score} pts</span>
            </div>
            {combo > 2 && (
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 animate-bounce">
                {combo}x Combo!
              </span>
            )}
          </div>
        </div>

        {/* Canvas Balloon Arena */}
        <div className="relative w-full h-[400px] sm:h-[460px] bg-gradient-to-b from-slate-950 via-[#09090b] to-black overflow-hidden touch-none cursor-crosshair">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            className="w-full h-full block"
          />

          {/* State 1: Host Waiting / Lobby Pre-start */}
          {!targetEndTime && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10 animate-bounce">
                <Flame className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-serif text-white mb-2">Ready for the Frenzy?</h2>
              <p className="text-xs text-white/60 max-w-sm mb-6 font-sans">
                All 4 campers will start popping simultaneously for 30 seconds. Fast reflexes and accuracy win!
              </p>

              {isHost ? (
                <button
                  onClick={handleHostStart}
                  disabled={isStarting}
                  className="px-8 py-3.5 bg-[#e2e8f0] hover:bg-white text-black font-serif text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-40 flex items-center gap-2"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{isStarting ? 'Launching Frenzy...' : 'Launch 30s Balloon Frenzy'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl font-sans">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Waiting for the host to ignite the Balloon Frenzy...</span>
                </div>
              )}
            </div>
          )}

          {/* State 2: Ready Countdown (3... 2... 1... POP!) */}
          {readyCountdown !== null && readyCountdown > 0 && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center z-20 animate-fadeIn">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">
                GET READY
              </span>
              <div className="text-7xl sm:text-8xl font-serif font-black text-white animate-scaleUp">
                {readyCountdown}
              </div>
              <p className="text-xs text-white/50 mt-3 font-sans">Synchronizing all campers...</p>
            </div>
          )}

          {/* State 3: Game Ended & Results Overlay */}
          {isEnded && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 overflow-y-auto">
              <div className="max-w-md w-full">
                {winner1 ? (
                  /* Winner 1 Podium Announcement */
                  <div className="mb-4">
                    <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mb-2 shadow-xl animate-bounce">
                      <Trophy className="h-8 w-8" />
                    </div>
                    <span className="text-[11px] font-sans font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                      Winner 1 Crowned
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif text-white font-bold mt-2">
                      {winner1.name} Wins Immunity!
                    </h2>
                    <p className="text-xs text-emerald-400 font-sans mt-1 flex items-center justify-center gap-1.5 font-semibold">
                      <Shield className="h-3.5 w-3.5" /> Confession is Permanently Protected & Sealed
                    </p>
                  </div>
                ) : (
                  /* Tallying Scores */
                  <div className="py-6">
                    <div className="h-12 w-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <h3 className="text-xl font-serif text-white">Tallying Balloon Scores...</h3>
                    <p className="text-xs text-white/50 font-sans mt-1">
                      Verifying cloud scores and tie-breakers across all 4 campers.
                    </p>
                  </div>
                )}

                {/* Final Standings Leaderboard */}
                <div className="bg-[#18181b] border border-white/10 rounded-2xl p-4 mb-4 text-left font-sans">
                  <div className="flex items-center justify-between text-xs font-bold text-white/60 uppercase tracking-wider mb-2.5 pb-2 border-b border-white/10">
                    <span>Camper</span>
                    <span>Balloons Popped</span>
                  </div>

                  <div className="space-y-2">
                    {sortedPlayers.map((p, idx) => {
                      const isTop = idx === 0;
                      const isMe = p.id === currentPlayer?.id;

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            isTop
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 font-bold'
                              : isMe
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-black/40 border-white/5 text-white/70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white/40 w-4">#{idx + 1}</span>
                            <span>{p.name}</span>
                            {isMe && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">
                                YOU
                              </span>
                            )}
                            {isTop && (
                              <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-bold">
                                IMMUNE
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-sm">
                            {p.score || 0} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Next Stage Button for Host */}
                {winner1 && (
                  <div>
                    {isHost ? (
                      <button
                        onClick={handleProceedToReveal}
                        disabled={isProceeding}
                        className="w-full py-3.5 bg-[#e2e8f0] hover:bg-white text-black font-serif text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        <Flame className="h-4 w-4 text-amber-600 fill-current" />
                        <span>
                          {isProceeding
                            ? 'Gathering around the fire...'
                            : 'Proceed to Synchronized Confessions'}
                        </span>
                      </button>
                    ) : (
                      <div className="text-center text-xs text-white/50 font-sans">
                        Waiting for the host to gather everyone around the fire to hear remaining confessions...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Legend */}
        <div className="p-3 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-[11px] text-white/60 font-sans">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block shadow-sm" />
            Normal Balloon (+1 pt)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
            Golden Balloon (+3 pts)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700 border border-red-500/50 inline-block shadow-sm" />
            Bomb Balloon (-2 pts)
          </span>
        </div>
      </div>
    </div>
  );
};
