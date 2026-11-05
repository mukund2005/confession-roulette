export interface CamperAvatar {
  id: number;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}

export const CAMPER_AVATARS: CamperAvatar[] = [
  {
    id: 0,
    name: 'Fox',
    emoji: '🦊',
    color: '#f97316',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  {
    id: 1,
    name: 'Bear',
    emoji: '🐻',
    color: '#d97706',
    bgColor: 'bg-amber-600/20',
    borderColor: 'border-amber-600/40',
    glowColor: 'rgba(217, 119, 6, 0.4)',
  },
  {
    id: 2,
    name: 'Owl',
    emoji: '🦉',
    color: '#6366f1',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/40',
    glowColor: 'rgba(99, 102, 241, 0.4)',
  },
  {
    id: 3,
    name: 'Wolf',
    emoji: '🐺',
    color: '#38bdf8',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/40',
    glowColor: 'rgba(56, 189, 248, 0.4)',
  },
  {
    id: 4,
    name: 'Raccoon',
    emoji: '🦝',
    color: '#10b981',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 5,
    name: 'Deer',
    emoji: '🦌',
    color: '#eab308',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/40',
    glowColor: 'rgba(234, 179, 8, 0.4)',
  },
  {
    id: 6,
    name: 'Rabbit',
    emoji: '🐰',
    color: '#ec4899',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/40',
    glowColor: 'rgba(236, 72, 153, 0.4)',
  },
  {
    id: 7,
    name: 'Hedgehog',
    emoji: '🦔',
    color: '#a855f7',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
];

export function getCamperAvatar(index?: number): CamperAvatar {
  const safeIdx = typeof index === 'number' && index >= 0 ? index % CAMPER_AVATARS.length : 0;
  return CAMPER_AVATARS[safeIdx];
}
