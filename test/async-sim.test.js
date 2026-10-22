import test from 'node:test';
import assert from 'node:assert/strict';
import { createAsyncSimulator } from '../src/tournament/async-sim.js';
import { createTournament } from '../src/tournament/bracket.js';

test('bracket waits for asynchronous outcomes and preserves synchronous results', async () => {
  const run = (id, seed) => ({ winner: seed % 2, reason: 'stub' });
  const a = createTournament(3), b = createTournament(3); a.resolve(true, run);
  let progress = 0;
  await b.resolveAsync(true, { simulate: async (...args) => run(...args), onProgress: () => progress++ });
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
test('worker errors reject pending requests instead of leaving the bracket waiting', async () => {
  let instance;
  class Worker { constructor() { instance = this; } postMessage() {} terminate() {} }
  const simulator = createAsyncSimulator(Worker), pending = simulator.simulate('wonder', 1, []);
  instance.onerror({ message: 'worker failed', preventDefault() {} });
  await assert.rejects(pending, /worker failed/); simulator.dispose();
});
