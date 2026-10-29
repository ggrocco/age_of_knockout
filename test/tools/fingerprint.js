// Behaviour fingerprint for refactoring: a change that only renames or restructures code must leave both hashes alone.
//   node test/tools/fingerprint.js sim     # bot-vs-bot matches, the whole sim state hashed every 100 ticks
//   node test/tools/fingerprint.js models  # every building, unit, resource and relic model, built and animated
//   node test/tools/fingerprint.js         # both
// Save the output before a refactor and diff it after; any difference is a behaviour change (or lost determinism).
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createGame } from '../../src/sim/game.js';
import { createBot, matchOptions, THINK_EVERY } from '../../src/ai/bot.js';
import { ROUNDS, roundById } from '../../src/rounds/index.js';
import { buildModel, animate } from '../../src/render/models.js';
import { UNITS } from '../../src/data/units.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { AGES } from '../../src/data/ages.js';

const MATCHES = [
  ...ROUNDS.flatMap(round => [1, 2].map(seed => ({ round: round.id, seed, diffs: ['medium', 'medium'], mapType: 'rivers' }))),
  ...ROUNDS.map(round => ({ round: round.id, seed: 3, diffs: ['medium', 'medium'], mapType: 'islands' })),
  ...ROUNDS.map(round => ({ round: round.id, seed: 4, diffs: ['hard', 'easy'], mapType: 'rivers' })),
  { round: 'conquest', seed: 5, diffs: ['relaxed', 'hard'], mapType: 'islands' },
];

const round3 = value => Math.round(value * 1000) / 1000;

function stateLine(game) {
  const players = game.players.map(p => [p.age, p.ageUp?.remaining, Object.values(p.res).map(round3), [...p.techs], p.pop, p.popCap, p.kills, p.losses, p.bdestroyed, round3(p.gathered)]);
  const entities = [...game.entities.values()].map(e => [e.id, e.kind, e.type, e.owner, round3(e.x), round3(e.y), round3(e.hp ?? 0), round3(e.amount ?? 0),
    e.order?.type, e.order?.phase, e.order?.target, e.carry?.amount && round3(e.carry.amount), e.aboard, e.cargo?.length, e.progress && round3(e.progress), e.queue?.length, e.research?.tech, e.holder, e.stored]);
  return JSON.stringify([game.time, players, entities, game.terrainVersion, game.result]);
}

function simFingerprint() {
  const out = {};
  for (const m of MATCHES) {
    const game = createGame({ seed: m.seed, rules: roundById(m.round), mapType: m.mapType, ...matchOptions(m.diffs) });
    const bots = m.diffs.map((d, i) => createBot(game, i, d)), hash = createHash('sha1'), started = Date.now();
    while (!game.result && game.time < game.capTicks + 50) {
      game.tick();
      for (let i = 0; i < 2; i++) if (game.time % THINK_EVERY[m.diffs[i]] === (i * 3) % THINK_EVERY[m.diffs[i]]) bots[i].think();
      if (game.time % 100 === 0) hash.update(stateLine(game));
    }
    hash.update(stateLine(game));
    const key = `${m.round}:${m.seed}:${m.diffs}:${m.mapType}`;
    out[key] = `${hash.digest('hex')} ticks=${game.time} ${game.result?.winner}/${game.result?.reason}`;
    console.error(`${key} ${out[key]} (${Date.now() - started} ms)`);
  }
  return out;
}

function hashModel(model, hash) {
  model.root.updateMatrixWorld(true);
  model.root.traverse(o => {
    hash.update(`${o.type}:${o.visible}:${o.name}`);
    hash.update(Buffer.from(new Float64Array(o.matrixWorld.elements).buffer));
    if (!o.isMesh) return;
    for (const [name, attribute] of Object.entries(o.geometry.attributes)) {
      const { array } = attribute; hash.update(name); hash.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
    }
    if (o.geometry.index) { const { array } = o.geometry.index; hash.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)); }
  });
}

// Builds the model, then hashes it after each animation pose, so a change to animate() shows up too.
function hashPoses(e, age, poses) {
  const model = buildModel(e, age), group = new THREE.Group(), hash = createHash('sha1');
  group.add(model.root); group.userData.anim = model.anim;
  hash.update(JSON.stringify(model.shadow ?? null));
  for (const [time, moving, change] of poses) { change?.(e); animate(group, e, time, moving); hashModel(model, hash); }
  return hash.digest('hex');
}

function modelFingerprint() {
  const out = {};
  for (const age of AGES) for (const owner of [0, 1]) for (const [type, spec] of Object.entries(BUILDINGS)) {
    const e = { kind: 'building', type, owner, id: 7, size: spec.size, constructed: false, progress: 0.4, amount: 300, maxAmount: 400, gatherType: spec.gatherType, digging: 1, cd: 5, cooldown: 10 };
    out[`b:${type}:${age}:${owner}`] = hashPoses(e, age, [[1, false], [2, false, x => { x.constructed = true; }], [3.5, false, x => { x.amount = 100; }]]);
  }
  const orders = [{ type: 'idle' }, { type: 'move' }, { type: 'attack' }, { type: 'gather', kind: 'wood', phase: 'work' }, { type: 'gather', kind: 'food', phase: 'go' }, { type: 'build' }];
  for (const age of AGES) for (const owner of [0, 1]) for (const [type, spec] of Object.entries(UNITS)) {
    const e = { ...spec, kind: 'unit', type, owner, id: 3, carry: { amount: 5 }, cd: 39, cooldown: 40, order: orders[0] };
    out[`u:${type}:${age}:${owner}`] = hashPoses(e, age, orders.map((order, i) => [1 + i * 0.7, order.type === 'move', x => { x.order = order; x.cd = 40 - i * 3; }]));
  }
  for (const type of ['tree', 'berry', 'gold', 'stone', 'fish']) for (let id = 0; id < 6; id++) {
    out[`r:${type}:${id}`] = hashPoses({ kind: 'resource', type, id, amount: 50 }, undefined, [[1, false]]);
  }
  out.relic = hashPoses({ kind: 'relic' }, undefined, [[1, false], [2.3, false]]);
  return out;
}

const mode = process.argv[2];
const result = {};
if (mode !== 'sim') Object.assign(result, modelFingerprint());
if (mode !== 'models') Object.assign(result, simFingerprint());
console.log(JSON.stringify(result, null, 1));
