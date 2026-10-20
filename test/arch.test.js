import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { hashBuildings } from './tools/hash-buildings.js';
import { designOf } from '../src/render/arch/index.js';
import { buildModel, animate } from '../src/render/models.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { AGES, ageIndex } from '../src/data/ages.js';

test('kept designs stay byte-identical', () => {
  const want = JSON.parse(readFileSync(new URL('./fixtures/kept-buildings.json', import.meta.url)));
  assert.deepEqual(hashBuildings(), want);
});

test('design registry: earlier eras show the unlock-era design', () => {
  assert.equal(designOf('castle', 'stone').age, 'medieval');
});

test('design registry: kept designs, era designs and the legacy fallback', () => {
  assert.equal(designOf('house', 'tool').kind, 'kept');
  assert.equal(designOf('house', 'sail').kind, 'design');
  assert.equal(designOf('granary', 'sail').kind, 'legacy'); // no Age of Sail Granary design yet
});

// ---------- shared helpers for the per-era design tests ----------
const build = (type, age, constructed = true) => {
  const e = { kind: 'building', type, owner: 0, size: BUILDINGS[type].size, constructed, progress: constructed ? 1 : 0.4, amount: 300 };
  const m = buildModel(e, age), g = new THREE.Group(); g.add(m.root); g.userData.anim = m.anim;
  return { e, anim: m.anim, g };
};
// sha1 of the static meshes' position arrays (body, mast and a farm's crops; not the scaffold, flag or animated parts),
// built, owner 0.
const posHash = (type, age) => {
  const { anim } = build(type, age), h = createHash('sha1');
  for (const o of [anim.body, anim.mast, anim.crops]) o?.traverse(m => {
    if (!m.isMesh) return;
    const a = m.geometry.attributes.position.array; h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  });
  return h.digest('hex');
};
// Top of the solid body; flagpoles, antennas and thin tips live in the mast and don't count.
const bodyHeight = (type, age) => new THREE.Box3().setFromObject(build(type, age).anim.body).max.y;

const available = type => AGES.filter(a => ageIndex(a) >= ageIndex(BUILDINGS[type].age));
const distinctAcrossEras = types => { for (const type of types) { const hs = available(type).map(a => posHash(type, a)); assert.equal(new Set(hs).size, hs.length, `${type}: two eras share a shape`); } };
const heightsOk = types => { for (const type of types) for (const a of available(type)) assert.ok(bodyHeight(type, a) <= (type === 'wonder' ? 5.5 : 3.6), `${type}/${a} height ${bodyHeight(type, a)}`); };

test('Town Center and House: every era has its own shape', () => distinctAcrossEras(['town_center', 'house']));
test('Town Center and House: heights within the cap', () => heightsOk(['town_center', 'house']));

test('animated parts: hidden until finished, then they move', () => {
  for (const [age, kinds] of [['industrial', ['smoke', 'spinners']], ['future', ['spinners', 'floaters']]]) {
    const { e, anim: a, g } = build('town_center', age, false);
    for (const k of kinds) assert.ok(a[k]?.length > 0, `${age}: no ${k}`);
    const parts = [...a.spinners ?? [], ...a.floaters ?? [], ...a.smoke ?? []].map(x => x.p);
    animate(g, e, 1, false);
    for (const p of parts) assert.equal(p.visible, false, `${age}: a part shows while unfinished`);
    e.constructed = true; e.progress = 1;
    animate(g, e, 1, false);
    const spins = a.spinners?.map(x => x.p.rotation[x.axis]), floats = a.floaters?.map(x => x.p.position.y), puffs = a.smoke?.map(x => x.p.position.y);
    animate(g, e, 2, false);
    for (const p of parts) assert.equal(p.visible, true, `${age}: a part hidden once finished`);
    a.spinners?.forEach((x, i) => assert.notEqual(x.p.rotation[x.axis], spins[i], `${age}: spinner ${i} still`));
    a.floaters?.forEach((x, i) => assert.notEqual(x.p.position.y, floats[i], `${age}: floater ${i} still`));
    a.smoke?.forEach((x, i) => assert.notEqual(x.p.position.y, puffs[i], `${age}: smoke ${i} still`));
  }
  // The mast (flagpole) and the flag it carries hide with the scaffold up, like the animated parts.
  const { e, anim: a, g } = build('town_center', 'industrial', false);
  assert.ok(a.mast && a.flag, 'industrial Town Center has a mast and a flag');
  animate(g, e, 1, false);
  assert.equal(a.mast.visible, false); assert.equal(a.flag.visible, false);
  e.constructed = true; animate(g, e, 2, false);
  assert.equal(a.mast.visible, true); assert.equal(a.flag.visible, true);
  // Every flag hides while unfinished, also on mast-less kept designs.
  const tool = build('town_center', 'tool', false);
  assert.ok(!tool.anim.mast && tool.anim.flag, 'kept Tool Town Center has a flag and no mast');
  animate(tool.g, tool.e, 1, false); assert.equal(tool.anim.flag.visible, false, 'kept Tool TC flag shows while unfinished');
  tool.e.constructed = true; animate(tool.g, tool.e, 2, false); assert.equal(tool.anim.flag.visible, true);
});

// ---------- Stone: Granary, Storage Pit, Farm, Barracks ----------
const STONE = ['granary', 'storage_pit', 'farm', 'barracks'];
// Some eras without their own design still share today's look with each other, so Stone is checked against every
// other era rather than all pairs (distinctAcrossEras) until Task 11.
test('stone designs differ from every other era', () => {
  for (const type of STONE) {
    const stone = posHash(type, 'stone');
    for (const a of available(type).filter(a => a !== 'stone')) assert.notEqual(posHash(type, a), stone, `${type}: Stone shares a shape with ${a}`);
  }
});
test('Stone Granary, Storage Pit, Farm and Barracks: heights within the cap', () => heightsOk(STONE));
test('Stone farm: crops show once finished and shrink with the food left', () => {
  const { e, anim: a, g } = build('farm', 'stone', false);
  assert.ok(a.crops, 'Stone farm has no crops');
  animate(g, e, 1, false); assert.equal(a.crops.visible, false, 'crops show while unfinished');
  e.constructed = true; e.amount = 400; animate(g, e, 1, false);
  assert.equal(a.crops.visible, true); const full = a.crops.scale.y;
  e.amount = 0; animate(g, e, 1, false);
  assert.ok(a.crops.scale.y < full, `crops did not shrink (${a.crops.scale.y} vs ${full})`);
});

// ---------- Bronze: Granary, Storage Pit, Farm, Barracks, Archery Range, Stable, Market, Government Center, Wonder ----------
const BRONZE = ['granary', 'storage_pit', 'farm', 'barracks', 'archery_range', 'stable', 'market', 'government_center', 'wonder'];
// As for Stone: each Bronze design against every other era, not all pairs, until Task 11.
test('bronze designs differ from every other era', () => {
  for (const type of BRONZE) {
    assert.equal(designOf(type, 'bronze').kind, 'design', `${type}: no Bronze design`);
    const bronze = posHash(type, 'bronze');
    for (const a of available(type).filter(a => a !== 'bronze')) assert.notEqual(posHash(type, a), bronze, `${type}: Bronze shares a shape with ${a}`);
  }
});
test('Bronze designs: heights within the cap', () => heightsOk(BRONZE));
test('Bronze farm: crops show once finished and shrink with the food left', () => {
  const { e, anim: a, g } = build('farm', 'bronze', false);
  assert.ok(a.crops, 'Bronze farm has no crops');
  animate(g, e, 1, false); assert.equal(a.crops.visible, false, 'crops show while unfinished');
  e.constructed = true; e.amount = 400; animate(g, e, 1, false);
  assert.equal(a.crops.visible, true); const full = a.crops.scale.y;
  e.amount = 0; animate(g, e, 1, false);
  assert.ok(a.crops.scale.y < full, `crops did not shrink (${a.crops.scale.y} vs ${full})`);
});
