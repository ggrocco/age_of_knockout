// Tool Age: every other Tool building keeps today's timber model (legacy.js); these are the two defences, in the same
// timber, wattle and thatch: a wooden lookout platform on braced log legs and a palisade of sharpened stakes.
import * as THREE from 'three';
import { B, C } from '../builder.js';
import { P, flag, stick, hash, streak, CYL6 } from './kit.js';

// A palisade stake's log and its sharpened tip, open-ended (their caps never show) to keep a wall segment cheap.
const LOG = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), TIP = new THREE.ConeGeometry(1, 1, 6, 1, true);
const LOGS = [C.wood, 0x685038, C.woodD], BARK = 0x685038, PLANK_L = 0x8a6038;
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
// The tower's sides, each from one corner to the next.
const SIDES = [[[-1, 1], [1, 1]], [[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]]];

// The tower's dimensions: the deck's height, the legs' splay (half-spread at the foot and at the deck), the parapet's
// height and the roof's foot.
const DECK = 1.5, FOOT_SPREAD = 0.62, DECK_SPREAD = 0.5, PARAPET = 0.36, ROOF_Y = DECK + 0.82;
// The point on the leg at corner (sx, sz) at height y: the legs lean in from their footing to the deck.
const legAt = (sx, sz, y) => {
  const f = y / DECK;
  return [sx * (FOOT_SPREAD + (DECK_SPREAD - FOOT_SPREAD) * f), y, sz * (FOOT_SPREAD + (DECK_SPREAD - FOOT_SPREAD) * f)];
};

// The legs on flat footing stones, braced by crossed poles on every side and tied halfway up.
function towerLegs(b) {
  for (const [sx, sz] of CORNERS) {
    b.cylT(0.12, 0.14, 0.05, C.stone, sx * FOOT_SPREAD, 0.02, sz * FOOT_SPREAD, 7);
    stick(b, 0.07, C.wood, legAt(sx, sz, 0.04), legAt(sx, sz, DECK + 0.04));
  }
  for (const [from, to] of SIDES) {
    stick(b, 0.032, C.woodD, legAt(...from, 0.22), legAt(...to, DECK - 0.08));
    stick(b, 0.032, C.woodD, legAt(...to, 0.22), legAt(...from, DECK - 0.08));
    stick(b, 0.035, BARK, legAt(...from, 0.78), legAt(...to, 0.78));
  }
}
// The deck (joists and planks, a little proud of the legs) and its parapet: wattle panels between corner posts under a
// rail; the team-dyed hides hung over its camera sides.
function towerDeck(ctx) {
  const { b, t } = ctx;
  b.box(1.22, 0.06, 1.22, C.woodD, 0, DECK - 0.02, 0);
  for (let i = 0; i < 6; i++) b.box(0.2, 0.04, 1.3, i % 2 ? C.wood : PLANK_L, -0.55 + i * 0.22, DECK + 0.04, 0);
  for (const [x, z, w, d] of [[0, 0.63, 1.26, 0.05], [0, -0.63, 1.26, 0.05], [0.63, 0, 0.05, 1.26], [-0.63, 0, 0.05, 1.26]]) {
    b.box(w, PARAPET, d, P.wattle, x, DECK + 0.08, z).box(w + 0.02, 0.04, d + 0.02, C.woodD, x, DECK + 0.08 + PARAPET, z);
  }
  b.box(0.7, 0.34, 0.02, t, -0.18, DECK + 0.02, 0.665).box(0.7, 0.05, 0.025, P.hideD, -0.18, DECK + 0.3, 0.668);
  b.box(0.02, 0.34, 0.5, t, 0.665, DECK + 0.02, -0.25).box(0.025, 0.05, 0.5, P.hideD, 0.668, DECK + 0.3, -0.25);
  b.box(0.3, 0.22, 0.02, P.hide, 0.32, DECK + 0.12, 0.665);
}
// Corner poles and the thatched pyramid roof, with a darker eave course and a ridge knot.
function towerRoof(b) {
  for (const [sx, sz] of CORNERS) b.cyl(0.04, ROOF_Y - DECK - 0.08, C.woodD, sx * 0.6, DECK + 0.08, sz * 0.6);
  b.cone(0.98, 0.18, C.thatchD, 0, ROOF_Y - 0.06, 0, 4, Math.PI / 4);
  b.cone(0.9, 0.62, C.thatch, 0, ROOF_Y + 0.04, 0, 4, Math.PI / 4);
  b.cylT(0.05, 0.09, 0.12, C.woodD, 0, ROOF_Y + 0.58, 0, 6);
}
// The ladder up the front to a gap beside the hides.
function towerLadder(b) {
  const footZ = 1.02, topZ = 0.66;
  for (const x of [0.28, 0.5]) stick(b, 0.025, C.wood, [x, 0.04, footZ], [x, DECK + 0.42, topZ - 0.02]);
  for (let i = 1; i < 9; i++) {
    const f = i / 9, y = 0.04 + f * (DECK + 0.38), z = footZ + (topZ - footZ) * f;
    b.box(0.26, 0.03, 0.03, C.woodD, 0.39, y, z); // a rung
  }
}
// A bundle of spears against the back-left leg, and a basket of sling stones at the foot.
function towerArms(b) {
  for (let i = 0; i < 4; i++) {
    const dz = (i - 1.5) * 0.04;
    stick(b, 0.014, C.wood, [-0.82, 0.04, -0.4 + dz], [-0.6, 1.2, -0.48 + dz]);
    stick(b, 0.025, C.stoneD, [-0.6, 1.2, -0.48 + dz], [-0.585, 1.29, -0.485 + dz], CYL6);
  }
  b.cylT(0.13, 0.1, 0.16, P.wattle, -0.3, 0.04, 0.82, 7);
  for (let i = 0; i < 5; i++) {
    b.rock(0.045, C.stoneD, -0.3 + (hash(i, 3) - 0.5) * 0.14, 0.16, 0.82 + (hash(i, 7) - 0.5) * 0.14, 1, 0.8, 1, i);
  }
}

// Tower: a wooden lookout platform. Four log legs, splayed a little and braced with crossed poles, carry a plank deck
// ringed by a wattle parapet, where team-dyed hides hang over the front; corner poles hold up a thatched pyramid roof
// with the flag on its peak. A ladder climbs to the deck, a bundle of spears leans on a leg and a basket of stones waits
// at the foot. Its shot is a volley of fire arrows loosed over the parapet (extra.fire).
export function tower(ctx) {
  const { b, extra } = ctx;
  b.box(1.64, 0.04, 1.64, P.dirt);
  towerLegs(b);
  towerDeck(ctx);
  towerRoof(b);
  towerLadder(b);
  towerArms(b);
  flag(ctx, 0, ROOF_Y + 0.66, 0, 0.62);
  // The volley: three burning arrows streaking out over the parapet toward the camera sides.
  const fire = new B();
  for (const [dx, dz] of [[0, 1], [0.7, 0.7], [1, 0]]) {
    streak(fire, [dx * 0.7, 0.1, dz * 0.7], [dx * 1.55, -0.1, dz * 1.55], 0.03, undefined, P.fire, 0.085);
  }
  extra.fire = { geo: fire.geometry(), at: [0, DECK + PARAPET, 0] };
  return ROOF_Y + 0.64;
}

// Wall: a palisade. A segment is a square block of sixteen sharpened stakes of uneven height, rammed into an earth
// bank and lashed with a dark binding beam and a team-dyed hide band; it fills its tile edge to edge, so segments in a
// line, either way or diagonally, close up into one stockade.
export function wall(ctx) {
  const { b, t } = ctx;
  b.box(1, 0.06, 1, P.dirt);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = -0.375 + i * 0.25, z = -0.375 + j * 0.25, height = 0.74 + hash(i, j) * 0.16, radius = 0.118 + hash(j, i) * 0.004;
    b.add(LOG, LOGS[(i + j * 2) % 3], x, 0.06 + height / 2, z, radius, height, radius);
    b.add(TIP, C.wood, x, 0.06 + height + 0.08, z, radius, 0.16, radius);
  }
  b.box(1, 0.06, 1, C.woodD, 0, 0.26, 0).box(1, 0.05, 1, t, 0, 0.6, 0); // the binding beam and the team band
  return 1.08;
}
