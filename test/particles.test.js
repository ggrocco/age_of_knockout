import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createParticles } from '../src/render/particles.js';
import { MODEL_MATERIAL } from '../src/render/models.js';
import { QUALITY } from '../src/render/quality.js';

// A stand-in for the view's groups: a model part (so the building can be measured) and the entity it shows.
function group(entity, x = 10, z = 10) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), MODEL_MATERIAL));
  g.position.set(x, 1, z); g.updateMatrixWorld(true);
  g.userData.entity = entity;
  return g;
}
const building = (hp, constructed = true) => ({ kind: 'building', type: 'house', hp, maxHp: 100, constructed, size: 2 });
let seed = 7;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
// Runs the emitters for `seconds` of animation time at 30 frames a second.
function run(particles, groups, seconds, from = 0) {
  for (let i = 0; i <= seconds * 30; i++) particles.update(from + i / 30, groups);
}

test('a building burns below half health, more the more damaged, and never healthy or unfinished', () => {
  const count = hp => { const p = createParticles({ capacity: 4000, rate: 1 }, random); run(p, [group(building(hp))], 2); return p.alive; };
  assert.equal(count(100), 0); assert.equal(count(60), 0);
  const p = createParticles({ capacity: 4000, rate: 1 }, random); run(p, [group(building(20, false))], 2);
  assert.equal(p.alive, 0, 'a foundation does not burn');
  assert.ok(count(40) > 0);
  assert.ok(count(5) > count(40) * 1.5, 'heavier damage, more fire and smoke');
});

test('nothing is born while the animation clock is paused', () => {
  const p = createParticles({ capacity: 4000, rate: 1 }, random), groups = [group(building(10))];
  for (let i = 0; i < 60; i++) p.update(5, groups); // same time every frame
  assert.equal(p.alive, 0);
});

test('moving mounted and siege units kick up dust; villagers, ships and standing units do not', () => {
  const dust = (type, moving) => {
    const p = createParticles({ capacity: 4000, rate: 1 }, random), g = group({ kind: 'unit', type, hp: 10, maxHp: 10 });
    for (let i = 0; i <= 60; i++) { if (moving) g.position.x += 0.08; p.update(i / 30, [g]); }
    return p.alive;
  };
  assert.ok(dust('scout', true) > 0 && dust('catapult', true) > 0);
  assert.ok(dust('scout', true) > dust('clubman', true), 'cavalry raises more dust than infantry');
  assert.equal(dust('villager', true), 0);
  assert.equal(dust('scout', false), 0);
  assert.equal(dust('fishing_ship', true), 0);
});

test('a destroyed building bursts; the ring overwrites the oldest particles instead of growing', () => {
  const p = createParticles({ capacity: 64, rate: 1 }, random), g = group(building(0));
  p.update(1, []); p.burst(g, building(0));
  assert.ok(p.alive > 20, 'fire, smoke, debris and dust');
  for (let i = 0; i < 5; i++) p.burst(g, building(0));
  assert.equal(p.capacity, 64); assert.ok(p.alive <= 64);
  p.update(30, []);
  assert.equal(p.alive, 0, 'every particle dies');
});

test('each preset has a particle budget, Balanced the smallest', () => {
  for (const preset of Object.values(QUALITY)) assert.ok(preset.particles.capacity > 0 && preset.particles.rate > 0, preset.label);
  assert.ok(QUALITY.balanced.particles.capacity < QUALITY.high.particles.capacity);
  assert.ok(QUALITY.balanced.particles.rate < QUALITY.high.particles.rate);
});
