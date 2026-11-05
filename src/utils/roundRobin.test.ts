import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRoundRobinSchedule } from './roundRobin.ts';
import { MAX_PLAYERS } from '../types/game.ts';

test('MAX_PLAYERS is configured to 4', () => {
  assert.strictEqual(MAX_PLAYERS, 4);
});

test('generateRoundRobinSchedule with 4 players (maximum game capacity)', () => {
  const players = ['player-1', 'player-2', 'player-3', 'player-4'];
  const schedule = generateRoundRobinSchedule(players);

  // 4 players must produce N-1 = 3 rounds
  assert.strictEqual(schedule.length, 3, 'Should generate exactly 3 rounds for 4 players');

  const seenPairings = new Set<string>();

  schedule.forEach((round, roundIndex) => {
    // Each round must have 2 pairs (4 players / 2)
    assert.strictEqual(round.length, 2, `Round ${roundIndex + 1} should have 2 pairs`);

    const playersInRound = new Set<string>();

    round.forEach((pair) => {
      // No player paired with themselves
      assert.notStrictEqual(pair.player1Id, pair.player2Id, 'Player cannot be paired with self');

      // Both players must be valid players from the input
      assert.ok(players.includes(pair.player1Id), 'player1Id must be in input players');
      assert.ok(players.includes(pair.player2Id), 'player2Id must be in input players');

      // Each player must only appear once per round
      assert.ok(!playersInRound.has(pair.player1Id), `Player ${pair.player1Id} appears multiple times in round ${roundIndex + 1}`);
      assert.ok(!playersInRound.has(pair.player2Id), `Player ${pair.player2Id} appears multiple times in round ${roundIndex + 1}`);
      playersInRound.add(pair.player1Id);
      playersInRound.add(pair.player2Id);

      // Record normalized pair
      const pairKey = [pair.player1Id, pair.player2Id].sort().join(':');
      assert.ok(!seenPairings.has(pairKey), `Pair ${pairKey} was scheduled more than once`);
      seenPairings.add(pairKey);
    });

    // All 4 players must have participated in this round
    assert.strictEqual(playersInRound.size, 4, `All 4 players must participate in round ${roundIndex + 1}`);
  });

  // 4 choose 2 = 6 total unique pairings
  assert.strictEqual(seenPairings.size, 6, 'All 6 possible pairings must be scheduled exactly once across the 3 rounds');
});

test('generateRoundRobinSchedule with 2 players', () => {
  const players = ['p1', 'p2'];
  const schedule = generateRoundRobinSchedule(players);
  assert.strictEqual(schedule.length, 1);
  assert.strictEqual(schedule[0].length, 1);
  assert.deepStrictEqual(
    [schedule[0][0].player1Id, schedule[0][0].player2Id].sort(),
    ['p1', 'p2']
  );
});

test('Balloon Popping Frenzy: Highest score wins Winner 1', () => {
  const contestants = [
    { id: 'camper-1', score: 14, reactionTimeMs: 1730768400000 },
    { id: 'camper-2', score: 22, reactionTimeMs: 1730768410000 },
    { id: 'camper-3', score: 8,  reactionTimeMs: 1730768405000 },
    { id: 'camper-4', score: 19, reactionTimeMs: 1730768420000 },
  ];

  const sorted = [...contestants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = a.reactionTimeMs ?? Number.MAX_SAFE_INTEGER;
    const timeB = b.reactionTimeMs ?? Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  assert.strictEqual(sorted[0].id, 'camper-2', 'Player with highest score must be ranked #1');
  assert.strictEqual(sorted[0].score, 22);
});

test('Balloon Popping Frenzy: Tie-breaker awards Winner 1 to earliest final pop', () => {
  const t0 = 1730768400000;
  const contestants = [
    { id: 'camper-1', score: 25, reactionTimeMs: t0 + 28000 }, // finished last pop at 28s
    { id: 'camper-2', score: 25, reactionTimeMs: t0 + 24500 }, // finished last pop at 24.5s (earlier!)
    { id: 'camper-3', score: 10, reactionTimeMs: t0 + 29000 },
    { id: 'camper-4', score: 21, reactionTimeMs: t0 + 27000 },
  ];

  const sorted = [...contestants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = a.reactionTimeMs ?? Number.MAX_SAFE_INTEGER;
    const timeB = b.reactionTimeMs ?? Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  assert.strictEqual(sorted[0].id, 'camper-2', 'Tied player who popped their final balloon first wins tie-break');
  assert.strictEqual(sorted[1].id, 'camper-1', 'Tied player with later final pop is ranked #2');
});
