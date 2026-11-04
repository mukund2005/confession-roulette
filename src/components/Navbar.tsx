import React, { useState } from 'react';
import { Copy, Check, LogOut, Shield, Flame, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import type { Player, Room } from '../types/game';
import { audioTheme } from '../utils/audioTheme';
import { HowToPlayModal } from './HowToPlayModal';

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
  const [isMuted, setIsMuted] = useState(audioTheme.getIsMuted());
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const copyRoomCode = () => {
    audioTheme.playClickSound();
    if (!room?.roomCode) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleAudio = () => {
    const muted = audioTheme.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      audioTheme.playClickSound();
    }
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
          {room && (
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

          {/* How to Play Guide Button */}
          <button
            onClick={() => {
              audioTheme.playClickSound();
              setShowHowToPlay(true);
            }}
            className="p-1.5 sm:p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-1.5 text-xs font-serif"
            title="How to Play Rupiko"
          >
            <HelpCircle className="h-4 w-4 text-amber-400" />
            <span className="hidden md:inline">Rules</span>
          </button>

          {/* Bonfire Audio Ambience Toggle */}
          <button
            onClick={handleToggleAudio}
            className={`p-1.5 sm:p-2 rounded-lg border transition-all ${
              isMuted
                ? 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
            title={isMuted ? 'Unmute Campfire Ambience' : 'Mute Campfire Ambience'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 animate-pulse" />}
          </button>

          {/* Bonfire Embers indicator */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-300">
            <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="font-serif">Bonfire Live</span>
          </div>

          {room && (
            <button
              onClick={() => {
                audioTheme.playClickSound();
                onLeaveRoom();
              }}
              className="p-1.5 sm:p-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
              title="Leave Bonfire"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* How to Play Rules Guide Modal */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
    </header>
  );
};
