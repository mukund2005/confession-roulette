import React, { useState } from 'react';
import { Crown, Users, Play, Copy, Check, Bot } from 'lucide-react';
import type { Player, Room } from '../types/game';

interface LobbyStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  onStartGame: () => Promise<void>;
  onAddBot: (botName: string) => Promise<void>;
}

export const LobbyStage: React.FC<LobbyStageProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onStartGame,
  onAddBot,
}) => {
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStartGame();
    } finally {
      setIsStarting(false);
    }
  };

  const handleAddDemoBot = () => {
    const botNames = ['ShadowFox', 'SecretSam', 'MysticMaya', 'ViperEcho', 'WhisperDan'];
    const randomName = botNames[Math.floor(Math.random() * botNames.length)] + '_' + Math.floor(Math.random() * 90 + 10);
    onAddBot(randomName);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Header Info */}
      <div className="text-center mb-8">
        <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
          Stage 1: Gathering Confessors
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">Game Lobby</h1>
        <p className="text-slate-400 text-sm mt-1">
          Share the room code with friends to join the circle of secrets.
        </p>
      </div>

      {/* Room Code Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-xl shadow-xl backdrop-blur-md mb-8">
        <div className="text-center sm:text-left">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Room Code
          </span>
          <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">
            {room.roomCode}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all active:scale-95 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-300" />
                <span>Copy Code</span>
              </>
            )}
          </button>
          <button
            onClick={handleAddDemoBot}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-700/60 transition-all"
            title="Add simulated player for quick testing"
          >
            <Bot className="h-4 w-4 text-cyan-400" />
            <span>+ Bot</span>
          </button>
        </div>
      </div>

      {/* Connected Players Grid */}
      <div className="w-full max-w-2xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Users className="h-4 w-4 text-rose-400" />
            <span>Connected Confessors ({players.length})</span>
          </div>
          <span className="text-xs text-slate-400">Min 2 players recommended</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {players.map((player) => {
            const isPlayerHost = player.id === room.hostId;
            const isMe = player.id === currentPlayer?.id;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isPlayerHost
                        ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">{player.name}</span>
                      {isMe && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      {isPlayerHost ? (
                        <>
                          <Crown className="h-3 w-3 text-amber-400" /> Host
                        </>
                      ) : (
                        'Ready to confess'
                      )}
                    </span>
                  </div>
                </div>

                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Button or Waiting indicator */}
      <div className="w-full max-w-md">
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={isStarting || players.length < 1}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-base tracking-wide shadow-xl shadow-rose-900/50 hover:shadow-rose-900/70 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Starting Confession Stage...
              </span>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" />
                <span>Start Game ({players.length} Players)</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-center gap-2 text-rose-400 mb-1">
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Waiting for host to start
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Make sure your microphone is ready when the confession stage begins.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
