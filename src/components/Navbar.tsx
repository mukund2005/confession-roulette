import React, { useState } from 'react';
import { Copy, Check, LogOut, Radio, Shield } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Player, Room } from '../types/game';

interface NavbarProps {
  room: Room | null;
  currentPlayer: Player | null;
  onLeaveRoom: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ room, currentPlayer, onLeaveRoom }) => {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!room?.roomCode) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50">
            <Radio className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 text-base sm:text-lg">
                CONFESSION ROULETTE
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Safe & Sound
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              1 Winner is Immune. All other secrets are laid bare.
            </p>
          </div>
        </div>

        {/* Room & Player Info */}
        <div className="flex items-center gap-3">
          {room && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Room Code</span>
                <span className="text-sm font-mono font-bold tracking-widest text-amber-400">
                  {room.roomCode}
                </span>
              </div>
              <button
                onClick={copyRoomCode}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Copy Room Code"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          {currentPlayer && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">
                {currentPlayer.name}
              </span>
              {currentPlayer.isSafe && (
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                  <Shield className="h-3 w-3" /> IMMUNE
                </span>
              )}
            </div>
          )}

          {/* Connection Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border bg-slate-900/60 border-slate-800 text-slate-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
            />
            <span>{isSupabaseConfigured ? 'Supabase Live' : 'Local Sync'}</span>
          </div>

          {room && (
            <button
              onClick={onLeaveRoom}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
              title="Leave Room"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
