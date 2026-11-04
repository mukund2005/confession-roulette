import React, { useState } from 'react';
import { Copy, Check, LogOut, Shield, Flame } from 'lucide-react';
import type { Player, Room } from '../types/game';

interface NavbarProps {
  room: Room | null;
  currentPlayer: Player | null;
  onLeaveRoom: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  room,
  currentPlayer,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!room?.roomCode) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full border-b border-white/10 bg-black/90 backdrop-blur-md sticky top-0 z-40 font-serif">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand: Campfire + Rupiko */}
        <div className="flex items-center gap-2.5">
          <img
            src="/campfire.png"
            alt="Rupiko"
            className="h-10 w-10 object-contain drop-shadow-[0_2px_10px_rgba(249,115,22,0.4)]"
          />
          <div className="flex flex-col">
            <span className="text-xl font-serif tracking-normal text-white leading-none">
              Rupiko
            </span>
            <span className="text-[10px] text-white/50 tracking-wider uppercase font-sans">
              Bonfire Confessions
            </span>
          </div>
        </div>

        {/* Room & Player Info */}
        <div className="flex items-center gap-2 sm:gap-3 font-sans">
          {room && !room.isSolo && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[#121214] border border-white/15 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-inner">
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-white/40 uppercase font-semibold">Bonfire</span>
                <span className="text-xs sm:text-sm font-mono font-bold tracking-widest text-[#fbbf24]">
                  {room.roomCode}
                </span>
              </div>
              <button
                onClick={copyRoomCode}
                className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Copy Bonfire Code"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}

          {currentPlayer && (
            <div className="hidden sm:flex items-center gap-2 bg-[#121214] border border-white/15 px-3 py-1.5 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-white/90">
                {currentPlayer.name}
              </span>
              {currentPlayer.isSafe && (
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                  <Shield className="h-3 w-3" /> IMMUNE
                </span>
              )}
            </div>
          )}

          {/* Bonfire Embers indicator */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-300">
            <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="font-serif">Bonfire Live</span>
          </div>

          {room && (
            <button
              onClick={onLeaveRoom}
              className="p-1.5 sm:p-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
              title="Leave Bonfire"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
