import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker as NodeWorker } from 'node:worker_threads';
import { createAsyncSimulator } from '../src/tournament/async-sim.js';
import { createTournament } from '../src/tournament/bracket.js';
import { simulateMatch } from '../src/tournament/sim.js';

const stub = (id, seed) => ({ winner: seed % 2, reason: 'stub' });
// A stand-in for the browser Worker that the test drives by hand.
const manualWorker = () => {
  const w = { created: 0 };
  w.Class = class { constructor() { w.instance = this; w.created++; this.sent = []; } postMessage(data) { this.sent.push(data); } terminate() { this.stopped = true; } };
  return w;
};

test('bracket waits for asynchronous outcomes and preserves synchronous results', async () => {
  const a = createTournament(3), b = createTournament(3); a.resolve(true, stub);
  let progress = 0;
  await b.resolveAsync(true, { simulate: async (...args) => stub(...args), onProgress: () => progress++ });
  assert.deepEqual(b.history, a.history); assert.deepEqual(b.alive, a.alive); assert.equal(progress, 15);
});
test('worker simulator correlates requests, reuses its worker and terminates on dispose', async () => {
  let instance, created = 0;
  class Worker {
    constructor(url, options) { instance = this; created++; assert.ok(url.href.endsWith('/worker.js')); assert.equal(options.type, 'module'); this.sent = []; }
    postMessage(data) { this.sent.push(data); }
    terminate() { this.stopped = true; }
  }
  const simulator = createAsyncSimulator(Worker);
  const one = simulator.simulate('deathmatch', 1, ['easy', 'hard']), two = simulator.simulate('wonder', 2, ['hard', 'hard']);
  instance.onmessage({ data: { id: instance.sent[1].id, result: { winner: 1 } } });
  instance.onmessage({ data: { id: instance.sent[0].id, result: { winner: 0 } } });
  assert.equal((await one).winner, 0); assert.equal((await two).winner, 1); assert.equal(created, 1);
  const cancelled = simulator.simulate('deathmatch', 3, ['hard', 'hard']); simulator.dispose();
  await assert.rejects(cancelled, /disposed/); assert.ok(instance.stopped);
  await assert.rejects(simulator.simulate('wonder', 4, []), /disposed/);
});
test('a crashed worker hands its pending matches to the main thread instead of failing the bracket', async () => {
  const w = manualWorker(), local = [];
  const simulator = createAsyncSimulator(w.Class, { fallback: (...args) => { local.push(args); return stub(...args); } });
  const one = simulator.simulate('wonder', 1, ['easy', 'easy']), two = simulator.simulate('wonder', 2, ['easy', 'easy']);
  w.instance.onerror({ message: 'worker failed', preventDefault() {} });
  assert.deepEqual([await one, await two], [stub('wonder', 1), stub('wonder', 2)]); assert.ok(w.instance.stopped);
  // Once broken, later matches stay on the main thread and no new worker is started.
  assert.deepEqual(await simulator.simulate('relics', 5, ['hard', 'hard']), stub('relics', 5));
  assert.equal(w.created, 1); assert.deepEqual(local.map(a => a[1]), [1, 2, 5]);
  // A late reply from the dead worker is ignored.
  w.instance.onmessage({ data: { id: w.instance.sent[0].id, result: { winner: 7 } } });
  simulator.dispose();
});
test('a worker that cannot start falls back to the main thread', async () => {
  class Worker { constructor() { throw new Error('module workers unsupported'); } }
  const simulator = createAsyncSimulator(Worker, { fallback: stub });
  assert.deepEqual(await simulator.simulate('standard', 3, ['easy', 'easy']), stub('standard', 3)); simulator.dispose();
  const noWorker = createAsyncSimulator(undefined, { fallback: stub });
  assert.deepEqual(await noWorker.simulate('standard', 4, ['easy', 'easy']), stub('standard', 4)); noWorker.dispose();
});
test('a match that throws in the worker is retried on the main thread and the worker is kept', async () => {
  const w = manualWorker(), simulator = createAsyncSimulator(w.Class, { fallback: stub });
  const one = simulator.simulate('regicide', 3, ['easy', 'easy']);
  w.instance.onmessage({ data: { id: w.instance.sent[0].id, error: 'RangeError: out of memory' } });
  assert.deepEqual(await one, stub('regicide', 3));
  const two = simulator.simulate('regicide', 4, ['easy', 'easy']);
  assert.equal(w.instance.sent.length, 2, 'the next match still goes to the worker');
  w.instance.onmessage({ data: { id: w.instance.sent[1].id, result: { winner: 1, reason: 'worker' } } });
  assert.equal((await two).reason, 'worker'); assert.equal(w.created, 1); simulator.dispose();
});
test('a worker that stops replying is given up after the timeout', async () => {
  const w = manualWorker(), simulator = createAsyncSimulator(w.Class, { fallback: stub, timeoutMs: 20 });
  assert.deepEqual(await simulator.simulate('deathmatch', 9, ['hard', 'hard']), stub('deathmatch', 9));
  assert.ok(w.instance.stopped); simulator.dispose();
});
test('message errors and failed posts fall back too', async () => {
  const w = manualWorker(), simulator = createAsyncSimulator(w.Class, { fallback: stub });
  const one = simulator.simulate('wonder', 1, []); w.instance.onmessageerror({});
  assert.deepEqual(await one, stub('wonder', 1)); simulator.dispose();
  class Unclonable { postMessage() { throw new Error('DataCloneError'); } terminate() {} }
  const other = createAsyncSimulator(Unclonable, { fallback: stub });
  assert.deepEqual(await other.simulate('wonder', 2, []), stub('wonder', 2)); other.dispose();
});
test('a match that also fails on the main thread still rejects', async () => {
  const w = manualWorker(), simulator = createAsyncSimulator(w.Class, { fallback: () => { throw new Error('sim bug'); } });
  const one = simulator.simulate('wonder', 1, []); w.instance.onerror({});
  await assert.rejects(one, /sim bug/); simulator.dispose();
});

// The real src/tournament/worker.js, run in a Node worker thread behind the browser Worker interface.
class ThreadWorker {
  constructor(url, options) {
    assert.equal(options.type, 'module');
    this.thread = new NodeWorker(`const { parentPort, workerData } = require('node:worker_threads');
      globalThis.self = { postMessage: data => parentPort.postMessage(data) };
      import(workerData).then(() => parentPort.on('message', data => self.onmessage({ data })));`, { eval: true, workerData: url.href });
    this.thread.on('message', data => this.onmessage?.({ data }));
    this.thread.on('error', error => this.onerror?.({ message: error.message }));
  }
  postMessage(data) { this.thread.postMessage(data); }
  terminate() { this.thread.terminate(); }
}
test('the real match worker returns exactly what the main thread computes', async () => {
  const simulator = createAsyncSimulator(ThreadWorker, { fallback: () => { throw new Error('worker was not used'); } });
  try {
    for (const [roundId, seed, diffs] of [['wonder', 1052, ['easy', 'hard']], ['deathmatch', 1058, ['medium', 'easy']]]) {
      const fromWorker = await simulator.simulate(roundId, seed, diffs), here = simulateMatch(roundId, seed, diffs);
      delete here.game; delete fromWorker.game;
      assert.deepEqual(fromWorker, here, `${roundId} ${seed}`);
      assert.ok(fromWorker.winner === 0 || fromWorker.winner === 1);
    }
  } finally { simulator.dispose(); }
});
