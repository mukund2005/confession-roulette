import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Flame, Users, Search, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicLobbyInfo } from '../types/game';
import { gameService } from '../services/gameService';
import { getCamperAvatar } from '../utils/avatars';
import { audioTheme } from '../utils/audioTheme';

interface LobbyBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string) => Promise<void>;
  onHostNewRoom: () => void;
}

export const LobbyBrowserModal: React.FC<LobbyBrowserModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  onHostNewRoom,
}) => {
  const [lobbies, setLobbies] = useState<PublicLobbyInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);

  const fetchLobbies = async () => {
    setIsRefreshing(true);
    try {
      const data = await gameService.browsePublicLobbies();
      setLobbies(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLobbies();
      const interval = setInterval(fetchLobbies, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLobbies = lobbies.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return l.roomCode.toLowerCase().includes(q) || l.hostName.toLowerCase().includes(q);
  });

  const handleJoin = async (roomCode: string) => {
    audioTheme.playClickSound();
    setJoiningCode(roomCode);
    try {
      await onJoinRoom(roomCode);
      onClose();
    } finally {
      setJoiningCode(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-serif">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-[#121214] border border-white/20 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <Flame className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-serif text-white flex items-center gap-2">
                  Public Bonfires
                  <span className="text-[11px] font-sans font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {lobbies.length} Live
                  </span>
                </h2>
                <p className="text-xs text-white/50 font-sans">
                  Browse open circles around the campfire or host your own.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                audioTheme.playClickSound();
                onClose();
              }}
              className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row gap-3 items-center justify-between font-sans">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search code or host..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  audioTheme.playClickSound();
                  fetchLobbies();
                }}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
                title="Refresh lobby list"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-white/60'}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioTheme.playClickSound();
                  onClose();
                  onHostNewRoom();
                }}
                className="px-4 py-2 bg-[#fbbf24] hover:bg-white text-black font-serif text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                <span>Host Bonfire</span>
              </button>
            </div>
          </div>

          {/* Lobbies List */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 font-sans">
            {filteredLobbies.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="h-16 w-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                  <Flame className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-serif text-white font-bold">No Open Bonfires</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto mt-1 mb-5">
                  There are no waiting rooms right now. Be the campfire host and light the first flame!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    audioTheme.playClickSound();
                    onClose();
                    onHostNewRoom();
                  }}
                  className="px-6 py-2.5 bg-[#e2e8f0] hover:bg-white text-black font-serif text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                >
                  Create & Host Room
                </button>
              </div>
            ) : (
              filteredLobbies.map((lobby) => {
                const isFull = lobby.playerCount >= lobby.maxPlayers;
                const avatar = getCamperAvatar(lobby.hostAvatar);
                const isJoining = joiningCode === lobby.roomCode;

                return (
                  <motion.div
                    key={lobby.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isFull
                        ? 'bg-black/30 border-white/5 opacity-50'
                        : 'bg-black/60 hover:bg-black/80 border-white/10 hover:border-amber-500/30 shadow-md'
                    }`}
                  >
                    {/* Left: Host & Code */}
                    <div className="flex items-center gap-3.5">
                      <div className={`h-11 w-11 rounded-2xl ${avatar.bgColor} border ${avatar.borderColor} flex items-center justify-center text-xl shadow-inner`}>
                        {avatar.emoji}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-lg text-[#fbbf24] tracking-wider">
                            {lobby.roomCode}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Public
                          </span>
                        </div>
                        <div className="text-xs text-white/70 flex items-center gap-1.5 mt-0.5">
                          <span>Host:</span>
                          <span className="font-semibold text-white">{lobby.hostName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Capacity & Join */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      {/* Player meter */}
                      <div className="text-left sm:text-right">
                        <div className="flex items-center gap-1.5 justify-start sm:justify-end text-xs font-bold text-white/80">
                          <Users className="h-3.5 w-3.5 text-amber-400" />
                          <span>
                            {lobby.playerCount} / {lobby.maxPlayers} Campers
                          </span>
                        </div>
                        {/* 6 Dots Indicator */}
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: lobby.maxPlayers }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 w-3 rounded-full transition-all ${
                                i < lobby.playerCount ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-white/15'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Join Button */}
                      <button
                        type="button"
                        onClick={() => handleJoin(lobby.roomCode)}
                        disabled={isFull || isJoining}
                        className={`px-5 py-2.5 rounded-xl font-serif text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                          isFull
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                            : 'bg-[#e2e8f0] hover:bg-white text-black hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isJoining ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            <span>Joining...</span>
                          </span>
                        ) : isFull ? (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            <span>Full</span>
                          </>
                        ) : (
                          <>
                            <span>Join</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
