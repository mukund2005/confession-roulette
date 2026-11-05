import React, { useState } from 'react';
import {
  X,
  Flame,
  Mic,
  Shield,
  Crown,
  Sparkles,
  CheckCircle2,
  Users,
  Trophy,
  Volume2,
  Gamepad2,
} from 'lucide-react';
import { audioTheme } from '../utils/audioTheme';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'minigame'>('steps');

  if (!isOpen) return null;

  const handleClose = () => {
    audioTheme.playClickSound();
    onClose();
  };

  const steps = [
    {
      num: '1',
      badge: 'LOBBY',
      title: 'Gather Around the Bonfire',
      subtitle: '3 to 6 Campers Required',
      icon: Users,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      bullets: [
        'Join via Quick Play, Browse Public Bonfires, or enter a 4-letter room code.',
        'Choose your camper avatar (Fox, Bear, Wolf, Owl, and more).',
        'Only the Host has the power to light the fire once at least 3 campers are seated.',
      ],
    },
    {
      num: '2',
      badge: 'RECORDING',
      title: 'Whisper Your Secret',
      subtitle: '15–30s Private Voice Note',
      icon: Mic,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      bullets: [
        'Receive a secret spicy confession prompt (or hit Shuffle for a new one).',
        'Hold record and speak into your microphone to seal your confession.',
        'Once all campers record their confessions, the minigame launches automatically!',
      ],
    },
    {
      num: '3',
      badge: 'ROUND 1 MINIGAME',
      title: 'Balloon Popping Frenzy',
      subtitle: '30-Second Synchronized Clicker',
      icon: Gamepad2,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      bullets: [
        'All campers tap and click rising balloons simultaneously.',
        'Pop normal balloons (+1) and rare golden balloons (+3); avoid dark bombs (-2)!',
        'The camper with the highest score is crowned Winner 1 and wins Absolute Immunity!',
      ],
    },
    {
      num: '4',
      badge: 'THE REVEAL',
      title: 'The Bonfire Reveals All',
      subtitle: 'Synchronized Campfire Listening',
      icon: Volume2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      bullets: [
        "Winner 1's confession is permanently locked in the vault—it will NEVER be played!",
        'All other campers have their voice confessions played aloud to everyone around the fire.',
        'Listen together in real time with synchronized waveforms and flame effects.',
      ],
    },
    {
      num: '5',
      badge: 'VICTORY PODIUM',
      title: 'Winner 1 Chooses Winner 2',
      subtitle: 'The Final Twist',
      icon: Crown,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      bullets: [
        'Winner 1 hand-picks one fellow camper to share immunity.',
        'Both winners celebrate together on the victory podium as the ultimate survivors!',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-serif animate-fadeIn select-none">
      <div className="bg-[#121214] border border-white/20 rounded-3xl p-5 sm:p-7 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Flame className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-serif text-white font-bold flex items-center gap-2">
                <span>How To Play Rupiko</span>
                <span className="text-[10px] font-sans font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/30">
                  Quick Guide
                </span>
              </h2>
              <p className="text-xs text-white/50 font-sans">
                The multiplayer game of secret confessions, fast reflexes, and campfire survival.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all active:scale-95"
            title="Close Guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TL;DR Goal Banner */}
        <div className="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 shrink-0 font-sans">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
            <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
            <span>The Objective</span>
          </div>
          <p className="text-xs text-white/90 leading-relaxed">
            Keep your spicy confession safe from being heard! Win the 30-second minigame to lock your secret in the vault forever. Two campers survive—everyone else gets exposed!
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-3 shrink-0 font-sans">
          <button
            type="button"
            onClick={() => {
              audioTheme.playClickSound();
              setActiveTab('steps');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'steps'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>5 Steps to Play</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioTheme.playClickSound();
              setActiveTab('minigame');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'minigame'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            <span>Minigame Rules & Scoring</span>
          </button>
        </div>

        {/* Tab 1: 5 Steps to Play */}
        {activeTab === 'steps' ? (
          <div className="overflow-y-auto pr-1 space-y-3 flex-1 font-sans">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="p-3.5 rounded-2xl bg-black/60 border border-white/10 hover:border-amber-500/30 transition-all flex items-start gap-3.5"
                >
                  <div
                    className={`h-10 w-10 shrink-0 rounded-2xl border flex items-center justify-center font-bold font-serif shadow-md ${step.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        {step.badge}
                      </span>
                      <h3 className="text-sm font-bold text-white font-serif">{step.title}</h3>
                      <span className="text-[11px] text-amber-400 font-medium ml-auto">
                        {step.subtitle}
                      </span>
                    </div>

                    <ul className="text-xs text-white/70 space-y-1 list-disc list-inside mt-1.5">
                      {step.bullets.map((bullet, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Tab 2: Minigame Scoring & Controls */
          <div className="overflow-y-auto pr-1 space-y-3 flex-1 font-sans">
            {/* Scoring Legend */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Balloon Popping Frenzy Points</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <div className="text-2xl mb-1">🎈</div>
                  <div className="text-xs font-bold text-rose-300">Normal Balloon</div>
                  <div className="text-lg font-mono font-black text-white mt-0.5">+1 Point</div>
                  <p className="text-[10px] text-white/50 mt-1">Multi-colored, floats up at steady speed</p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <div className="text-2xl mb-1">⭐</div>
                  <div className="text-xs font-bold text-amber-300">Golden Balloon</div>
                  <div className="text-lg font-mono font-black text-amber-400 mt-0.5">+3 Points!</div>
                  <p className="text-[10px] text-white/50 mt-1">Rare, smaller and faster with golden glow</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/60 border border-red-500/30 text-center">
                  <div className="text-2xl mb-1">💣</div>
                  <div className="text-xs font-bold text-red-400">Bomb Balloon</div>
                  <div className="text-lg font-mono font-black text-red-400 mt-0.5">-2 Points</div>
                  <p className="text-[10px] text-white/50 mt-1">Dark obsidian balloon; do not tap!</p>
                </div>
              </div>
            </div>

            {/* Tie-Breaker & Immunity Info */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2.5">
              <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>Tie-Breakers & Immunity Rules</span>
              </h3>

              <ul className="text-xs text-white/80 space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-amber-300">Earliest Final Pop:</strong> If two or more campers finish with the same top score, the tie is awarded to whoever popped their final balloon first!
                </li>
                <li>
                  <strong className="text-emerald-300">Vault Immunity:</strong> Winner 1 is permanently exempted from confession reveals. Your voice recording stays 100% confidential.
                </li>
                <li>
                  <strong className="text-purple-300">Surviving Together:</strong> Winner 1 then hand-picks a second player to join them on the victory podium.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3.5 border-t border-white/10 shrink-0 flex items-center justify-between font-sans">
          <span className="text-xs text-white/40">
            3–6 Campers • Free Online Multiplayer
          </span>

          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 bg-[#e2e8f0] hover:bg-white text-black font-serif font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>Got It, Let's Play!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
