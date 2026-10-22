import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { UNITS } from '../src/data/units.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { AGES, ageIndex } from '../src/data/ages.js';
import { buildModel, animate } from '../src/render/models.js';
import { ERA_STYLE } from '../src/render/styles.js';

function checkGeometry(model, label) {
  let meshes = 0;
  model.root.updateMatrixWorld(true);
  model.root.traverse(object => {
    if (!object.isMesh) return;
    meshes++;
    const { position, normal, color } = object.geometry.attributes;
    assert.ok(position.count > 0, `${label}: empty geometry`);
    assert.equal(normal.count, position.count, `${label}: missing normals`);
    if (object.material.vertexColors) assert.equal(color.count, position.count, `${label}: missing colors`);
    if (object.geometry.attributes.surface) {
      const surface = object.geometry.attributes.surface;
      assert.equal(surface.count, position.count, `${label}: missing material categories`);
      assert.ok(surface.array.every(v => Number.isFinite(v) && v >= 0 && v <= 4), `${label}: invalid material category`);
    }
    for (const attribute of [position, normal, color].filter(Boolean)) {
      assert.ok(attribute.array.every(Number.isFinite), `${label}: non-finite vertex data`);
    }
    object.geometry.computeBoundingSphere();
    assert.ok(Number.isFinite(object.geometry.boundingSphere.radius), `${label}: invalid culling bounds`);
  });
  assert.ok(meshes > 0, `${label}: no meshes`);
  const bounds = new THREE.Box3().setFromObject(model.root);
  assert.ok(!bounds.isEmpty() && bounds.max.y > bounds.min.y, `${label}: no volume`);
}

test('all building ages and teams have complete, finite renderable geometry', () => {
  for (const age of AGES) for (const owner of [0, 1]) for (const [type, spec] of Object.entries(BUILDINGS)) {
    const e = { kind: 'building', type, owner, size: spec.size, constructed: false, progress: 0.4, amount: 300 };
    const model = buildModel(e, age), g = new THREE.Group(); g.userData.anim = model.anim;
    animate(g, e, 1, false);
    checkGeometry(model, `${type}/${age}/${owner}`);
    assert.equal(model.anim.scaffold.visible, true);
    e.constructed = true; animate(g, e, 2, false);
    assert.equal(model.anim.scaffold.visible, false);
    assert.equal(model.anim.body.scale.y, 1);
  }
});

test('every unit renders and animates idle, movement and attack states', () => {
  for (const owner of [0, 1]) for (const [type, spec] of Object.entries(UNITS)) {
    const e = { ...spec, kind: 'unit', type, owner, id: 3, carry: { amount: 0 }, cd: 39, cooldown: 40 };
    const model = buildModel(e), g = new THREE.Group(); g.add(model.root); g.userData.anim = model.anim;
    for (const order of [{ type: 'idle' }, { type: 'move' }, { type: 'attack' }, { type: 'gather', kind: 'wood', phase: 'work' }]) {
      e.order = order;
      animate(g, e, 2.5, order.type === 'move');
      g.updateMatrixWorld(true);
      g.traverse(o => assert.ok(o.matrixWorld.elements.every(Number.isFinite), `${type}: invalid animation transform`));
    }
    checkGeometry(model, type);
  }
});

test('age upgrades change architecture without changing earlier cached models', () => {
  const e = Object.freeze({ kind: 'building', type: 'town_center', owner: 0, size: 3 });
  const stone = buildModel(e, 'stone');
  const geometry = stone.anim.body.children[0].geometry;
  const original = geometry.attributes.position.array.slice();
  const bronze = buildModel(e, 'bronze');
  assert.notDeepEqual(geometry.attributes.position.array, bronze.anim.body.children[0].geometry.attributes.position.array);
  assert.deepEqual(geometry.attributes.position.array, original);
  assert.notEqual(stone.root, buildModel(e, 'stone').root, 'instances must have independent animation transforms');
});

test('resources and relics have finite geometry and independent animations', () => {
  for (const type of ['tree', 'berry', 'gold', 'stone']) for (let id = 0; id < 6; id++) {
    const e = { kind: 'resource', type, id, amount: 50 }, model = buildModel(e), g = new THREE.Group();
    g.userData.anim = model.anim; animate(g, e, 1, false); checkGeometry(model, `${type}/${id}`);
  }
  checkGeometry(buildModel({ kind: 'relic' }), 'relic');
});

test('era units get their own models, not catapult or horse fallbacks', () => {
  const kinds = { tank: 'tank', trebuchet: 'treb', cannon: 'gun', field_artillery: 'gun', knight: 'horse', catapult: 'cat' };
  for (const [type, kind] of Object.entries(kinds)) assert.equal(buildModel({ ...UNITS[type], kind: 'unit', type, owner: 0, id: 1 }).anim.type, kind, type);
});
test('a fast-firing unit still alternates its attack pose', () => {
  const e = { ...UNITS.machine_gunner, kind: 'unit', type: 'machine_gunner', owner: 0, id: 1, cooldown: 12, carry: { amount: 0 }, order: { type: 'attack' } };
  const m = buildModel(e), g = new THREE.Group(); g.add(m.root); g.userData.anim = m.anim;
  e.cd = 11; animate(g, e, 1, false); const fired = m.anim.armR.rotation.x;
  e.cd = 2; animate(g, e, 1, false); assert.notEqual(m.anim.armR.rotation.x, fired);
});

const colorsOf = (type, age) => { const m = buildModel({ kind: 'building', type, owner: 0, size: BUILDINGS[type].size, constructed: true, progress: 1, amount: 0 }, age); const out = []; m.root.traverse(o => { if (o.isMesh && o.geometry.attributes.color) out.push(...o.geometry.attributes.color.array); }); return out.join(); };
test('every era has a building style; the new eras look distinct', () => {
  for (const a of AGES) assert.ok(ERA_STYLE[a], a);
  assert.deepEqual(['stone', 'tool', 'bronze', 'iron'].map(a => ERA_STYLE[a].key), ['timber', 'timber', 'masonry', 'masonry']);
  const keys = ['medieval', 'sail', 'industrial', 'modern', 'future'].map(a => ERA_STYLE[a].key);
  assert.equal(new Set([...keys, 'timber', 'masonry']).size, 7);
});
test('buildings re-skin in every new era', () => {
  // Before it unlocks a building shows its unlock-era design, so each chain starts at the unlock era.
  for (const type of ['town_center', 'barracks', 'house', 'castle', 'factory']) {
    const chain = ['iron', 'medieval', 'sail', 'industrial', 'modern', 'future'].filter(a => ageIndex(a) >= ageIndex(BUILDINGS[type].age));
    for (let i = 1; i < chain.length; i++) assert.notEqual(colorsOf(type, chain[i]), colorsOf(type, chain[i - 1]), `${type} ${chain[i]}`);
  }
});
test('Castle and Factory have their own geometry, not the placeholder box', () => {
  for (const type of ['castle', 'factory']) { const m = buildModel({ kind: 'building', type, owner: 0, size: BUILDINGS[type].size, constructed: true, progress: 1, amount: 0 }, 'modern'); assert.ok(m.anim.body.children[0].geometry.attributes.position.count > 100, type); }
});
test('the Mine has finite geometry in every era and animates only while dug', () => {
  for (const age of AGES) for (const owner of [0, 1]) {
    const e = { kind: 'building', type: 'mine', owner, size: BUILDINGS.mine.size, constructed: true, progress: 1, amount: 1500, gatherType: 'gold', digging: 0 };
    const model = buildModel(e, age), g = new THREE.Group(); g.add(model.root); g.userData.anim = model.anim;
    checkGeometry(model, `mine/${age}/${owner}`);
    const { wheel, cart } = model.anim;
    assert.ok(wheel && cart, `mine/${age}: no wheel or cart`);
    animate(g, e, 0, false); const still = cart.p.position.toArray(), spin = wheel.p.rotation[wheel.axis];
    animate(g, e, 1, false);
    assert.deepEqual(cart.p.position.toArray(), still, `mine/${age}: the cart runs while nobody digs`);
    assert.equal(wheel.p.rotation[wheel.axis], spin, `mine/${age}: the wheel turns while nobody digs`);
    e.digging = 2; animate(g, e, 2, false); const at = cart.p.position.toArray(), turned = wheel.p.rotation[wheel.axis];
    animate(g, e, 2.5, false);
    assert.notDeepEqual(cart.p.position.toArray(), at, `mine/${age}: the cart stays put while dug`);
    assert.notEqual(wheel.p.rotation[wheel.axis], turned, `mine/${age}: the wheel stays still while dug`);
    // Under construction the moving parts hide.
    e.constructed = false; e.progress = 0.4; animate(g, e, 3, false);
    assert.equal(cart.p.visible, false); assert.equal(wheel.p.visible, false);
  }
});
