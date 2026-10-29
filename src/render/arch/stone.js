// Stone Age: hide tents, a chieftain's round hut with a totem, stilted grain huts, a log-lined storage pit, a staked
// patch of wild grain and a sparring ground.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, firePit, stick, lerp, hash } from './kit.js';

// Unit-tall shapes centred on the origin along +y, for stick(): a sheaf (narrow at the base), a club (thick at the
// head), a grain stalk and a spear point.
const SHEAF = new THREE.CylinderGeometry(1, 0.7, 1, 6), CLUB = new THREE.CylinderGeometry(1, 0.45, 1, 6);
const STALK = new THREE.CylinderGeometry(0.4, 1, 1, 4), POINT = new THREE.ConeGeometry(1, 1, 5);
const SOIL = 0x6b4a26, DUG_EARTH = 0x6a5a42, SAND = 0xa48a5e, HIDE_L = 0xb39169, STRAW = 0xd8b755;
const GRAIN_LEAVES = [0x7d9a42, 0x949a45, 0x6f8f3a];

// House: a hide tent on a dirt floor, its poles crossing out of the smoke hole, a door flap, a fire and a drying rack.
export function house(ctx) {
  const { b, t } = ctx;
  b.cyl(0.66, 0.05, P.dirt);
  b.cone(0.6, 1.25, P.hide, 0, 0.05, 0, 9); // the tent
  b.cylT(0.39, 0.43, 0.06, t, 0, 0.45, 0, 9).cylT(0.2, 0.24, 0.05, P.hideD, 0, 0.82, 0, 9); // a team band, a dark one
  for (let i = 0; i < 5; i++) { // the poles splaying out of the smoke hole
    const angle = i * Math.PI * 0.4, cos = Math.cos(angle), sin = Math.sin(angle);
    b.cyl(0.018, 0.5, C.woodD, cos * 0.05, 1.12, sin * 0.05, sin * 0.35, 0, -cos * 0.35);
  }
  b.box(0.24, 0.46, 0.04, C.dark, 0, 0.05, 0.43, -0.45); // the door flap
  firePit(ctx, 0.62, 0.5);
  // A drying rack hung with a hide.
  b.box(0.04, 0.5, 0.04, C.woodD, -0.62, 0.05, -0.45).box(0.04, 0.5, 0.04, C.woodD, -0.62, 0.05, 0.05);
  b.box(0.04, 0.04, 0.54, C.wood, -0.62, 0.52, -0.2).box(0.02, 0.32, 0.4, P.hideD, -0.62, 0.2, -0.2);
  return 1.61;
}

// Town Center: the chieftain's round hut of wattle and thatch with a bone-framed door, a totem, a fire, hide-drying
// racks and scattered bones.
export function town_center(ctx) {
  const { b } = ctx;
  b.cyl(1.32, 0.08, P.dirt);
  b.cylT(0.95, 1.0, 0.72, P.wattle, 0, 0.08, 0, 12).cone(1.28, 1.35, C.thatch, 0, 0.74, 0, 12); // walls and roof
  b.cylT(0.86, 0.9, 0.07, C.thatchD, 0, 1.06, 0, 12).cyl(0.09, 0.14, C.dark, 0, 2.03, 0); // a thatch course, smoke hole
  b.box(0.4, 0.52, 0.12, C.dark, 0, 0.08, 0.95).add(unit.tor, P.bone, -0.02, 0.48, 1.02, 0.34, 0.36, 0.34); // the door
  totem(ctx, -1.0, 0.8);
  firePit(ctx, 0.95, 0.85);
  for (const [x, z] of [[1.0, -0.6], [0.6, -1.05]]) dryingRack(b, x, z);
  for (const [x, z, turn] of [[-0.6, -1.1, 0.4], [0.2, 1.2, 1.2]]) b.box(0.28, 0.04, 0.05, P.bone, x, 0.08, z, 0, turn);
  flag(ctx, 0, 2.0, 0);
  return 2.17;
}
// Totem: carved post with a team-coloured band, bone eyes and outstretched arms.
function totem(ctx, x, z) {
  const { b, t } = ctx;
  b.box(0.22, 0.36, 0.22, C.wood, x, 0.08, z).box(0.27, 0.3, 0.27, t, x, 0.44, z).box(0.22, 0.32, 0.22, C.woodD, x, 0.74, z);
  b.box(0.6, 0.07, 0.12, C.wood, x, 0.98, z); // the arms
  b.sph(0.06, P.bone, x - 0.06, 0.6, z + 0.14).sph(0.06, P.bone, x + 0.06, 0.6, z + 0.14); // the eyes
}
// A hide-drying rack: two posts, a crossbar and the hide stretched below it.
function dryingRack(b, x, z) {
  b.box(0.04, 0.55, 0.04, C.woodD, x - 0.22, 0.08, z).box(0.04, 0.55, 0.04, C.woodD, x + 0.22, 0.08, z);
  b.box(0.5, 0.04, 0.04, C.wood, x, 0.6, z).box(0.4, 0.34, 0.02, P.hide, x, 0.24, z);
}

// Hides lashed over a sloping frame, from the back edge [y, z] down to the front edge, across x0..x1: one hide per
// bay (colours), sagging between the rafter poles that lash it down, its ragged end hanging over the front pole.
const hideRoof = (b, x0, x1, [backY, backZ], [frontY, frontZ], bays) => {
  const pitch = Math.atan2(backY - frontY, frontZ - backZ), length = Math.hypot(frontZ - backZ, backY - frontY) + 0.14;
  const bayWidth = (x1 - x0) / bays.length, sag = 0.16;
  // The point at x, `down` along the slope from its back edge and `out` off it along its normal.
  const at = (x, down, out) => [
    x,
    backY + 0.04 - down * Math.sin(pitch) + out * Math.cos(pitch),
    backZ - 0.07 + down * Math.cos(pitch) + out * Math.sin(pitch),
  ];
  bays.forEach((color, i) => {
    // Two halves of the hide, each tipped down towards the middle of the bay.
    for (const k of [-1, 1]) {
      const [x, y, z] = at(x0 + (i + 0.5 + k * 0.25) * bayWidth, length / 2, -Math.tan(sag) * bayWidth / 4);
      b.box(bayWidth / 2 / Math.cos(sag) + 0.012, 0.03, length, color, x, y - 0.015, z, pitch, 0, k * sag);
    }
    // The ragged end hanging over the front pole.
    const fringe = 0.07 + ((i * 2) % 3) * 0.035, [x, y, z] = at(x0 + (i + 0.5) * bayWidth, length - 0.01, -0.03);
    b.box(bayWidth * 0.8, fringe, 0.025, color, x, y - fringe, z, -0.12);
  });
  for (let i = 0; i <= bays.length; i++) {
    stick(b, 0.02, C.woodD, at(x0 + i * bayWidth, 0.02, 0.01), at(x0 + i * bayWidth, length - 0.04, 0.01)); // rafters
  }
};

// A storage hut of wattle and thatch of radius `radius` on four stilts capped with flat stones against rats, standing
// on a log deck; returns the height of its wall's foot (its door sill).
function stiltHut(ctx, x, z, radius, legHeight, wallHeight, roofHeight) {
  const { b, t } = ctx, legAt = radius * 0.62, deck = 0.085 + legHeight, wallBase = deck + 0.08, turn = Math.PI / 10;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const legX = x + dx * legAt, legZ = z + dz * legAt;
    b.cyl(0.035, legHeight, C.woodD, legX, 0.05, legZ).cylT(0.075, 0.09, 0.035, C.stone, legX, 0.05 + legHeight, legZ, 8);
  }
  for (let i = -2; i <= 2; i++) {
    const logZ = z + i * radius * 0.4;
    stick(b, 0.04, i % 2 ? C.wood : C.woodD, [x - radius - 0.05, deck + 0.04, logZ], [x + radius + 0.05, deck + 0.04, logZ]);
  }
  b.cylT(radius, radius + 0.02, wallHeight, P.wattle, x, wallBase, z, 10, 0, turn);
  b.cylT(radius + 0.012, radius + 0.016, 0.025, C.woodD, x, wallBase + wallHeight * 0.62, z, 10, 0, turn);
  b.cylT(radius + 0.018, radius + 0.024, 0.08, t, x, wallBase + wallHeight * 0.22, z, 10, 0, turn); // team-dyed hide band
  // The thatched cone, its eave course and its knot.
  b.cone(radius + 0.13, roofHeight, C.thatch, x, wallBase + wallHeight - 0.05, z, 10);
  b.cylT(radius + 0.1, radius + 0.14, 0.05, C.thatchD, x, wallBase + wallHeight - 0.06, z, 10);
  b.cylT(0.03, 0.06, 0.12, C.thatchD, x, wallBase + wallHeight + roofHeight - 0.1, z, 6);
  b.box(0.17, Math.min(0.27, wallHeight * 0.62), 0.05, C.dark, x, wallBase + 0.02, z + radius * 0.97); // the door
  return wallBase;
}
// A stook: a bound bundle of sheaves bristling with ears, two loose sheaves leaning on it.
function stook(b, x, z) {
  b.cylT(0.075, 0.15, 0.3, STRAW, x, 0.05, z, 8).cylT(0.08, 0.085, 0.035, C.thatchD, x, 0.28, z, 8);
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7, spread = i ? 0.055 : 0, cos = Math.cos(angle), sin = Math.sin(angle);
    const foot = [x + cos * spread * 0.6, 0.3, z + sin * spread * 0.6];
    const tip = [x + cos * spread * 1.6, 0.5 - (i % 2) * 0.03, z + sin * spread * 1.6];
    stick(b, 0.035, i % 2 ? C.thatch : C.hay, foot, tip, POINT);
  }
  for (const angle of [0.6, 2.4]) {
    const foot = [x + Math.cos(angle) * 0.24, 0.05, z + Math.sin(angle) * 0.24];
    const top = [x + Math.cos(angle) * 0.1, 0.4, z + Math.sin(angle) * 0.1];
    stick(b, 0.045, C.hay, foot, lerp(foot, top, 0.72), SHEAF);
    stick(b, 0.06, C.thatch, lerp(foot, top, 0.7), lerp(foot, top, 1.02), SHEAF);
  }
}
// Granary: two storage huts of wattle and thatch, raised on stilts capped with flat stones against rats; a ladder up
// to the big hut, grain baskets, a grinding stone and a stook of sheaves.
export function granary(ctx) {
  const { b } = ctx;
  b.cyl(0.86, 0.05, P.dirt);
  const hutX = -0.32, hutZ = -0.24, hutRadius = 0.34, sill = stiltHut(ctx, hutX, hutZ, hutRadius, 0.4, 0.44, 0.58);
  stiltHut(ctx, 0.47, 0.02, 0.25, 0.3, 0.34, 0.44);
  // Ladder from the yard up to the big hut's door.
  const foot = [hutX, 0.05, hutZ + hutRadius + 0.4], top = [hutX, sill + 0.02, hutZ + hutRadius + 0.04];
  for (const dx of [-0.08, 0.08]) stick(b, 0.02, C.wood, [foot[0] + dx, foot[1], foot[2]], [top[0] + dx, top[1], top[2]]);
  for (const along of [0.3, 0.62, 0.92]) {
    const [x, y, z] = lerp(foot, top, along);
    stick(b, 0.015, C.woodD, [x - 0.1, y, z], [x + 0.1, y, z]);
  }
  // Grain baskets and a grinding stone.
  for (const [x, z, r] of [[-0.68, 0.42, 0.13], [-0.6, 0.72, 0.11], [-0.3, 0.74, 0.1]]) {
    b.cylT(r, r * 0.78, 0.17, P.wattle, x, 0.05, z, 8).cylT(r + 0.01, r + 0.01, 0.025, C.wood, x, 0.2, z, 8);
    b.sph(r * 0.85, C.hay, x, 0.22, z, 1, 0.5, 1);
  }
  b.rock(0.12, C.stoneD, 0.02, 0.05, 0.66, 1.3, 0.35, 1, 0.4).sph(0.05, C.stone, 0.02, 0.15, 0.66, 1.4, 0.7, 0.8);
  stook(b, 0.4, 0.58);
  return 1.59;
}

// The pit's log crib round (x, z), `half` from the centre to each side: two courses all round, the ends crossing at the
// corners.
function logCrib(b, x, z, half) {
  for (const [y, color] of [[0.105, C.woodD], [0.205, C.wood]]) for (const k of [-1, 1]) {
    stick(b, 0.055, color, [x - half - 0.1, y, z + k * half], [x + half + 0.1, y, z + k * half]);
    stick(b, 0.055, color, [x + k * half, y + 0.01, z - half - 0.1], [x + k * half, y + 0.01, z + half + 0.1]);
  }
}
// Stones and gold heaped in the pit's open half.
function pitHoard(b) {
  const stones = [[-0.34, 0.12, 0.13, 0.04, C.stone], [-0.16, 0.2, 0.1, 0.04, C.stoneD], [-0.28, -0.02, 0.1, 0.04, C.stoneD],
    [-0.26, 0.1, 0.09, 0.15, C.stone]];
  for (const [x, z, r, y, color] of stones) b.rock(r, color, x, y, z, 1, 0.9, 1, x * 9);
  const gold = [[0.1, 0.16, 0.09, 0.04], [0.18, 0.02, 0.08, 0.04], [0.02, 0.03, 0.08, 0.04], [0.1, 0.08, 0.07, 0.15]];
  for (const [x, z, r, y] of gold) b.rock(r, C.gold, x, y, z, 1, 0.8, 1, z * 20);
}
// Storage Pit: a pit dug into the ground and lined with a log crib, its back half roofed with hides (one dyed in the
// team colour) on a log frame; stones and gold heaped in the open half, cut logs stacked beside it, dug earth around.
export function storage_pit(ctx) {
  const { b, t } = ctx, pitX = -0.14, pitZ = -0.12, half = 0.46;
  b.cyl(0.86, 0.05, P.dirt);
  for (const [x, z, r, turn] of [[-0.62, 0.56, 0.19, 0.3], [0.12, 0.66, 0.17, 1.1], [0.62, -0.62, 0.16, 2]]) {
    b.rock(r, DUG_EARTH, x, 0.02, z, 1.3, 0.6, 1, turn);
  }
  b.box(half * 2, 0.014, half * 2, C.dark, pitX, 0.05, pitZ);
  logCrib(b, pitX, pitZ, half);
  pitHoard(b);
  // Log frame: tall posts at the back, short ones mid-pit, hides lashed between them.
  const xs = [pitX - half - 0.04, pitX + half + 0.04], backZ = pitZ - half - 0.03, frontZ = pitZ + 0.06;
  const backY = 0.92, frontY = 0.56;
  for (const x of xs) {
    b.cyl(0.04, backY - 0.05, C.woodD, x, 0.05, backZ).cyl(0.035, frontY - 0.05, C.woodD, x, 0.05, frontZ);
    stick(b, 0.03, C.wood, [x, frontY - 0.02, frontZ], [x, backY - 0.02, backZ]);
  }
  stick(b, 0.045, C.wood, [xs[0] - 0.1, backY, backZ], [xs[1] + 0.1, backY, backZ]);
  stick(b, 0.04, C.wood, [xs[0] - 0.08, frontY, frontZ], [xs[1] + 0.08, frontY, frontZ]);
  hideRoof(b, xs[0] - 0.06, xs[1] + 0.06, [backY, backZ], [frontY, frontZ], [P.hideD, t, P.hide]);
  // Cut logs stacked beside the pit.
  for (const [x, y] of [[0.5, 0.11], [0.64, 0.11], [0.78, 0.11], [0.57, 0.21], [0.71, 0.21]]) {
    stick(b, 0.06, x === 0.64 || x === 0.57 ? C.woodD : C.wood, [x, y, 0.22], [x, y, 0.84]);
  }
  return 1.0;
}

// The sixteen stake positions round the farm's edge, `edge` from the centre: four along each side, going round.
const stakeRing = edge => {
  const at = [];
  for (let i = 0; i < 16; i++) {
    const along = (i % 4) / 2 - 1, side = [[along, -1], [1, along], [-along, 1], [-1, -along]][i >> 2];
    at.push([side[0] * edge, side[1] * edge]);
  }
  return at;
};
// Sixteen stakes round the edge, leaning a little, with a cord between them; one gap at the front.
function stakesAndCord(ctx) {
  const { b, t } = ctx, at = stakeRing(0.8);
  at.forEach(([x, z], i) => {
    const height = 0.27 + (i % 3) * 0.04, lean = ((i * 5) % 7 - 3) * 0.02, top = [x + lean, 0.05 + height, z - lean * 0.6];
    stick(b, 0.022, C.wood, [x, 0.03, z], top);
    stick(b, 0.024, C.woodD, top, [top[0], top[1] + 0.06, top[2]], POINT);
    if (i % 4 === 0) stick(b, 0.03, t, lerp([x, 0.03, z], top, 0.6), lerp([x, 0.03, z], top, 0.78)); // team-dyed tie
    const [nextX, nextZ] = at[(i + 1) % 16];
    if (i !== 9) stick(b, 0.008, C.leather, [x, 0.2, z], [nextX, 0.2, nextZ]);
  });
}
// Wild grain: leafy clumps on a jittered grid with gaps, each with three ripening stalks and their seed heads.
function wildGrain() {
  const crops = new B();
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    if (hash(i, j) < 0.1 || (i < 2 && j < 2) || (i >= 4 && i <= 5 && j === 6)) continue;
    const x = -0.63 + i * 0.21 + (hash(j, i) - 0.5) * 0.1, z = -0.63 + j * 0.21 + (hash(i + 9, j) - 0.5) * 0.1;
    crops.cone(0.075, 0.2, GRAIN_LEAVES[(i + 2 * j) % 3], x, 0.03, z, 5, i + j);
    for (let k = 0; k < 3; k++) {
      const angle = k * 2.1 + i * 1.7 + j, height = 0.3 + hash(i * 3 + k, j) * 0.14;
      const tip = [x + Math.cos(angle) * 0.06, 0.03 + height, z + Math.sin(angle) * 0.06];
      stick(crops, 0.014, (i * 3 + j + k) % 3 ? 0xb0a64a : 0x8bab45, [x, 0.03, z], tip, STALK);
      crops.rock(0.03, k % 2 ? 0xd9a93a : 0xc8962e, tip[0], tip[1] - 0.025, tip[2], 1, 2.2, 1, angle);
    }
  }
  return crops.geometry();
}
// Farm: a patch of wild grain staked out with a cord, team-dyed ties on the corner stakes, a bird-scarer hung with a
// team-dyed hide, and a gathering basket. The grain is extra.crops, which animate() shows once the farm is finished
// and shrinks as its food runs out.
export function farm(ctx) {
  const { b, t, extra } = ctx;
  b.box(1.76, 0.03, 1.76, P.dirt);
  for (const [x, z, r] of [[-0.3, -0.25, 0.5], [0.3, 0.22, 0.46], [0.32, -0.4, 0.34], [-0.36, 0.38, 0.36], [0.0, 0.0, 0.4]]) {
    b.cyl(r, 0.045, SOIL, x, 0, z);
  }
  stakesAndCord(ctx);
  // The bird-scarer: a cross-stake hung with a team-dyed hide, a straw bundle for a head.
  const scarerX = -0.6, scarerZ = -0.6, turn = Math.PI / 4;
  b.cyl(0.03, 0.66, C.woodD, scarerX, 0.03, scarerZ); // the stake
  b.cone(0.07, 0.16, C.hay, scarerX, 0.62, scarerZ, 6).sph(0.055, C.hay, scarerX, 0.64, scarerZ); // the straw head
  stick(b, 0.022, C.wood, [scarerX - 0.17, 0.52, scarerZ + 0.17], [scarerX + 0.17, 0.52, scarerZ - 0.17]);
  b.box(0.3, 0.26, 0.025, t, scarerX, 0.27, scarerZ, 0, turn).box(0.32, 0.04, 0.03, P.hideD, scarerX, 0.49, scarerZ, 0, turn);
  // A gathering basket of grain by the gap in the cord.
  b.cylT(0.12, 0.09, 0.15, P.wattle, 0.2, 0.03, 0.68, 8).sph(0.1, C.hay, 0.2, 0.18, 0.68, 1, 0.45, 1);
  extra.crops = wildGrain();
  return 0.8;
}

// The sparring ring at (x, z): trodden sand inside a circle of stones, and in the middle a training post, a
// hide-wrapped bundle with a head, outstretched arms and a team-dyed sash.
function sparringRing(ctx, x, z) {
  const { b, t } = ctx;
  b.cyl(0.68, 0.02, SAND, x, 0.05, z);
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    b.rock(0.075, i % 2 ? C.stone : C.stoneD, x + Math.cos(angle) * 0.76, 0.04, z + Math.sin(angle) * 0.76, 1.25, 0.75, 1, angle);
  }
  b.cyl(0.045, 0.98, C.woodD, x, 0.05, z).cylT(0.11, 0.14, 0.4, P.hide, x, 0.3, z, 8).cylT(0.12, 0.15, 0.08, t, x, 0.5, z, 8);
  for (const y of [0.34, 0.66]) b.cylT(0.115, 0.115, 0.025, P.hideD, x, y, z, 8);
  b.sph(0.1, P.hide, x, 0.92, z);
  stick(b, 0.03, C.wood, [x - 0.32, 0.74, z], [x + 0.32, 0.74, z]);
  for (const k of [-1, 1]) b.sph(0.045, P.hideD, x + k * 0.32, 0.74, z);
}
// Spear rack along x = rackX: two forked posts and a bar, flint-tipped spears and clubs leaning on it.
function spearRack(b, rackX) {
  for (const z of [0.0, 0.82]) {
    b.cyl(0.035, 0.58, C.woodD, rackX, 0.05, z);
    for (const k of [-1, 1]) stick(b, 0.018, C.woodD, [rackX, 0.6, z], [rackX, 0.7, z + k * 0.06]);
  }
  stick(b, 0.03, C.wood, [rackX, 0.62, -0.06], [rackX, 0.62, 0.88]);
  for (let i = 0; i < 5; i++) {
    const z = 0.1 + i * 0.15, butt = [rackX + 0.2, 0.05, z + 0.02], head = [rackX - 0.08, 1.02, z - 0.02];
    stick(b, 0.016, C.wood, butt, head);
    stick(b, 0.035, C.stoneD, head, lerp(butt, head, 1.14), POINT);
  }
  for (const z of [0.2, 0.62]) stick(b, 0.05, C.woodD, [rackX + 0.2, 0.05, z], [rackX + 0.03, 0.56, z + 0.04], CLUB);
}
// Shield rack at the back (z = rackZ): a log on two posts with three painted hide shields facing the yard.
function shieldRack(ctx, rackZ) {
  const { b, t } = ctx;
  for (const x of [0.36, 1.18]) b.cyl(0.035, 0.6, C.woodD, x, 0.05, rackZ);
  stick(b, 0.035, C.wood, [0.3, 0.58, rackZ], [1.24, 0.58, rackZ]);
  for (const x of [0.5, 0.77, 1.04]) {
    b.add(unit.cyl, P.hide, x, 0.4, rackZ + 0.05, 0.14, 0.03, 0.14, Math.PI / 2, 0, 0);
    b.add(unit.cyl, t, x, 0.4, rackZ + 0.07, 0.1, 0.02, 0.1, Math.PI / 2, 0, 0).sph(0.03, P.bone, x, 0.4, rackZ + 0.09);
  }
}
// Barracks: a sparring ground ringed with stones round a hide-wrapped training post, a spear rack and a shield rack
// with painted hide shields, and a hide lean-to for the war band, whose flag flies from the lean-to's ridge post.
export function barracks(ctx) {
  const { b } = ctx;
  b.cyl(1.34, 0.05, P.dirt);
  sparringRing(ctx, 0.36, 0.4);
  // The lean-to: tall forked posts at the back, short ones at the front, hides lashed between them.
  const xs = [-1.12, -0.12], backZ = -1.08, frontZ = -0.38, backY = 1.16, frontY = 0.56;
  for (const x of xs) {
    b.cyl(0.045, backY - 0.05, C.woodD, x, 0.05, backZ).cyl(0.04, frontY - 0.05, C.woodD, x, 0.05, frontZ);
    for (const k of [-1, 1]) stick(b, 0.02, C.woodD, [x, backY - 0.02, backZ], [x + k * 0.07, backY + 0.12, backZ]);
    stick(b, 0.03, C.wood, [x, frontY - 0.03, frontZ], [x, backY - 0.03, backZ]);
  }
  stick(b, 0.05, C.wood, [xs[0] - 0.12, backY, backZ], [xs[1] + 0.12, backY, backZ]);
  stick(b, 0.045, C.wood, [xs[0] - 0.1, frontY, frontZ], [xs[1] + 0.1, frontY, frontZ]);
  hideRoof(b, xs[0] - 0.08, xs[1] + 0.08, [backY, backZ], [frontY, frontZ], [P.hide, P.hideD, HIDE_L, P.hide]);
  // Furs and a log seat in the shelter.
  b.box(0.62, 0.06, 0.36, P.hideD, -0.62, 0.05, -0.82).box(0.36, 0.05, 0.28, P.hide, -0.76, 0.11, -0.8, 0, 0.3);
  stick(b, 0.06, C.wood, [-0.95, 0.11, -0.5], [-0.3, 0.11, -0.5]);
  spearRack(b, -1.02);
  shieldRack(ctx, -0.92);
  firePit(ctx, -0.52, 0.98);
  flag(ctx, xs[1], backY + 0.02, backZ, 0.72, C.woodD, [0.3, 0.52]);
  return 1.35;
}
