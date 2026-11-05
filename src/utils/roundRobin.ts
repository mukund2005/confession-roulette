import type { BreakoutRound, BreakoutPair } from '../types/game';

/**
 * Computes a standard round-robin tournament schedule.
 * For N players (e.g., 4 players), produces N-1 rounds (3 rounds)
 * where every player is paired with every other player exactly once.
 */
export function generateRoundRobinSchedule(playerIds: string[]): BreakoutRound[] {
  const pool = [...playerIds];

  // If odd number of players, add a dummy BYE player
  const hasBye = pool.length % 2 !== 0;
  if (hasBye) {
    pool.push('__BYE__');
  }

  const n = pool.length;
  const numRounds = n - 1;
  const half = n / 2;
  const schedule: BreakoutRound[] = [];

  for (let round = 0; round < numRounds; round++) {
    const roundPairs: BreakoutPair[] = [];

    for (let i = 0; i < half; i++) {
      const p1 = pool[i];
      const p2 = pool[n - 1 - i];

      if (p1 !== '__BYE__' && p2 !== '__BYE__') {
        roundPairs.push({
          player1Id: p1,
          player2Id: p2,
        });
      }
    }

    schedule.push(roundPairs);

    // Rotate array elements keeping index 0 fixed
    const fixed = pool[0];
    const last = pool[n - 1];
    for (let j = n - 1; j > 1; j--) {
      pool[j] = pool[j - 1];
    }
    pool[1] = last;
    pool[0] = fixed;
  }

  return schedule;
}
