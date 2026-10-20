import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { hashBuildings } from './tools/hash-buildings.js';
import { designOf, DESIGNS } from '../src/render/arch/index.js';
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

// ---------- per-era checks, shared by every era's designs ----------
// Each design differs from the type's design in every other era. Some eras without their own design still share
// today's look with each other, so an era is checked against every other era rather than all pairs
// (distinctAcrossEras) until Task 11.
const differsFromOtherEras = (types, age) => {
  for (const type of types) {
    assert.equal(designOf(type, age).kind, 'design', `${type}: no ${age} design`);
    const own = posHash(type, age);
    for (const a of available(type).filter(a => a !== age)) assert.notEqual(posHash(type, a), own, `${type}: ${age} shares a shape with ${a}`);
  }
};
// The farm's crops show once it is finished and shrink with the food left.
const cropsShrink = age => {
  const { e, anim: a, g } = build('farm', age, false);
  assert.ok(a.crops, `${age} farm has no crops`);
  animate(g, e, 1, false); assert.equal(a.crops.visible, false, `${age}: crops show while unfinished`);
  e.constructed = true; e.amount = 400; animate(g, e, 1, false);
  assert.equal(a.crops.visible, true); const full = a.crops.scale.y;
  e.amount = 0; animate(g, e, 1, false);
  assert.ok(a.crops.scale.y < full, `${age}: crops did not shrink (${a.crops.scale.y} vs ${full})`);
};
// sha1 of the body's and the crops' colour buffers (built), for one owner; not the flag or mast, so a flag alone
// doesn't count as team colour.
const colourHash = (type, age, owner) => {
  const e = { kind: 'building', type, owner, size: BUILDINGS[type].size, constructed: true, progress: 1, amount: 300 }, h = createHash('sha1');
  const { anim } = buildModel(e, age);
  for (const o of [anim.body, anim.crops]) o?.traverse(m => {
    if (!m.isMesh) return;
    const a = m.geometry.attributes.color.array; h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  });
  return h.digest('hex');
};
// Team colour shows on the building itself (banner, stripe or trim): the two owners' bodies differ in colour.
const teamColourShows = (types, age) => {
  const same = types.filter(type => colourHash(type, age, 0) === colourHash(type, age, 1));
  assert.deepEqual(same, [], `${age}: no team colour on ${same.join(', ')}`);
};
// The body stays on its footprint: x/z extents within size / 2, plus 0.15 for eaves (today's legacy roofs already reach
// about 0.065 past the tile edge). overhangs lists the ones that don't.
const overhangs = (types, age) => types.flatMap(type => {
  const bb = new THREE.Box3().setFromObject(build(type, age).anim.body), ext = Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z);
  const max = BUILDINGS[type].size / 2 + 0.15;
  return ext <= max ? [] : [`${type}/${age} ${ext.toFixed(3)} > ${max.toFixed(3)}`];
});
const withinFootprint = (types, age) => assert.deepEqual(overhangs(types, age), [], `${age}: off the footprint`);

// Every era design so far, from the registry, so later eras' designs are checked as they land.
const designed = Object.entries(DESIGNS).map(([age, mod]) => [age, Object.keys(mod)]);
test('every era design shows team colour', () => { for (const [age, types] of designed) teamColourShows(types, age); });
// Designs that still overhang their footprint, by era (none since the eave allowance; Task 3's Town Centers and Houses
// all fit within it). The ratchet below keeps the list exact: fix one, then drop it from here.
const OVERHANG = {};
test('every era design stays within its footprint', () => {
  for (const [age, types] of designed) withinFootprint(types.filter(type => !OVERHANG[age]?.includes(type)), age);
});
test('the OVERHANG list holds exactly the designs that still overhang', () => {
  const still = Object.entries(OVERHANG).flatMap(([age, types]) => overhangs(types, age));
  assert.deepEqual(still.map(o => o.split(' ')[0]), Object.entries(OVERHANG).flatMap(([age, types]) => types.map(type => `${type}/${age}`)), still.join('; '));
});

// ---------- Stone: Granary, Storage Pit, Farm, Barracks ----------
const STONE = ['granary', 'storage_pit', 'farm', 'barracks'];
test('stone designs differ from every other era', () => differsFromOtherEras(STONE, 'stone'));
test('Stone Granary, Storage Pit, Farm and Barracks: heights within the cap', () => heightsOk(STONE));
test('Stone farm: crops show once finished and shrink with the food left', () => cropsShrink('stone'));

// ---------- Bronze: Granary, Storage Pit, Farm, Barracks, Archery Range, Stable, Market, Government Center, Wonder ----------
const BRONZE = ['granary', 'storage_pit', 'farm', 'barracks', 'archery_range', 'stable', 'market', 'government_center', 'wonder'];
test('bronze designs differ from every other era', () => differsFromOtherEras(BRONZE, 'bronze'));
test('Bronze designs: heights within the cap', () => heightsOk(BRONZE));
test('Bronze farm: crops show once finished and shrink with the food left', () => cropsShrink('bronze'));

// ---------- Iron: Granary, Storage Pit, Farm, Barracks, Archery Range, Stable, Market ----------
// The Town Center, House, Government Center and Wonder are kept (today's masonry).
const IRON = ['granary', 'storage_pit', 'farm', 'barracks', 'archery_range', 'stable', 'market'];
test('iron designs differ from every other era', () => differsFromOtherEras(IRON, 'iron'));
test('Iron designs: heights within the cap', () => heightsOk(IRON));
test('Iron farm: crops show once finished and shrink with the food left', () => cropsShrink('iron'));

// ---------- Medieval: Granary, Storage Pit, Farm, Barracks, Archery Range, Stable, Market, Government Center, Wonder ----------
// The Castle is kept (today's stone keep); the Town Center and House are Task 3's.
const MEDIEVAL = ['granary', 'storage_pit', 'farm', 'barracks', 'archery_range', 'stable', 'market', 'government_center', 'wonder'];
test('medieval designs differ from every other era', () => differsFromOtherEras(MEDIEVAL, 'medieval'));
test('Medieval designs: heights within the cap', () => heightsOk(MEDIEVAL));
test('Medieval farm: crops show once finished and shrink with the food left', () => cropsShrink('medieval'));
test('Medieval Storage Pit: the treadwheel is hidden while unfinished and turns once finished', () => {
  const { e, anim: a, g } = build('storage_pit', 'medieval', false);
  assert.ok(a.spinners?.length > 0, 'no treadwheel spinner');
  animate(g, e, 1, false);
  for (const sp of a.spinners) assert.equal(sp.p.visible, false, 'the treadwheel shows while unfinished');
  e.constructed = true; e.progress = 1;
  animate(g, e, 1, false);
  const before = a.spinners.map(sp => sp.p.rotation[sp.axis]);
  animate(g, e, 2, false);
  a.spinners.forEach((sp, i) => {
    assert.equal(sp.p.visible, true, 'the treadwheel is hidden once finished');
    assert.notEqual(sp.p.rotation[sp.axis], before[i], 'the treadwheel does not turn');
  });
});
