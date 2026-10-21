import test from 'node:test';
import assert from 'node:assert/strict';
import { readTimeLimit } from '../src/time-limit.js';
import { matchOptions } from '../src/ai/bot.js';
import { createGame } from '../src/sim/game.js';
import { ROUNDS } from '../src/rounds/index.js';
import { createTournament } from '../src/tournament/bracket.js';

const storage = values => ({ getItem: key => values[key] ?? null });

test('time limit defaults to 25 minutes and migrates the checkbox preference', () => {
  assert.equal(readTimeLimit(), 25);
  assert.equal(readTimeLimit('', storage({ noTimeLimit: 'true' })), 0);
  assert.equal(readTimeLimit('', storage({ noTimeLimit: 'false' })), 25);
  assert.equal(readTimeLimit('', storage({ timeLimit: '90', noTimeLimit: 'true' })), 90);
  assert.equal(readTimeLimit('', storage({ timeLimit: '0' })), 0);
});

test('URL limits override saved choices, including legacy bookmarks', () => {
  const saved = storage({ timeLimit: '90' });
  assert.equal(readTimeLimit('?timeLimit=120', saved), 120);
  assert.equal(readTimeLimit('?timeLimit=0&noTimeLimit=0', saved), 0);
  assert.equal(readTimeLimit('?noTimeLimit=1', saved), 0);
  assert.equal(readTimeLimit('?noTimeLimit=0', saved), 25);
  for (const invalid of ['', '-1', '121', '1.5', 'Infinity', 'bad']) {
    assert.equal(readTimeLimit(`?timeLimit=${invalid}`, saved), 90, invalid);
    assert.equal(readTimeLimit('', storage({ timeLimit: invalid })), 25, invalid);
  }
  assert.equal(readTimeLimit('', { getItem() { throw new Error('Denied'); } }), 25);
});

test('invalid limits preserve legacy preferences and URL choices survive unavailable storage', () => {
  assert.equal(readTimeLimit('?timeLimit=121&noTimeLimit=1', storage({ timeLimit: '90' })), 0);
  assert.equal(readTimeLimit('?timeLimit=bad&noTimeLimit=0', storage({ timeLimit: '0' })), 25);
  assert.equal(readTimeLimit('', storage({ timeLimit: 'bad', noTimeLimit: 'true' })), 0);
  const unavailable = { getItem() { throw new Error('Denied'); } };
  for (const [search, expected] of [['?timeLimit=1', 1], ['?timeLimit=0', 0], ['?noTimeLimit=1', 0]]) {
    assert.equal(readTimeLimit(search, unavailable), expected, search);
  }
});

test('explicit minutes take precedence over legacy match options and invalid limits keep their fallback', () => {
  assert.equal(matchOptions([null, 'relaxed'], { timeLimit: '1', noTimeLimit: true }).capTicks, 1200);
  assert.equal(matchOptions([null, 'relaxed'], { timeLimit: '0', noTimeLimit: false }).capTicks, Infinity);
  for (const timeLimit of [null, '', -1, 121, 1.5, Infinity, 'bad']) {
    assert.equal(matchOptions([null, 'relaxed'], { timeLimit }).capTicks, 48000, String(timeLimit));
    assert.equal(matchOptions([null, 'relaxed'], { timeLimit, noTimeLimit: true }).capTicks, Infinity, String(timeLimit));
    assert.equal(matchOptions(['hard', 'easy'], { timeLimit }).capTicks, undefined, String(timeLimit));
  }
});

test('selected deadlines apply in every round and override Relaxed caps without losing its handicap', () => {
  for (const round of ROUNDS) for (const minutes of [1, 25, 120]) {
    const g = createGame({ seed: 2, rules: round, ...matchOptions([null, 'relaxed'], { timeLimit: minutes }) });
    assert.equal(g.capTicks, minutes * 1200);
    assert.deepEqual(g.players.map(p => p.workRate), [1, 0.5]);
    g.players[1].kills = 1000;
    g.time = g.capTicks - 2; g.tick();
    assert.equal(g.result, null, `${round.id} before ${minutes} minutes`);
    g.tick();
    assert.deepEqual([g.result.winner, g.result.reason], [1, 'time cap'], `${round.id} at ${minutes} minutes`);
  }
  const g = createGame({ rules: ROUNDS[0], ...matchOptions([null, 'relaxed'], { timeLimit: 0 }) });
  assert.equal(g.capTicks, Infinity);
  g.time = 144000; g.tick(); assert.equal(g.result, null);
});

test('tournament keeps the selected minutes through all five rounds', () => {
  assert.equal(createTournament().timeLimit, 25);
  for (const minutes of [0, 75, 120]) {
    const t = createTournament(1, 'normal', { timeLimit: minutes });
    while (!t.over) {
      assert.equal(t.timeLimit, minutes);
      assert.equal(t.noTimeLimit, minutes === 0);
      t.resolve(true, () => ({ winner: 0 }));
    }
  }
});
