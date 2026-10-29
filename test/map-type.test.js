import test from 'node:test';
import assert from 'node:assert/strict';
import { readMapType, parseMapType, MAP_TYPES, MAP_NAME, MAP_DESC } from '../src/map-type.js';
import { createGame } from '../src/sim/game.js';
import { createTournament } from '../src/tournament/bracket.js';
import { createAsyncSimulator } from '../src/tournament/async-sim.js';

const storage = values => ({ getItem: key => values[key] ?? null });

test('map type: ?map= wins, then the saved pick, then Rivers', () => {
  assert.equal(readMapType(), 'rivers');
  assert.equal(readMapType('', storage({ mapType: 'islands' })), 'islands');
  assert.equal(readMapType('?map=rivers', storage({ mapType: 'islands' })), 'rivers');
  assert.equal(readMapType('?map=islands'), 'islands');
  for (const bad of ['', 'ocean', 'ISLANDS']) {
    assert.equal(parseMapType(bad), null);
    assert.equal(readMapType(`?map=${bad}`, storage({ mapType: 'islands' })), 'islands', bad);
    assert.equal(readMapType('', storage({ mapType: bad })), 'rivers', bad);
  }
  assert.equal(readMapType('', { getItem() { throw new Error('Denied'); } }), 'rivers');
  for (const m of MAP_TYPES) { assert.ok(MAP_NAME[m]); assert.ok(MAP_DESC[m]); }
});

test('createGame plays on the chosen map type; an unknown one falls back to rivers', () => {
  assert.equal(createGame({ seed: 2 }).map.type, 'rivers');
  assert.equal(createGame({ seed: 2, mapType: 'islands' }).map.type, 'islands');
  assert.equal(createGame({ seed: 2, mapType: 'ocean' }).map.type, 'rivers');
});

test('a tournament plays every bracket match on its map type, through the Worker too', async () => {
  const seen = [], simulate = (roundId, seed, diffs, opts) => { seen.push(opts?.mapType); return { winner: 0, reason: 'conquest' }; };
  const t = createTournament(5, 'normal', { mapType: 'islands' });
  assert.equal(t.mapType, 'islands');
  t.resolve(true, simulate);
  await t.resolveAsync(true, { simulate });
  assert.ok(seen.length > 0 && seen.every(m => m === 'islands'), JSON.stringify(seen));
  assert.equal(createTournament(5).mapType, 'rivers');
  // The async simulator hands the options to the Worker and to the main-thread fallback.
  const posted = [];
  class FakeWorker { constructor() { setTimeout(() => {}, 0); } postMessage(m) { posted.push(m); setTimeout(() => this.onmessage({ data: { id: m.id, result: { winner: 1 } } }), 0); } terminate() {} }
  const sim = createAsyncSimulator(FakeWorker);
  assert.deepEqual(await sim.simulate('conquest', 3, ['easy', 'easy'], { mapType: 'islands' }), { winner: 1 });
  assert.equal(posted[0].opts.mapType, 'islands');
  sim.dispose();
  let fallbackOpts = null;
  const local = createAsyncSimulator(null, { fallback: (r, s, d, o) => { fallbackOpts = o; return { winner: 0 }; } });
  await local.simulate('conquest', 3, ['easy', 'easy'], { mapType: 'islands' });
  assert.equal(fallbackOpts.mapType, 'islands');
});
