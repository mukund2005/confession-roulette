import React, { useState, useEffect, useMemo } from 'react';
import { Users, PhoneCall, Clock, Sparkles, MessageCircle, Mic, ArrowRight, Volume2 } from 'lucide-react';
import type { Player, Room } from '../types/game';
import { useWebRTCBreakout } from '../hooks/useWebRTCBreakout';
import { AudioVisualizer } from './AudioVisualizer';
import { audioTheme } from '../utils/audioTheme';

interface BreakoutStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  onAdvanceRound: (nextRound: number) => Promise<void>;
  onFinishBreakouts: () => Promise<void>;
}

const SPEED_TALK_TOPICS = [
  "What's your most controversial food opinion?",
  "Tell a quick embarrassing childhood memory in 15 seconds!",
  "What is the most chaotic thing you did in high school?",
  "Pitch a terrible movie idea right now!",
  "What is something you pretend to understand but really don't?",
];

const BOT_TOPIC_RESPONSES: Record<string, string[]> = {
  Milo: [
    "Honestly? Putting ketchup on mac and cheese is elite and I will die on this hill!",
    "In second grade I called my teacher mom and then started crying because everyone laughed!",
    "I once convinced the entire cafeteria that tomorrow was pajama day. Half the school showed up in onesies!",
    "A horror movie where people get chased by sentient Wi-Fi routers that disconnect right before you call for help.",
    "Crypto and NFTs. I just nod whenever someone starts talking about the blockchain.",
  ],
  Zara: [
    "Pineapple pizza is amazing, especially paired with barbecue sauce and red onions.",
    "I walked into a glass sliding door at a crowded restaurant while waving goodbye.",
    "We secretly rearranged all the library books in reverse alphabetical order.",
    "A rom-com between a competitive barista and a vampire who can only drink lukewarm decaf.",
    "How car engines work. If a mechanic says the alternator is thirsty, I believe them.",
  ],
  Ember: [
    "Cold leftover soup is actually better straight out of the fridge than heated up.",
    "I waved back vigorously at someone on the street, only to realize they were waving at the dog behind me.",
    "I brought an entire waffle iron into chemistry and made waffles in the back row.",
    "A time-travel mystery where someone travels back in time just to win minor arguments.",
    "Stock market options. I have no clue what any of those letters mean.",
  ],
  Kian: [
    "Cereal with warm milk is comfort food, cold milk is way too aggressive.",
    "I gave a full five minute presentation with my shirt completely inside out.",
    "We set up an impromptu bowling alley in the hallway using two liter soda bottles.",
    "A detective story where the detective is completely oblivious but somehow solves the case by accident.",
    "Modern art museum exhibits. I just stand there staring at a blue square looking deep.",
  ],
  Sage: [
    "Dark chocolate is bitter chalk. Milk chocolate and white chocolate are far superior.",
    "I accidentally liked someone's photo from 2014 at 3 AM while internet sleuthing.",
    "I hid mini plastic ducks all over the school and people were still finding them two years later.",
    "An action hero whose only superpower is finding parking spots in crowded cities.",
    "Wine tasting notes. Notes of oak and leather? It literally just tastes like fermented grapes.",
  ],
};

export const BreakoutStage: React.FC<BreakoutStageProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onAdvanceRound,
  onFinishBreakouts,
}) => {
  const currentRoundIndex = room.currentBreakoutRound || 0;
  const schedule = room.breakoutSchedule || [];
  const totalRounds = schedule.length || 1;
  const endTime = room.currentBreakoutEndTime || Date.now() + 30000;

  const [timeLeft, setTimeLeft] = useState(30);
  const [isIntermission, setIsIntermission] = useState(false);
  const [intermissionCountdown, setIntermissionCountdown] = useState(3);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [botVolume, setBotVolume] = useState(0);

  // Find partner for the current round
  const partnerId = useMemo(() => {
    if (!currentPlayer || !schedule[currentRoundIndex]) return null;
    const pairs = schedule[currentRoundIndex];
    const match = pairs.find(
      (pair) => pair.player1Id === currentPlayer.id || pair.player2Id === currentPlayer.id
    );
    if (!match) return null;
    return match.player1Id === currentPlayer.id ? match.player2Id : match.player1Id;
  }, [currentPlayer, schedule, currentRoundIndex]);

  const partner = useMemo(() => {
    if (!partnerId) return null;
    return players.find((p) => p.id === partnerId) || null;
  }, [partnerId, players]);

  // WebRTC Audio Connection
  const { isConnected, localVolume, remoteVolume, callError } = useWebRTCBreakout({
    myId: currentPlayer?.id || null,
    partnerId: partnerId,
    isActive: !isIntermission && Boolean(partnerId),
  });

  // Bot speech synthesis for simulated campers (so users can hear voices and recognize them in guessing)
  useEffect(() => {
    if (!partner || isIntermission) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsBotSpeaking(false);
      setBotVolume(0);
      return;
    }

    const partnerResponses = BOT_TOPIC_RESPONSES[partner.name];
    if (partnerResponses && !isConnected && 'speechSynthesis' in window) {
      const responseText = partnerResponses[currentRoundIndex % partnerResponses.length];
      const utter = new SpeechSynthesisUtterance(responseText);
      utter.rate = 1.05;
      utter.pitch = partner.name === 'Zara' || partner.name === 'Sage' ? 1.2 : 0.95;

      let volInterval: ReturnType<typeof setInterval> | null = null;

      utter.onstart = () => {
        setIsBotSpeaking(true);
        volInterval = setInterval(() => {
          setBotVolume(Math.floor(Math.random() * 55) + 30);
        }, 120);
      };

      utter.onend = () => {
        setIsBotSpeaking(false);
        setBotVolume(0);
        if (volInterval) clearInterval(volInterval);
      };

      utter.onerror = () => {
        setIsBotSpeaking(false);
        setBotVolume(0);
        if (volInterval) clearInterval(volInterval);
      };

      const timer = setTimeout(() => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }, 700);

      return () => {
        clearTimeout(timer);
        if (volInterval) clearInterval(volInterval);
        window.speechSynthesis.cancel();
      };
    }
  }, [partner, isIntermission, currentRoundIndex, isConnected]);

  // Countdown timer synchronizer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && !isIntermission) {
        setIsIntermission(true);
        setIntermissionCountdown(3);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [endTime, isIntermission]);

  // Intermission 3-second countdown and automatic advance (Host or Auto)
  useEffect(() => {
    if (!isIntermission) return;

    const interval = setInterval(() => {
      setIntermissionCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost) {
            if (currentRoundIndex + 1 < totalRounds) {
              onAdvanceRound(currentRoundIndex + 1);
            } else {
              onFinishBreakouts();
            }
          }
          setIsIntermission(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isIntermission, isHost, currentRoundIndex, totalRounds, onAdvanceRound, onFinishBreakouts]);

  const currentTopic = SPEED_TALK_TOPICS[currentRoundIndex % SPEED_TALK_TOPICS.length];
  const effectiveRemoteVolume = isConnected ? remoteVolume : isBotSpeaking ? botVolume : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
          Stage 3: Real-Time Breakouts ("Speed Talk")
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Round {currentRoundIndex + 1} of {totalRounds}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Listen closely to your partner's voice, pitch, and cadence. You'll need to recognize them in blind guessing!
        </p>
      </div>

      <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Timer Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>{isIntermission ? 'Intermission' : 'Speed Talk Timer'}</span>
          </div>
          <span
            className={`font-mono text-2xl font-black ${
              isIntermission
                ? 'text-rose-400 animate-pulse'
                : timeLeft <= 5
                ? 'text-rose-400 animate-pulse'
                : 'text-amber-400'
            }`}
          >
            {isIntermission ? `Next Round in ${intermissionCountdown}s` : `00:${timeLeft.toString().padStart(2, '0')}`}
          </span>
        </div>

        {/* Intermission Screen */}
        {isIntermission ? (
          <div className="py-12 text-center animate-fadeIn">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4 animate-bounce">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Switching Partners!</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {currentRoundIndex + 1 < totalRounds
                ? 'Rotating to your next 1-on-1 voice breakout...'
                : 'All breakout rounds complete! Preparing blind audio guessing...'}
            </p>
          </div>
        ) : partner ? (
          /* Active Call View */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80">
              {/* You */}
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-slate-200 mb-2 relative">
                  {currentPlayer?.name.charAt(0).toUpperCase()}
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] text-white">
                    <Mic className="h-3 w-3" />
                  </span>
                </div>
                <span className="text-xs font-bold text-white">{currentPlayer?.name} (You)</span>
                <span className="text-[10px] text-slate-400">Microphone Active</span>
                <div className="mt-2">
                  <AudioVisualizer volume={localVolume} isActive={localVolume > 5} variant="recording" barCount={10} />
                </div>
              </div>

              {/* Call Status Badge */}
              <div className="flex flex-col items-center">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center mb-1 shadow-lg ${
                    isConnected || isBotSpeaking
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <PhoneCall className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-300">
                  {isConnected
                    ? 'Connected'
                    : isBotSpeaking
                    ? 'Speaking...'
                    : partner && BOT_TOPIC_RESPONSES[partner.name]
                    ? 'Campfire Audio'
                    : 'Connecting Peer...'}
                </span>
              </div>

              {/* Partner */}
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-xl font-bold text-white mb-2 shadow-lg shadow-cyan-950/50">
                  {partner.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white">{partner.name}</span>
                <span className="text-[10px] text-cyan-400 font-semibold">Talking to Partner</span>
                <div className="mt-2">
                  <AudioVisualizer
                    volume={effectiveRemoteVolume}
                    isActive={effectiveRemoteVolume > 5}
                    variant="playing"
                    barCount={10}
                  />
                </div>
              </div>
            </div>

            {callError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center">
                {callError}
              </div>
            )}

            {/* Topic Prompt Card */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3" /> Quick Topic Starter
                </span>
                <p className="text-sm font-semibold text-slate-200 italic">
                  "{currentTopic}"
                </p>
              </div>

              {/* Interactive Player Controls: Listen again or Done Talking */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                {partner && BOT_TOPIC_RESPONSES[partner.name] && (
                  <button
                    type="button"
                    onClick={() => {
                      audioTheme.playClickSound();
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const partnerResponses = BOT_TOPIC_RESPONSES[partner.name];
                        const text = partnerResponses[currentRoundIndex % partnerResponses.length];
                        const utter = new SpeechSynthesisUtterance(text);
                        window.speechSynthesis.speak(utter);
                      }
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40"
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Replay {partner.name}'s Voice
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    audioTheme.playClickSound();
                    if (currentRoundIndex + 1 < totalRounds) {
                      onAdvanceRound(currentRoundIndex + 1);
                    } else {
                      onFinishBreakouts();
                    }
                  }}
                  className="ml-auto px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                >
                  <span>Done Talking / Next Breakout</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* BYE / Solo Break View (for odd player count) */
          <div className="py-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Solo Intermission</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              You have a bye for this round. Relax, take a sip of water, and get ready for the next breakout!
            </p>
            <button
              type="button"
              onClick={() => {
                audioTheme.playClickSound();
                if (currentRoundIndex + 1 < totalRounds) {
                  onAdvanceRound(currentRoundIndex + 1);
                } else {
                  onFinishBreakouts();
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
            >
              <span>Skip Intermission</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Host Advance Override */}
        {isHost && (
          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => {
                audioTheme.playClickSound();
                if (currentRoundIndex + 1 < totalRounds) {
                  onAdvanceRound(currentRoundIndex + 1);
                } else {
                  onFinishBreakouts();
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <span>Skip to {currentRoundIndex + 1 < totalRounds ? 'Next Round' : 'Blind Guessing'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
