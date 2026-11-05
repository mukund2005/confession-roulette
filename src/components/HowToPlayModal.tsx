import React from 'react';
import { X, Flame, Mic, PhoneCall, Headphones, Shield, Crown, Sparkles, CheckCircle2 } from 'lucide-react';
import { audioTheme } from '../utils/audioTheme';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    audioTheme.playClickSound();
    onClose();
  };

  const stages = [
    {
      num: '1',
      title: 'The Bonfire Gathering (Lobby)',
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description:
        '4 real campers take their seats around the campfire. Use Quick Match or share your 4-letter bonfire code. The fire ignites automatically as soon as all 4 seats are filled!',
    },
    {
      num: '2',
      title: 'Voice Confessions (15–30s)',
      icon: Mic,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      description:
        'Receive a secret spicy confession prompt and record your voice confession into your mic. Tip: Disguise your pitch, cadence, or accent so others cannot recognize you! Breakouts start immediately when all 4 campers seal their secrets.',
    },
    {
      num: '3',
      title: 'Speed Talk Breakouts (1-on-1)',
      icon: PhoneCall,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      description:
        'Rotate through live 1-on-1 WebRTC voice calls with each camper around the fire. Chat about fun conversation starters and pay close attention to how each camper actually speaks and laughs.',
    },
    {
      num: '4',
      title: 'Blind Audio Guessing',
      icon: Headphones,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description:
        'All confessions are shuffled and played anonymously as mystery voices ("Voice A", "Voice B", etc.). Use what you learned in Speed Talk to guess who recorded each secret!',
    },
    {
      num: '5',
      title: 'Synchronized Confession Listening',
      icon: Shield,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description:
        'The camper with the most disguised voice (least recognized) wins Total Immunity (Winner 1)! Their confession is permanently protected. Then, every other confession is played aloud to all campers at the exact same time around the fire!',
    },
    {
      num: '6',
      title: 'The Twist: Winner 1 Chooses Winner 2',
      icon: Crown,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description:
        'After everyone has listened to all the confessions together, Winner 1 hand-picks the second survivor (Winner 2) to join them on the victory podium.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-serif animate-fadeIn">
      <div className="bg-[#121214] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-serif text-white flex items-center gap-2">
                <span>How To Play Rupiko</span>
                <span className="text-[10px] font-sans font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/30">
                  Online Multiplayer
                </span>
              </h2>
              <p className="text-xs text-white/50 font-sans">
                The game of secret confessions, disguised voices, and campfire deduction.
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

        {/* Scrollable Stage Content */}
        <div className="overflow-y-auto pr-1 py-4 space-y-3.5 flex-1 font-sans">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.num}
                className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-white/20 transition-all"
              >
                <div
                  className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center font-bold font-serif text-base shadow-sm ${stage.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest font-mono">
                      STAGE {stage.num}
                    </span>
                    <h3 className="text-sm font-bold text-white font-serif">{stage.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{stage.description}</p>
                </div>
              </div>
            );
          })}

          {/* Pro Tips Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 mt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2 font-serif">
              <Sparkles className="h-4 w-4" /> Pro-Tips For Winning
            </span>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-white">Mask your voice:</strong> Use a silly whisper, change your pitch, or alter your usual speech habits during the recording stage.
              </li>
              <li>
                <strong className="text-white">Be a voice detective:</strong> In Speed Talk breakouts, listen to how partners laugh, their phrasing, and background noise.
              </li>
              <li>
                <strong className="text-white">Win immunity:</strong> The player whose voice fools the most campers wins total protection!
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-3 bg-[#e2e8f0] hover:bg-white text-black font-serif font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Got It, Let's Play!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
