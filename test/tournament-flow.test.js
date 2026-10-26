// The tournament as the browser drives it: after each human match, resolveAsync simulates the rest of the round
// through the Worker simulator (src/main.js afterMatch), five times, to a champion or an elimination.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTournament, LEVELS } from '../src/tournament/bracket.js';
import { createAsyncSimulator } from '../src/tournament/async-sim.js';
import { ROUNDS } from '../src/rounds/index.js';

const stub = (id, seed) => ({ winner: (seed >> 1) % 2, reason: 'stub' });
// Answers on a later task like a real Worker; `die` makes it crash after that many replies.
const asyncWorker = ({ die = Infinity } = {}) => {
  const w = { created: 0, replies: 0 };
  w.Class = class {
    constructor() { w.created++; this.alive = true; }
    postMessage({ id, roundId, seed }) {
      setTimeout(() => {
        if (!this.alive) return;
        if (w.replies >= die) { this.alive = false; this.onerror?.({ message: 'killed', preventDefault() {} }); return; }
        w.replies++; this.onmessage?.({ data: { id, result: stub(roundId, seed) } });
      }, 1);
    }
    terminate() { this.alive = false; }
  };
  return w;
};
// One round as main.js plays it: a fresh simulator, resolveAsync, dispose.
async function playRound(t, won, WorkerClass, extra = {}) {
  const simulator = createAsyncSimulator(WorkerClass, { fallback: stub });
  try { return await t.resolveAsync(won, { simulate: simulator.simulate, ...extra }); } finally { simulator.dispose(); }
}
const snapshot = t => structuredClone({ roundIndex: t.roundIndex, alive: t.alive, history: t.history, over: t.over, champion: t.champion });
const syncChampionRun = seed => { const t = createTournament(seed); while (!t.over) t.resolve(true, stub); return t; };

test('winning every round through the worker crowns the human with a consistent bracket', async () => {
  for (const level of Object.keys(LEVELS)) {
    const t = createTournament(4, level, { timeLimit: 0 }), w = asyncWorker(), sizes = [], opponents = [];
    while (!t.over) {
      sizes.push(t.alive.length); opponents.push(t.opponent.difficulty);
      assert.equal(t.human.id, 0); assert.equal(t.round, ROUNDS[t.roundIndex]);
      const before = t.alive, progress = [];
      await playRound(t, true, w.Class, { onProgress: (d, n) => progress.push([d, n]) });
      const last = t.history.at(-1);
      assert.equal(last.round, ROUNDS[t.roundIndex - 1].id); assert.equal(last.results.length, before.length / 2);
      assert.equal(progress.length, before.length / 2 - 1); if (progress.length) assert.deepEqual(progress.at(-1), [progress.length, progress.length]);
      // Every survivor won its own pairing, in bracket order.
      assert.deepEqual(t.alive.map(p => p.name), last.results.map(r => r.winner));
      for (let k = 0; k < last.results.length; k++) assert.deepEqual([last.results[k].a, last.results[k].b], [before[2 * k].name, before[2 * k + 1].name]);
      assert.equal(t.noTimeLimit, true);
    }
    assert.deepEqual(sizes, [32, 16, 8, 4, 2]); assert.deepEqual(opponents, LEVELS[level]);
    assert.equal(t.champion.id, 0); assert.equal(t.history.length, 5); assert.equal(w.replies, 15 + 7 + 3 + 1);
    await assert.rejects(t.resolveAsync(true), /over/);
  }
});
test('losing in any round eliminates the human there and ends the tournament', async () => {
  for (let lose = 0; lose < 5; lose++) {
    const t = createTournament(5);
    for (let r = 0; r < lose; r++) await playRound(t, true, asyncWorker().Class);
    const fighting = t.opponent.name;
    await playRound(t, false, asyncWorker().Class);
    assert.equal(t.over, true); assert.equal(t.champion, null); assert.equal(t.lostIn, lose); assert.equal(t.history.length, lose + 1);
    assert.deepEqual(t.history.at(-1).results, [{ a: 'You', b: fighting, winner: fighting, human: true }]);
    await assert.rejects(t.resolveAsync(true), /over/); await assert.rejects(t.resolveAsync(false), /over/);
  }
});
test('a worker killed mid-round (a backgrounded phone) still finishes the tournament with the same bracket', async () => {
  const expected = syncChampionRun(6);
  for (const die of [0, 1, 7, 14, 20]) {
    const t = createTournament(6), w = asyncWorker({ die });
    while (!t.over) await playRound(t, true, w.Class);
    assert.deepEqual(t.history, expected.history, `worker died after ${die} replies`); assert.equal(t.champion.id, 0);
  }
});
test('a failed round leaves the tournament untouched and can be retried', async () => {
  const t = createTournament(7); await playRound(t, true, asyncWorker().Class);
  const before = snapshot(t); let calls = 0;
  const flaky = async (...args) => { if (++calls === 4) throw new Error('lost'); return stub(...args); };
  await assert.rejects(t.resolveAsync(true, { simulate: flaky }), /lost/);
  assert.deepEqual(snapshot(t), before);
  await t.resolveAsync(true, { simulate: flaky });
  const expected = syncChampionRun(7);
  assert.deepEqual(t.history, expected.history.slice(0, 2)); assert.equal(t.roundIndex, 2);
});
test('a round is resolved once even if its result is reported twice', async () => {
  const t = createTournament(8);
  const first = t.resolveAsync(true, { simulate: stub });
  await assert.rejects(t.resolveAsync(true, { simulate: stub }), /already/);
  await first; assert.equal(t.roundIndex, 1); assert.equal(t.history.length, 1);
});
test('a progress display that throws does not lose the round', async () => {
  const t = createTournament(9);
  await t.resolveAsync(true, { simulate: stub, onProgress: () => { throw new TypeError('pbar is null'); } });
  assert.equal(t.roundIndex, 1); assert.deepEqual(t.history, syncChampionRun(9).history.slice(0, 1));
});
test('a missing match result fails loudly before the bracket changes', () => {
  const t = createTournament(10), before = snapshot(t);
  assert.throws(() => t.resolve(true, (id, seed) => seed % 7 ? stub(id, seed) : undefined), /no result/);
  assert.deepEqual(snapshot(t), before);
});
test('the last two rounds resolve with real off-screen matches', async () => {
  const t = createTournament(1);
  for (let r = 0; r < 3; r++) t.resolve(true, stub);
  const simulator = createAsyncSimulator(undefined); // no Worker in Node: the real simulateMatch runs here
  try { await t.resolveAsync(true, { simulate: simulator.simulate }); await t.resolveAsync(true, { simulate: simulator.simulate }); }
  finally { simulator.dispose(); }
  assert.equal(t.champion.id, 0); assert.equal(t.history[3].results.length, 2);
  assert.ok(['conquest', 'wonder', 'time cap', 'mutual destruction'].includes(t.history[3].results[1].reason), t.history[3].results[1].reason);
});
