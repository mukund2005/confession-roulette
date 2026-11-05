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
