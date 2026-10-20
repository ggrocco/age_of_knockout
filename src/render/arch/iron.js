// Iron Age: Greek and Roman masonry, beside today's kept Town Center, House, Government Center and Wonder (legacy.js):
// plaster and ashlar under terracotta tile, marble columns and pediments with team-coloured tympana. A buttressed
// horreum, a storehouse with an amphora pit, olive and grain terraces, a palisaded camp of leather tents, a stone
// archery yard with marble targets, an arcaded stable and an agora round a market tholos; for defence, a stone tower
// with a ballista on its roof and an ashlar wall.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B, C, unit } from '../builder.js';
import { P, flag, firePit, stick, hash, place, horse, streak, WEDGE, CYL6, BALL, CONE4, ARCH, ARCH_RING, HORSE_HEAD, sack } from './kit.js';

// ---------- shared Iron parts ----------
const MARBLE = C.marble, MARBLE_D = 0xd9d1bf, PLASTER = 0xd7c7a4, ASHLAR = 0xbcad8d, ASHLAR_D = 0xa39579;
const TILE = 0xa96342, TILE_L = 0xb7714e, TILE_D = 0x8a4c34, CLAY = 0xb5693f, PAVING = 0xbfb193, SAND = 0xd2bf8e;
const EARTH = 0x7a6346, SOIL = 0x6b5232, WALLSTONE = 0x9a8f78, OLIVE = 0x7d8c63, OLIVE_D = 0x5f6d4a, OLIVE_L = 0x9aa582, BARK = 0x5e4e3c;
const WATER = 0x3f7fa3;
// AMPHORA: a terracotta amphora 0.61 tall with two handles, foot at the origin.
const AMPHORA = (() => {
  const prof = [[0, 0], [0.03, 0.05], [0.08, 0.18], [0.1, 0.33], [0.08, 0.45], [0.035, 0.51], [0.035, 0.58], [0.05, 0.61], [0, 0.61]];
  const body = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 6).toNonIndexed();
  const handles = [-1, 1].map(k => new THREE.BoxGeometry(0.022, 0.15, 0.03).rotateZ(k * 0.45).translate(k * 0.065, 0.5, 0).toNonIndexed());
  for (const g of [body, ...handles]) { g.deleteAttribute('uv'); g.deleteAttribute('normal'); }
  const m = mergeGeometries([body, ...handles]); m.computeVertexNormals(); return m;
})();

// A marble column hh tall standing on y: a square base, an eight-sided tapering shaft and a square capital.
const column = (b, x, y, z, hh, r = 0.065) => {
  b.box(r * 2.7, 0.05, r * 2.7, MARBLE_D, x, y, z).cylT(r * 0.82, r, hh - 0.09, MARBLE, x, y + 0.05, z, 8).box(r * 2.9, 0.04, r * 2.9, MARBLE_D, x, y + hh - 0.04, z);
};
// A terracotta gable roof (tiled by B.roof) w wide, hh high and d long, standing on y, its ridge along z (or along x,
// with alongX), with a ridge cap and marble pediments closing both gable ends, each with a team-coloured tympanum.
// The pediments stand d / 2 + 0.045 out from the centre.
const gable = (b, t, w, hh, d, x, y, z, alongX = false) => {
  const ry = alongX ? Math.PI / 2 : 0, at = o => alongX ? [x + o, z] : [x, z + o];
  b.roof(w, hh, d, TILE, x, y, z, ry).box(0.07, 0.05, d + 0.04, TILE_D, x, y + hh - 0.015, z, 0, ry);
  for (const k of [-1, 1]) {
    const [px, pz] = at(k * (d / 2 + 0.01)), [tx, tz] = at(k * (d / 2 + 0.039));
    b.roof(w + 0.08, hh + 0.07, 0.05, MARBLE, px, y - 0.02, pz, ry).roof(w * 0.66, hh * 0.58, 0.012, t, tx, y + 0.05, tz, ry);
  }
};
// A single-pitch terracotta roof built at the origin for place(): `width` along x, sloping from its high back edge
// (z = -run / 2, y = rise) to its low front edge (z = run / 2, y = 0), with tile courses across it and cover-tile ridges
// down it.
const leanTo = (width, run, rise) => {
  // at(f, off): [y, z] of the point a fraction f (-0.5 back .. 0.5 front) down the slope, raised off along its normal.
  const r = new B(), a = Math.atan2(rise, run), L = Math.hypot(run, rise) + 0.08;
  const at = (f, off) => [rise / 2 - f * rise + off * Math.cos(a), f * run + off * Math.sin(a)];
  r.box(width, 0.04, L, TILE, 0, rise / 2 - 0.02, 0, a);
  for (let i = 0; i < 4; i++) { const [y, z] = at((i + 0.5) / 4 - 0.5, 0.025); r.box(width + 0.01, 0.025, L / 4 - 0.015, i % 2 ? TILE : TILE_L, 0, y - 0.0125, z, a); }
  for (let x = -width / 2 + 0.08; x < width / 2 - 0.03; x += 0.2) { const [y, z] = at(0, 0.045); r.box(0.04, 0.04, L, TILE_D, x, y - 0.02, z, a); }
  return r;
};
// An arched opening drawn on a wall face at z (facing +z): a dark doorway aw wide, springing at y + spring, under a
// marble arch ring.
const archway = (b, x, y, z, aw, spring, c = C.dark) => {
  const r = aw / 2;
  b.box(aw, spring, 0.02, c, x, y, z).add(ARCH, c, x, y + spring, z + 0.011, r, r, 1).add(ARCH_RING, MARBLE_D, x, y + spring, z + 0.012, r + 0.03, r + 0.03, 0.25);
};
// A terracotta amphora standing on y (k scales it), its stopper sealed with `seal`; tipped by rx/rz it lies unsealed.
const amphora = (b, x, y, z, k = 1, seal = null, rx = 0, rz = 0) => {
  b.add(AMPHORA, CLAY, x, y, z, k, k, k, rx, 0, rz);
  if (seal && !rx && !rz) b.add(CYL6, seal, x, y + 0.6 * k, z, 0.045 * k, 0.04 * k, 0.045 * k);
};
// A Roman scutum built at the origin for place(), facing +z: a team-painted face edged dark, a gold spine and a
// bronze boss.
const scutum = t => new B().box(0.22, 0.32, 0.02, C.woodD, 0, 0, 0).box(0.19, 0.29, 0.02, t, 0, 0.015, 0.012).box(0.03, 0.29, 0.024, C.gold, 0, 0.015, 0.016)
  .add(BALL, C.bronze, 0, 0.16, 0.03, 0.045, 0.045, 0.03);

// Granary: a Roman horreum. A long plastered hall raised on a podium against damp and rats, its walls buttressed with
// ventilation slits between the buttresses; a portico of four marble columns at the +x end over the loading doors and
// steps, a team frieze all round under a tiled roof with marble pediments, the flag on its ridge; a grain cart, sacks
// and a heap of grain before it.
export function granary(ctx) {
  const { b, s, h, t } = ctx, x0 = -h + 0.05, x1 = 0.22, px = 0.6, W = 0.98, py = 0.22, wh = 0.8, mid = (x0 + px + 0.08) / 2, L = px + 0.08 - x0;
  b.box(s, 0.03, s, PAVING);
  // The podium with vents along its sides, and steps up to the portico.
  b.box(L + 0.04, py - 0.03, W + 0.14, ASHLAR_D, mid, 0.03, 0);
  for (let i = 0; i < 3; i++) b.box(0.18 - 0.06 * i, 0.065 * (i + 1), 0.62, ASHLAR, px + 0.1 + (0.18 - 0.06 * i) / 2, 0.03, 0);
  // The hall, buttresses on its long walls and slits between them.
  b.box(x1 - x0, wh, W, PLASTER, (x0 + x1) / 2, py, 0);
  for (const k of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = x0 + 0.08 + i * 0.3;
    b.box(0.1, wh - 0.04, 0.08, ASHLAR, x, py, k * (W / 2 + 0.04)).box(0.12, 0.05, 0.1, ASHLAR_D, x, py + wh - 0.06, k * (W / 2 + 0.04));
    if (i < 3) b.box(0.05, 0.2, 0.02, C.dark, x + 0.15, py + 0.42, k * (W / 2 + 0.005)).box(0.11, 0.06, 0.02, C.dark, x + 0.15, 0.08, k * (W / 2 + 0.075));
  }
  // The portico: columns, the loading doors in the hall's end wall, sacks waiting on its floor.
  for (const z of [-0.36, -0.12, 0.12, 0.36]) column(b, px, py, z, wh);
  b.box(0.02, 0.56, 0.42, C.woodD, x1 + 0.01, py, 0).box(0.02, 0.56, 0.015, C.dark, x1 + 0.022, py, 0).box(0.04, 0.06, 0.52, MARBLE_D, x1 + 0.02, py + 0.56, 0);
  for (const [x, z] of [[0.34, -0.3], [0.4, -0.16], [0.36, 0.3]]) sack(b, x, py, z, 0.08);
  // The entablature: an architrave, the team frieze and a cornice right round the hall and portico.
  b.box(L, 0.05, W + 0.1, MARBLE_D, mid, py + wh, 0).box(L + 0.01, 0.07, W + 0.11, t, mid, py + wh + 0.05, 0).box(L + 0.03, 0.04, W + 0.13, MARBLE, mid, py + wh + 0.12, 0);
  gable(b, t, W + 0.12, 0.42, L - 0.04, mid, py + wh + 0.16, 0, true);
  flag(ctx, x0 + 0.12, py + wh + 0.55, 0, 0.5);
  // A grain cart loaded with sacks along the +z side, and a bronze modius of grain by the steps.
  const cx = -0.45, cz = 0.74;
  for (const k of [-1, 1]) b.add(unit.cyl, C.woodD, cx, 0.14, cz + k * 0.12, 0.11, 0.03, 0.11, Math.PI / 2, 0, 0);
  b.box(0.5, 0.05, 0.22, C.wood, cx, 0.17, cz).box(0.5, 0.08, 0.02, C.woodD, cx, 0.22, cz + 0.1).box(0.5, 0.08, 0.02, C.woodD, cx, 0.22, cz - 0.1);
  stick(b, 0.015, C.wood, [cx + 0.25, 0.19, cz - 0.05], [cx + 0.62, 0.05, cz - 0.05], CYL6); stick(b, 0.015, C.wood, [cx + 0.25, 0.19, cz + 0.05], [cx + 0.62, 0.05, cz + 0.05], CYL6);
  for (const [dx, dy] of [[-0.15, 0], [0, 0], [0.15, 0], [-0.07, 0.12], [0.08, 0.12]]) sack(b, cx + dx, 0.22 + dy, cz, 0.07);
  b.cylT(0.08, 0.065, 0.13, C.bronze, 0.76, 0.03, 0.7, 8).cone(0.075, 0.06, C.hay, 0.76, 0.16, 0.7, 8);
  sack(b, 0.6, 0.03, 0.8, 0.085); sack(b, 0.56, 0.03, 0.6, 0.08);
  b.cyl(0.19, 0.02, 0xb59a6a, 0.35, 0.03, 0.69).cone(0.16, 0.15, C.hay, 0.35, 0.05, 0.69, 8);
  return py + wh + 0.16 + 0.49;
}

// Storage Pit: an ashlar storehouse with two arched doorways under a tiled lean-to roof flying the team flag; before
// it a sand pit of amphorae stood upright (some sealed in team colour), amphorae laid in a stack beside it, logs half
// under a team cloth, cut marble blocks and a bronze-bound strongbox of gold.
export function storage_pit(ctx) {
  const { b, s, h, t } = ctx, x0 = -h + 0.03, x1 = 0.4, zb = -h + 0.03, zf = -0.2, wh = 0.68, cx = (x0 + x1) / 2, W = x1 - x0, D = zf - zb, cz = (zb + zf) / 2;
  b.box(s, 0.03, s, PAVING);
  // Ashlar courses, alternately set in, with marble quoins at the front corners.
  for (let i = 0; i < 4; i++) b.box(W - (i % 2) * 0.012, wh / 4, D - (i % 2) * 0.012, i % 2 ? ASHLAR_D : ASHLAR, cx, 0.03 + i * wh / 4, cz);
  for (let i = 0; i < 4; i++) for (const x of [x0 + 0.06, x1 - 0.06]) b.box(i % 2 ? 0.12 : 0.18, wh / 4 - 0.01, 0.03, MARBLE_D, x + (x < cx ? 1 : -1) * (i % 2 ? 0 : 0.03), 0.035 + i * wh / 4, zf + 0.006);
  for (const x of [-0.5, 0.06]) archway(b, x, 0.03, zf + 0.002, 0.32, 0.32);
  b.box(0.22, 0.08, 0.02, t, -0.22, 0.5, zf + 0.012);
  // The lean-to roof, high at the back, and its wedge-shaped gable walls.
  const rise = 0.22, top = 0.03 + wh;
  for (const x of [x0 + 0.03, x1 - 0.03]) b.add(WEDGE, ASHLAR, x, top, zb, 0.06, rise, D);
  place(b, leanTo(W + 0.04, D - 0.04, rise), cx, top + 0.02, cz);
  flag(ctx, x1 - 0.1, top + rise, zb + 0.1, 0.6);
  // The amphora pit: a kerbed bed of sand with amphorae stood in it.
  const ax = -0.48, az = 0.42;
  b.box(0.76, 0.05, 0.66, ASHLAR_D, ax, 0.03, az).box(0.68, 0.02, 0.58, SAND, ax, 0.06, az);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) amphora(b, ax - 0.22 + j * 0.22, -0.02, az - 0.2 + i * 0.2, 0.62 + hash(i, j) * 0.08, (i + j) % 2 ? null : t);
  // Amphorae laid in a stack beside the storehouse, logs half under a team cloth, marble blocks and the gold strongbox.
  for (let i = 0; i < 3; i++) amphora(b, 0.44, 0.1, -0.8 + i * 0.18, 0.68, null, 0, -Math.PI / 2);
  for (let i = 0; i < 2; i++) amphora(b, 0.46, 0.22, -0.71 + i * 0.18, 0.64, null, 0, -Math.PI / 2);
  for (const [i, [x, y]] of [[0.3, 0.1], [0.45, 0.1], [0.6, 0.1], [0.37, 0.22], [0.52, 0.22]].entries()) stick(b, 0.065, i % 2 ? C.woodD : C.wood, [x, y, 0.2], [x, y, 0.84], CYL6);
  for (const k of [-1, 1]) b.box(0.2, 0.015, 0.34, t, 0.45 + k * 0.088, 0.275, 0.64, 0, 0, -k * 0.5);
  for (const [x, z, ry] of [[-0.02, 0.2, 0.1], [0.0, 0.0, -0.2]]) b.box(0.2, 0.15, 0.16, MARBLE_D, x, 0.03, z, 0, ry);
  b.box(0.18, 0.13, 0.14, MARBLE, -0.01, 0.18, 0.1, 0, 0.3);
  b.box(0.24, 0.14, 0.16, C.wood, 0.66, 0.03, -0.06).box(0.26, 0.03, 0.18, C.bronze, 0.66, 0.17, -0.06).box(0.26, 0.14, 0.02, C.bronze, 0.66, 0.03, 0.02);
  for (const [x, z] of [[0.62, -0.1], [0.7, -0.04], [0.66, -0.14]]) b.cylT(0.03, 0.03, 0.02, C.gold, x, 0.2, z, 6);
  return top + rise + 0.09;
}

// Farm: olive and grain terraces climbing to the back on dry-stone walls, with a stone stair up the right side; olive
// trees on the upper terraces with baskets of olives, a field hut with a tiled roof flying the team flag and oil
// amphorae sealed in team colour, and wheat on the bottom terrace. The wheat is extra.crops (animate() shows it once the
// farm is finished and shrinks it as the food runs out); it stays on the ground terrace, since shrinking scales it
// towards y = 0.
export function farm(ctx) {
  const { b, s, h, t, extra } = ctx, terraces = [[0.08, -0.38, 0.23], [-0.38, -h + 0.01, 0.43]];
  b.box(s, 0.03, s, EARTH).box(s - 0.08, 0.012, 0.74, SOIL, 0, 0.03, 0.47);
  // The terraces: dry-stone walls, capstones and an earth top; darker and lighter stones picked out on the faces.
  for (const [i, [zf, zb, top]] of terraces.entries()) {
    const d = zf - zb, cz = (zf + zb) / 2, foot = i ? terraces[0][2] : 0.03;
    b.box(s - 0.02, top - 0.03, d, WALLSTONE, 0, 0.03, cz).box(s - 0.04, 0.015, d - 0.06, SOIL, 0, top, cz - 0.02).box(s - 0.02, 0.03, 0.07, 0xb3a487, 0, top - 0.02, zf - 0.03);
    for (let j = 0; j < 9; j++) for (let r = 0; r < 2; r++) {
      const x = -h + 0.12 + j * 0.19 + r * 0.09, w = 0.13 + hash(r, j) * 0.05;
      if (hash(j + 4 * i, r) < 0.45 || x + w / 2 > h - 0.02) continue;
      b.box(w, 0.06, 0.02, hash(j, r + i) < 0.7 ? 0x857a64 : 0xada28a, x, foot + 0.03 + r * (top - foot) * 0.45, zf + 0.002);
    }
  }
  // The stair up the right-hand side.
  for (let i = 0; i < 3; i++) b.box(0.22, 0.07 * (i + 1) + 0.03, 0.09, 0xb3a487, 0.7, 0.0, 0.08 + 0.27 - i * 0.09);
  for (let i = 0; i < 3; i++) b.box(0.22, 0.23 + 0.067 * (i + 1) - 0.03, 0.08, 0xb3a487, 0.7, 0.0, -0.38 + 0.24 - i * 0.08);
  // Olive trees: a gnarled, forking trunk under flat clumps of grey-green and silvery leaves.
  const olive = (x, y, z, k) => {
    const p = [x, y, z], q = [x + 0.04 * k, y + 0.2 * k, z - 0.02], l = [x - 0.1 * k, y + 0.36 * k, z + 0.03], r = [x + 0.13 * k, y + 0.34 * k, z - 0.04];
    stick(b, 0.045 * k, BARK, p, q, CYL6); stick(b, 0.03 * k, BARK, q, l, CYL6); stick(b, 0.028 * k, BARK, q, r, CYL6);
    for (const [dx, dy, dz, rr, c] of [[-0.1, 0.4, 0.02, 0.14, OLIVE], [0.13, 0.38, -0.04, 0.13, OLIVE_D], [0.02, 0.46, -0.02, 0.13, OLIVE_L], [-0.02, 0.36, 0.12, 0.1, OLIVE_D], [0.08, 0.34, 0.1, 0.09, OLIVE]]) {
      b.rock(rr * k, c, x + dx * k, y + dy * k - rr * k * 0.35, z + dz * k, 1.25, 0.6, 1.25, dx * 9 + dz * 5);
    }
  };
  for (const [x, z] of [[-0.55, -0.16], [0.08, -0.17]]) {
    olive(x, 0.23, z, 1);
    b.cylT(0.06, 0.045, 0.06, P.wattle, x + 0.18, 0.245, z + 0.12, 6).add(BALL, 0x3a3a2a, x + 0.18, 0.3, z + 0.12, 0.05, 0.02, 0.05);
  }
  olive(-0.3, 0.43, -0.64, 1.05); olive(0.22, 0.43, -0.68, 1.0);
  // The field hut on the top terrace, the flag on its roof, oil amphorae beside it.
  const hx = 0.66, hz = -0.66;
  b.box(0.3, 0.26, 0.3, PLASTER, hx, 0.44, hz).box(0.12, 0.18, 0.02, C.dark, hx - 0.04, 0.44, hz + 0.15).roof(0.4, 0.16, 0.38, TILE, hx, 0.7, hz);
  flag(ctx, hx + 0.1, 0.78, hz - 0.1, 0.42, C.woodD, [0.18, 0.32]);
  for (const [x, z] of [[0.38, -0.5], [0.46, -0.44]]) amphora(b, x, 0.445, z, 0.5, t);
  // Wheat on the ground terrace: rows of tufts with ears, ripening from green to gold; none on the stair.
  const cr = new B();
  for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) {
    const x = -0.78 + c * 0.156 + (hash(r, c) - 0.5) * 0.03, z = 0.17 + r * 0.155;
    if (x > 0.56 && z < 0.4) continue;
    const hh = 0.2 + hash(c + 7, r) * 0.07, lean = (hash(r * 3, c + 1) - 0.5) * 0.3, ripe = (r + (c >> 2)) % 3, sn = Math.sin(lean), cs = Math.cos(lean);
    const stem = [0x8fa040, 0xb8a848, 0xc9a84a][ripe], ear = [0xb8c060, 0xdcc060, 0xe2b84a][ripe];
    cr.add(CONE4, stem, x, 0.04 + hh / 2, z, 0.045, hh, 0.045, lean, 0, -lean);
    cr.add(CONE4, stem, x + 0.025, 0.04 + hh * 0.3, z - 0.015, 0.035, hh * 0.6, 0.035, -0.4, 0, -0.5);
    cr.add(CONE4, ear, x + sn * hh * 0.55, 0.04 + hh / 2 + cs * cs * hh * 0.55, z + sn * cs * hh * 0.55, 0.026, 0.1, 0.026, lean, 0, -lean);
  }
  extra.crops = cr.geometry();
  return 1.0;
}

// A Roman standard planted on y, into the mast: a pole topped with a gold eagle (aquila), silver discs (signum) or a
// team-coloured vexillum hung from a crossbar.
const standard = (ctx, x, y, z, kind) => {
  const { mast: m, t } = ctx, H = 1.25;
  m.cyl(0.018, H, C.woodD, x, y, z).cone(0.03, 0.08, C.iron, x, y + H, z, 4);
  if (kind === 'aquila') {
    m.box(0.12, 0.08, 0.1, C.gold, x, y + H - 0.04, z).add(BALL, C.gold, x, y + H + 0.08, z + 0.02, 0.05, 0.05, 0.05);
    for (const k of [-1, 1]) m.box(0.16, 0.05, 0.02, C.gold, x + k * 0.09, y + H + 0.06, z, 0, 0, k * 0.5);
    m.add(unit.tor, C.gold, x, y + H - 0.18, z, 0.07, 0.07, 0.07, 0, 0, Math.PI);
  } else if (kind === 'signum') {
    for (let i = 0; i < 4; i++) m.add(unit.cyl, C.iron, x, y + H - 0.2 - i * 0.14, z + 0.025, 0.055, 0.015, 0.055, Math.PI / 2, 0, 0);
    m.box(0.16, 0.02, 0.02, C.gold, x, y + H - 0.08, z).box(0.03, 0.14, 0.012, t, x - 0.07, y + H - 0.22, z).box(0.03, 0.14, 0.012, t, x + 0.07, y + H - 0.22, z);
  } else {
    m.box(0.32, 0.025, 0.025, C.gold, x, y + H - 0.1, z).box(0.28, 0.32, 0.012, t, x, y + H - 0.42, z + 0.015).box(0.28, 0.03, 0.014, C.gold, x, y + H - 0.45, z + 0.015);
  }
};
// A leather contubernium tent: low walls under a ridge, its door flap on the +z gable (on +x with ry = PI / 2).
const tent = (b, x, z, w, d, hh, ry = 0, c = P.hide, flap = P.hideD, y = 0.06) => {
  const ox = Math.sin(ry) * (d / 2 + 0.013), oz = Math.cos(ry) * (d / 2 + 0.013);
  b.box(w, 0.08, d, c, x, y, z, 0, ry).roof(w + 0.06, hh, d + 0.02, c, x, y + 0.08, z, ry).roof(w * 0.42, hh * 0.8 + 0.08, 0.01, flap, x + ox, y, z + oz, ry);
};
// A run of palisade stakes along the rampart from p to q, standing on y: pointed, alternately shaded, a little uneven.
const palisade = (b, [x1, z1], [x2, z2], y, hh) => {
  const L = Math.hypot(x2 - x1, z2 - z1), n = Math.round(L / 0.1), ry = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, x = x1 + (x2 - x1) * f, z = z1 + (z2 - z1) * f, lh = hh - hash(i, n) * 0.06, c = i % 2 ? C.wood : 0x8a6238;
    b.box(0.085, lh, 0.085, c, x, y, z, 0, ry).add(CONE4, c, x, y + lh + 0.05, z, 0.06, 0.1, 0.06, 0, ry + Math.PI / 4, 0);
  }
};
// Barracks: a Roman camp. An earth rampart topped by a palisade of stakes squares the camp, entered through a gate
// between two timber towers (team shields on their parapets, the flag on one); inside, the road from the gate to the
// commander's linen tent with its team valance, the legion's standards planted before it, rows of leather tents, a
// rack of pila and shields and a cooking fire.
export function barracks(ctx) {
  const { b, s, h, t } = ctx, e = h - 0.15, gw = 0.27, y = 0.18;
  b.box(s, 0.06, s, 0x9c8a66);
  // The roads: from the gate to the commander's tent, and across the camp in front of it.
  b.box(0.42, 0.012, 1.72, SAND, 0, 0.06, 0.36).box(2.3, 0.012, 0.34, SAND, 0, 0.06, -0.3);
  // The rampart, and the palisade along it, broken at the gate.
  for (const k of [-1, 1]) b.box(0.28, 0.12, s - 0.04, EARTH, k * e, 0.06, 0).box(s - 0.6, 0.12, 0.28, EARTH, 0, 0.06, k * e);
  palisade(b, [-e, -e], [e, -e], y, 0.36); palisade(b, [-e, -e + 0.1], [-e, e], y, 0.36); palisade(b, [e, -e + 0.1], [e, e], y, 0.36);
  for (const k of [-1, 1]) palisade(b, [k * (e - 0.1), e], [k * (gw + 0.32), e], y, 0.36);
  // The gate towers: four posts, a platform and a parapet hung with a team shield, a walkway over the gate.
  const gz = e - 0.05;
  for (const k of [-1, 1]) {
    const tx = k * (gw + 0.16);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.05, 0.98, 0.05, C.woodD, tx + dx * 0.14, 0.06, gz + dz * 0.12);
    b.box(0.36, 0.04, 0.32, C.wood, tx, 0.72, gz);
    for (const [dx, dz, w, d] of [[0, 0.15, 0.36, 0.03], [0, -0.15, 0.36, 0.03], [0.17, 0, 0.03, 0.3], [-0.17, 0, 0.03, 0.3]]) b.box(w, 0.2, d, C.wood, tx + dx, 0.76, gz + dz);
    place(b, scutum(t), tx, 0.7, gz + 0.155, 0, 0.9);
  }
  b.box(gw * 2 + 0.08, 0.05, 0.22, C.woodD, 0, 0.7, gz).box(gw * 2 + 0.08, 0.12, 0.03, C.wood, 0, 0.75, gz + 0.1);
  for (const k of [-1, 1]) b.box(0.03, 0.5, 0.24, C.woodD, k * (gw - 0.08), 0.06, gz - 0.14, 0, -k * 0.5);
  flag(ctx, -(gw + 0.16) - 0.12, 0.96, gz - 0.1, 0.55, C.woodD, [0.26, 0.46]);
  // The commander's tent, linen with a team valance, and the standards before it.
  b.box(0.86, 0.32, 0.6, P.plaster, 0, 0.06, -0.8).box(0.88, 0.07, 0.62, t, 0, 0.32, -0.8).roof(0.94, 0.36, 0.62, P.plaster, 0, 0.38, -0.8).roof(0.3, 0.3, 0.01, t, 0, 0.06, -0.49);
  b.box(0.08, 0.06, 0.08, ASHLAR, -0.28, 0.06, -0.38).box(0.08, 0.06, 0.08, ASHLAR, 0, 0.06, -0.38).box(0.08, 0.06, 0.08, ASHLAR, 0.28, 0.06, -0.38);
  standard(ctx, -0.28, 0.12, -0.38, 'signum'); standard(ctx, 0, 0.12, -0.38, 'aquila'); standard(ctx, 0.28, 0.12, -0.38, 'vexillum');
  // The tents: two blocks of four either side of the road, one more each side of the commander's tent.
  for (const k of [-1, 1]) {
    for (const [x, z] of [[0.46, 0.14], [0.86, 0.14], [0.46, 0.72], [0.86, 0.72]]) tent(b, k * x, z, 0.36, 0.48, 0.32);
    tent(b, k * 0.84, -0.82, 0.4, 0.5, 0.34);
  }
  // A rack of pila and two shields by the left of the gate, and a cooking fire with its pot among the right-hand tents.
  const rx = -0.66, rz = 1.0;
  for (const dx of [-0.2, 0.2]) b.box(0.04, 0.4, 0.04, C.woodD, rx + dx, 0.06, rz);
  b.box(0.44, 0.03, 0.04, C.wood, rx, 0.42, rz);
  for (let i = 0; i < 5; i++) { const x = rx - 0.16 + i * 0.08; stick(b, 0.01, C.wood, [x, 0.06, rz + 0.12], [x - 0.02, 0.8, rz - 0.02], CYL6); stick(b, 0.012, C.iron, [x - 0.02, 0.8, rz - 0.02], [x - 0.022, 0.9, rz - 0.04], CONE4); }
  place(b, scutum(t), rx - 0.1, 0.07, rz + 0.12, 0, 0.85); place(b, scutum(t), rx + 0.14, 0.07, rz + 0.13, -0.2, 0.85);
  const fx = 0.66, fz = 0.43;
  firePit(ctx, fx, fz);
  b.cylT(0.06, 0.05, 0.07, C.iron, fx, 0.2, fz, 8);
  for (const k of [-1, 1]) stick(b, 0.01, C.woodD, [fx + k * 0.12, 0.06, fz], [fx, 0.32, fz], CYL6);
  return 1.04;
}

// Archery Range: a stone archery yard. Sand lanes between marble kerbs run to three marble targets painted with team
// rings on marble pedestals, before an ashlar butt wall with marble pilasters and coping; the archers shoot from a
// stoa of marble columns under a tiled lean-to roof, with a bow rack, quivers and the team flag.
export function archery_range(ctx) {
  const { b, s, h, t } = ctx, bz = -h + 0.14;
  b.box(s, 0.06, s, PAVING).box(2.4, 0.012, 1.86, SAND, 0, 0.06, -0.24);
  // The butt wall: ashlar courses, a marble coping, pilasters on its face.
  for (let i = 0; i < 3; i++) b.box(s - 0.02 - (i % 2) * 0.012, 0.3, 0.26, i % 2 ? 0x938670 : ASHLAR_D, 0, 0.06 + i * 0.3, bz);
  b.box(s, 0.06, 0.3, MARBLE, 0, 0.96, bz);
  for (const x of [-1.2, -0.42, 0.42, 1.2]) b.box(0.12, 0.9, 0.04, MARBLE_D, x, 0.06, bz + 0.14);
  // Low side walls along the yard.
  for (const k of [-1, 1]) b.box(0.18, 0.36, 1.86, ASHLAR_D, k * (h - 0.1), 0.06, -0.24).box(0.2, 0.04, 1.88, MARBLE_D, k * (h - 0.1), 0.42, -0.24);
  // Lane kerbs, distance stones and the shooting line.
  for (const x of [-0.43, 0.43]) b.box(0.05, 0.04, 1.7, MARBLE_D, x, 0.06, -0.3);
  for (const x of [-0.43, 0.43]) for (const z of [-0.3, 0.3]) b.box(0.08, 0.14, 0.08, MARBLE, x, 0.06, z);
  b.box(2.36, 0.03, 0.06, MARBLE, 0, 0.06, 0.66);
  // The targets: marble discs on pedestals, painted with team and dark rings round a gold mark, arrows in them.
  for (const [i, x] of [-0.86, 0, 0.86].entries()) {
    const z = -0.92, y = 0.64;
    b.box(0.3, 0.06, 0.22, MARBLE_D, x, 0.06, z).box(0.2, 0.34, 0.14, MARBLE, x, 0.12, z).box(0.26, 0.04, 0.18, MARBLE_D, x, 0.42, z);
    b.add(unit.cyl, MARBLE, x, y, z, 0.25, 0.07, 0.25, Math.PI / 2, 0, 0).add(unit.cyl, t, x, y, z + 0.036, 0.19, 0.01, 0.19, Math.PI / 2, 0, 0)
      .add(unit.cyl, MARBLE, x, y, z + 0.04, 0.13, 0.01, 0.13, Math.PI / 2, 0, 0).add(unit.cyl, C.dark, x, y, z + 0.044, 0.075, 0.01, 0.075, Math.PI / 2, 0, 0)
      .add(unit.cyl, C.gold, x, y, z + 0.048, 0.035, 0.01, 0.035, Math.PI / 2, 0, 0);
    for (const [dx, dy] of [[0.06, 0.04], [-0.1, -0.07], [0.03, -0.13]].slice(0, 2 + (i % 2))) { const p = [x + dx, y + dy, z + 0.05]; stick(b, 0.008, C.wood, p, [p[0] + 0.02, p[1] + 0.03, p[2] + 0.3], CYL6); b.box(0.004, 0.035, 0.07, 0xf2efe6, p[0] + 0.02, p[1] + 0.01, p[2] + 0.27); }
  }
  // The stoa: a stylobate, two rows of marble columns, an architrave with a team frieze, a tiled lean-to roof.
  const x0 = -h + 0.04, x1 = 0.6, z0 = 0.8, z1 = h - 0.08, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ch = 0.82;
  b.box(x1 - x0, 0.08, z1 - z0 + 0.06, ASHLAR_D, cx, 0.06, cz);
  for (let i = 0; i < 4; i++) for (const z of [z0 + 0.06, z1 - 0.06]) column(b, x0 + 0.1 + i * (x1 - x0 - 0.2) / 3, 0.14, z, ch);
  for (const z of [z0 + 0.06, z1 - 0.06]) b.box(x1 - x0, 0.06, 0.12, MARBLE_D, cx, 0.14 + ch, z);
  b.box(x1 - x0 + 0.01, 0.07, 0.125, t, cx, 0.2 + ch, z1 - 0.06);
  for (const x of [x0 + 0.02, x1 - 0.02]) b.box(0.04, 0.07, z1 - z0, MARBLE_D, x, 0.2 + ch, cz);
  place(b, leanTo(x1 - x0 + 0.06, z1 - z0 + 0.06, 0.16), cx, 0.27 + ch, cz);
  flag(ctx, x1 - 0.06, 0.27 + ch + 0.08, z0 + 0.04, 0.55);
  // Under the stoa: a bow rack and quivers.
  stick(b, 0.018, C.woodD, [x0 + 0.25, 0.55, cz], [x0 + 1.05, 0.55, cz], CYL6);
  for (const dx of [0.35, 0.6, 0.85]) b.add(unit.tor, C.woodD, x0 + dx, 0.4, cz, 0.16, 0.16, 0.16, 0, 0, Math.PI / 2);
  for (const dx of [1.3, 1.5]) { b.cylT(0.055, 0.045, 0.22, C.leather, x0 + dx, 0.14, cz + 0.05, 6); for (const k of [-0.02, 0.02]) b.box(0.006, 0.1, 0.006, 0xf2efe6, x0 + dx + k, 0.36, cz + 0.05); }
  // At the front right: an arrow chest and a spare target.
  b.box(0.36, 0.2, 0.24, C.wood, 1.0, 0.06, 1.0).box(0.38, 0.03, 0.26, C.bronze, 1.0, 0.18, 1.0);
  b.add(unit.cyl, MARBLE, 1.05, 0.3, 0.62, 0.22, 0.06, 0.22, Math.PI / 2 - 0.35, 0, 0).add(unit.cyl, t, 1.05, 0.31, 0.65, 0.16, 0.01, 0.16, Math.PI / 2 - 0.35, 0, 0);
  return 0.27 + ch + 0.23;
}

// Stable: a stone stable block with an arcade of five arched stalls between marble pilasters, horses looking out over
// the half-doors, under a tiled roof with marble pediments, team tympana and the flag; a paved yard before it with a
// marble trough, a hay rick, a hitching rail hung with team blankets and two horses in team saddle cloths, behind a low
// wall.
export function stable(ctx) {
  const { b, s, h, t } = ctx, zb = -h + 0.1, zf = -0.45, wh = 0.92, D = zf - zb, cz = (zb + zf) / 2, W = s - 0.2;
  b.box(s, 0.06, s, PAVING);
  // The stable block in ashlar courses, a cornice with a team frieze.
  for (let i = 0; i < 3; i++) b.box(W - (i % 2) * 0.012, wh / 3, D - (i % 2) * 0.012, i % 2 ? ASHLAR_D : ASHLAR, 0, 0.06 + i * wh / 3, cz);
  b.box(W + 0.04, 0.05, D + 0.04, MARBLE_D, 0, 0.06 + wh, cz).box(W + 0.05, 0.07, D + 0.05, t, 0, 0.11 + wh, cz).box(W + 0.08, 0.04, D + 0.08, MARBLE, 0, 0.18 + wh, cz);
  // The stalls: arches between pilasters, half-doors, two horses looking out.
  const xs = [-1.04, -0.52, 0, 0.52, 1.04];
  for (const x of xs) archway(b, x, 0.06, zf + 0.002, 0.36, 0.5);
  for (const x of [-1.3, -0.78, -0.26, 0.26, 0.78, 1.3]) b.box(0.1, wh, 0.05, MARBLE_D, Math.max(-W / 2 + 0.05, Math.min(W / 2 - 0.05, x)), 0.06, zf + 0.02);
  for (const [i, x] of xs.entries()) b.box(0.34, 0.3, 0.03, i % 2 ? C.woodD : C.wood, x, 0.06, zf + 0.03).box(0.36, 0.03, 0.04, C.woodD, x, 0.36, zf + 0.03);
  for (const x of [-0.52, 0.52]) b.box(0.1, 0.18, 0.16, HORSE_HEAD, x, 0.38, zf + 0.06, -0.5).box(0.08, 0.08, 0.18, HORSE_HEAD, x, 0.5, zf + 0.14, 0.3).box(0.03, 0.05, 0.02, 0xf2efe6, x, 0.53, zf + 0.23);
  gable(b, t, D + 0.14, 0.48, W + 0.06 - 0.09, 0, 0.22 + wh, cz, true);
  flag(ctx, -W / 2 + 0.2, 0.22 + wh + 0.45, cz, 0.55);
  // The yard: a low wall at the front with a gateway between marble-capped piers.
  const fz = h - 0.08;
  for (const k of [-1, 1]) b.box(1.0, 0.3, 0.12, ASHLAR, k * 0.86, 0.06, fz).box(1.02, 0.04, 0.14, MARBLE_D, k * 0.86, 0.36, fz).box(0.16, 0.44, 0.16, ASHLAR_D, k * 0.34, 0.06, fz).add(BALL, MARBLE, k * 0.34, 0.56, fz, 0.07, 0.07, 0.07);
  // The marble trough along the right, a hay rick at the left.
  b.box(0.24, 0.2, 0.86, MARBLE_D, 1.08, 0.06, 0.3).box(0.18, 0.02, 0.8, WATER, 1.08, 0.24, 0.3);
  b.cylT(0.22, 0.25, 0.3, C.hay, -1.0, 0.06, 0.08, 10).cone(0.25, 0.24, C.thatch, -1.0, 0.36, 0.08, 10).cylT(0.2, 0.2, 0.04, C.thatchD, -1.0, 0.24, 0.08, 10);
  // The hitching rail with team blankets over it.
  for (const x of [-0.95, -0.35]) b.box(0.05, 0.42, 0.05, C.woodD, x, 0.06, 0.62);
  stick(b, 0.02, C.wood, [-1.0, 0.44, 0.62], [-0.3, 0.44, 0.62], CYL6);
  for (const x of [-0.8, -0.5]) b.box(0.2, 0.2, 0.012, t, x, 0.26, 0.64).box(0.2, 0.02, 0.05, t, x, 0.45, 0.62).box(0.2, 0.2, 0.012, t, x, 0.26, 0.6);
  place(b, horse(t), 0.3, 0.06, 0.25, 0.4);
  place(b, horse(t, true), 0.62, 0.06, 0.82, -Math.PI / 2 + 0.5);
  return 0.22 + wh + 0.55;
}

// Market: an agora. Stoas of marble columns under tiled lean-to roofs line the back and left, sheltering a row of
// shops with team-coloured awnings over their doors; in the square a market tholos (a ring of columns under a conical
// tiled roof, team band, fountain inside), traders' tables of amphorae, fruit and cloth under team awnings, and a
// marble measuring table.
export function market(ctx) {
  const { b, s, h, t } = ctx, e = h - 0.02, wh = 0.86, ch = 0.82;
  b.box(s, 0.06, s, PAVING).box(1.9, 0.012, 1.9, 0xcdc2a6, 0.32, 0.06, 0.32);
  // The back stoa: the shop wall, columns along the square, the architrave and roof.
  const bz = -e + 0.14, bz1 = -0.72;
  b.box(2 * e, wh, 0.28, PLASTER, 0, 0.06, bz).box(2 * e, 0.06, 0.3, ASHLAR_D, 0, 0.06 + wh, bz);
  b.box(2 * e, 0.06, bz1 - bz + 0.1, ASHLAR_D, 0, 0.06, (bz + bz1) / 2 + 0.03);
  for (const x of [-0.35, 0.3, 0.95]) b.box(0.3, 0.5, 0.02, C.dark, x, 0.12, bz + 0.145).box(0.36, 0.02, 0.16, t, x, 0.66, bz + 0.22, 0.35);
  for (let i = 0; i < 6; i++) column(b, -0.44 + i * 0.34, 0.12, bz1 + 0.04, ch);
  b.box(2 * e - 0.62, 0.07, 0.12, MARBLE_D, 0.31, 0.12 + ch, bz1 + 0.04);
  const r0 = -e + 0.05, r1 = bz1 + 0.1;
  place(b, leanTo(2 * e - 0.62, r1 - r0 - 0.08, 0.16), 0.31, 0.19 + ch, (r0 + r1) / 2);
  // The left stoa, the same along x = -e.
  const lx = -e + 0.14, lx1 = -0.72;
  b.box(0.28, wh, 2 * e, PLASTER, lx, 0.06, 0).box(0.3, 0.06, 2 * e, ASHLAR_D, lx, 0.06 + wh, 0);
  b.box(lx1 - lx + 0.1, 0.06, 2 * e - 0.62, ASHLAR_D, (lx + lx1) / 2 + 0.03, 0.06, 0.31);
  for (const z of [0.0, 0.65]) b.box(0.02, 0.5, 0.3, C.dark, lx + 0.145, 0.12, z).box(0.16, 0.02, 0.36, t, lx + 0.22, 0.66, z, 0, 0, -0.35);
  for (let i = 0; i < 4; i++) column(b, lx1 + 0.04, 0.12, -0.36 + i * 0.5, ch);
  b.box(0.12, 0.07, 2 * e - 0.62, MARBLE_D, lx1 + 0.04, 0.12 + ch, 0.31);
  const l1 = lx1 + 0.1;
  place(b, leanTo(2 * e - 0.62, l1 - r0 - 0.08, 0.16), (r0 + l1) / 2, 0.19 + ch, 0.31, Math.PI / 2);
  // The corner where the stoas meet.
  b.box(0.7, 0.07, 0.7, MARBLE_D, -e + 0.35, 0.12 + ch, -e + 0.35).box(0.72, 0.18, 0.72, TILE, -e + 0.36, 0.19 + ch, -e + 0.36);
  // The tholos: a stepped round base, six columns, an entablature with a team band, a conical tiled roof, a fountain.
  const tx = 0.42, tz = 0.4, R = 0.32;
  b.cylT(0.44, 0.47, 0.05, ASHLAR_D, tx, 0.06, tz, 12).cylT(0.4, 0.42, 0.05, ASHLAR, tx, 0.11, tz, 12);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; column(b, tx + Math.cos(a) * R, 0.16, tz + Math.sin(a) * R, 0.66, 0.055); }
  b.cylT(0.39, 0.39, 0.06, MARBLE_D, tx, 0.82, tz, 12).cylT(0.395, 0.395, 0.06, t, tx, 0.88, tz, 12).cylT(0.42, 0.42, 0.03, MARBLE, tx, 0.94, tz, 12);
  b.cone(0.46, 0.34, TILE, tx, 0.97, tz, 12).cylT(0.03, 0.05, 0.06, TILE_D, tx, 1.29, tz, 6);
  b.cylT(0.2, 0.22, 0.12, MARBLE_D, tx, 0.16, tz, 10).cylT(0.17, 0.17, 0.01, WATER, tx, 0.28, tz, 10).cylT(0.04, 0.05, 0.2, MARBLE, tx, 0.16, tz, 6);
  // Traders' tables under team awnings: amphorae, fruit, bolts of cloth.
  const stall = (x, z, ry, goods) => {
    for (const [dx, dz] of [[-0.24, -0.12], [0.24, -0.12], [-0.24, 0.12], [0.24, 0.12]]) b.box(0.03, 0.26, 0.03, C.woodD, x + dx * Math.cos(ry) + dz * Math.sin(ry), 0.06, z - dx * Math.sin(ry) + dz * Math.cos(ry));
    b.box(0.56, 0.03, 0.3, C.wood, x, 0.32, z, 0, ry);
    for (const [dx, dz] of [[-0.26, -0.16], [0.26, -0.16]]) b.cylT(0.012, 0.012, 0.66, C.woodD, x + dx * Math.cos(ry) + dz * Math.sin(ry), 0.06, z - dx * Math.sin(ry) + dz * Math.cos(ry), 5);
    b.box(0.6, 0.02, 0.36, t, x + 0.04 * Math.sin(ry), 0.7, z + 0.04 * Math.cos(ry), 0.25, ry);
    goods(x, z);
  };
  stall(-0.34, 0.78, 0, (x, z) => { for (const dx of [-0.16, 0, 0.16]) amphora(b, x + dx, 0.35, z, 0.42); });
  stall(0.98, -0.3, -Math.PI / 2, (x, z) => { for (const [i, c] of [0xd9a441, C.red, 0x6f8f3a, 0xd9a441].entries()) b.add(BALL, c, x, 0.4, z - 0.18 + i * 0.12, 0.06, 0.05, 0.06); });
  for (const [i, c] of [0x6b3a1e, 0xd9a441, 0x4f6b2a].entries()) b.add(CYL6, c, -0.05 + i * 0.11, 0.1, 1.15, 0.045, 0.24, 0.045, Math.PI / 2, 0, 0);
  // The measuring table: a marble block with round measures cut in it.
  b.box(0.42, 0.24, 0.2, MARBLE, -0.2, 0.06, -0.3);
  for (const [dx, r] of [[-0.12, 0.05], [0.02, 0.04], [0.13, 0.03]]) b.cylT(r, r, 0.01, C.dark, -0.2 + dx, 0.3, -0.3, 8);
  return 1.36;
}

// ---------- Iron defences ----------
// A ballista built at the origin for place(), shooting along +z from its trestle: the stock and slider, the torsion
// frame with its two sinew skeins (team-painted front plate, bronze washers), the arms swept back, the bowstring drawn
// to the trigger and a bolt laid in the groove. Returns its B and the bolt's tip.
const ballista = t => {
  const g = new B(), y = 0.3, fz = 0.22;
  for (const [x, z] of [[-0.14, -0.16], [0.14, -0.16], [-0.12, 0.12], [0.12, 0.12]]) stick(g, 0.018, C.woodD, [x, 0, z], [x * 0.3, y - 0.04, z * 0.4], CYL6);
  g.cylT(0.05, 0.06, 0.05, C.woodD, 0, y - 0.07, 0, 6);
  g.box(0.08, 0.05, 0.72, C.wood, 0, y - 0.025, -0.06, 0.06).box(0.03, 0.012, 0.66, C.woodD, 0, y + 0.02, -0.06, 0.06);
  g.box(0.44, 0.2, 0.08, C.woodD, 0, y - 0.06, fz).box(0.2, 0.12, 0.012, t, 0, y - 0.02, fz + 0.046);
  for (const k of [-1, 1]) {
    g.add(CYL6, P.hideD, k * 0.16, y + 0.04, fz, 0.04, 0.3, 0.04).add(CYL6, C.bronze, k * 0.16, y + 0.2, fz, 0.055, 0.03, 0.055).add(CYL6, C.bronze, k * 0.16, y - 0.12, fz, 0.055, 0.03, 0.055);
    stick(g, 0.016, C.wood, [k * 0.16, y + 0.04, fz], [k * 0.42, y + 0.04, fz - 0.16], CYL6);
    stick(g, 0.004, P.bone, [k * 0.42, y + 0.04, fz - 0.16], [0, y + 0.05, -0.3], CYL6);
  }
  stick(g, 0.012, C.wood, [0, y + 0.06, -0.3], [0, y + 0.06, 0.4], CYL6);
  stick(g, 0.02, C.iron, [0, y + 0.06, 0.4], [0, y + 0.06, 0.48], CONE4);
  return g;
};

// Tower: a stone tower with a ballista. A square Roman tower of ashlar courses on a podium, a marble string course
// halfway up, a team frieze under a marble cornice and a battlemented top with team shields on the merlons; an arched
// gate at its foot and arched windows above. On the roof a ballista on its trestle covers the approach, with a rack of
// bolts and the flag. Its shot is the bolt loosed from the ballista (extra.fire).
export function tower(ctx) {
  const { b, t, extra } = ctx, W = 1.3, y0 = 0.2, ch = 0.36, n = 5, top = y0 + n * ch, fz = W / 2;
  b.box(1.76, 0.06, 1.76, PAVING).box(1.56, 0.14, 1.56, ASHLAR_D, 0, 0.06, 0);
  for (let i = 0; i < n; i++) { const w = W - (i % 2) * 0.014; b.box(w, ch, w, i % 2 ? ASHLAR : ASHLAR_D, 0, y0 + i * ch, 0); }
  b.box(W + 0.05, 0.05, W + 0.05, MARBLE_D, 0, y0 + 2 * ch, 0);
  b.box(W + 0.03, 0.09, W + 0.03, t, 0, top - 0.11, 0).box(W + 0.1, 0.06, W + 0.1, MARBLE, 0, top - 0.02, 0);
  // The gate and the windows on the camera faces (the +x ones framed in marble).
  archway(b, 0, y0, fz + 0.002, 0.36, 0.34);
  for (const x of [-0.34, 0.34]) archway(b, x, y0 + 3 * ch + 0.06, fz + 0.002, 0.14, 0.16);
  for (const z of [-0.34, 0.34]) b.box(0.02, 0.22, 0.14, C.dark, fz + 0.001, y0 + 3 * ch + 0.06, z).box(0.03, 0.04, 0.2, MARBLE_D, fz + 0.005, y0 + 3 * ch + 0.28, z);
  b.box(0.02, 0.4, 0.3, C.dark, fz + 0.001, y0 + 0.02, 0.25).box(0.03, 0.05, 0.36, MARBLE_D, fz + 0.005, y0 + 0.42, 0.25);
  // The roof: paving inside the battlements, merlons all round, team shields on the camera faces.
  const ry = top + 0.04, M = W + 0.06;
  b.box(W - 0.06, 0.03, W - 0.06, PAVING, 0, ry, 0);
  for (let i = 0; i < 5; i++) {
    const u = -M / 2 + 0.09 + i * (M - 0.18) / 4;
    for (const [x, z, w, d] of [[u, M / 2 - 0.06, 0.18, 0.12], [u, -M / 2 + 0.06, 0.18, 0.12], [M / 2 - 0.06, u, 0.12, 0.18], [-M / 2 + 0.06, u, 0.12, 0.18]]) b.box(w, 0.26, d, ASHLAR, x, ry, z).box(w + 0.02, 0.03, d + 0.02, MARBLE_D, x, ry + 0.26, z);
  }
  b.box(M, 0.1, 0.1, ASHLAR_D, 0, ry, M / 2 - 0.06).box(M, 0.1, 0.1, ASHLAR_D, 0, ry, -M / 2 + 0.06).box(0.1, 0.1, M, ASHLAR_D, M / 2 - 0.06, ry, 0).box(0.1, 0.1, M, ASHLAR_D, -M / 2 + 0.06, ry, 0);
  for (const x of [-0.31, 0.31]) place(b, scutum(t), x, ry + 0.06, M / 2 + 0.002);
  place(b, scutum(t), M / 2 + 0.002, ry + 0.06, -0.31, Math.PI / 2);
  // The ballista and a rack of spare bolts.
  place(b, ballista(t), 0, ry + 0.03, 0.06);
  for (let i = 0; i < 4; i++) stick(b, 0.012, C.wood, [-0.42 + i * 0.05, ry + 0.03, -0.45], [-0.4 + i * 0.05, ry + 0.48, -0.5], CYL6);
  b.box(0.3, 0.04, 0.06, C.woodD, -0.34, ry + 0.3, -0.48);
  flag(ctx, 0.48, ry + 0.03, -0.48, 0.95);
  // The bolt in flight, just loosed from the slider.
  const fire = new B();
  streak(fire, [0, 0, 0], [0, -0.06, 0.9], 0.032, undefined, P.ember, 0.075);
  stick(fire, 0.05, P.ember, [0, -0.06, 0.88], [0, -0.065, 1.0], CONE4);
  extra.fire = { geo: fire.geometry(), at: [0, ry + 0.39, 0.6] };
  return ry + 0.55;
}

// Wall: an ashlar wall. Courses of dressed stone (each alternate course set back a hair, so the joints read) on a dark
// plinth, a team-painted frieze under a marble cornice and a paved walk behind a low breastwork with corner piers; it
// fills its tile edge to edge, so segments in a line close up into one wall.
export function wall(ctx) {
  const { b, t } = ctx, h0 = 0.1, ch = 0.2;
  b.box(1, h0, 1, ASHLAR_D);
  for (let i = 0; i < 3; i++) { const w = 1 - (i % 2) * 0.014; b.box(w, ch, w, i % 2 ? WALLSTONE : ASHLAR, 0, h0 + i * ch, 0); }
  const y = h0 + 3 * ch;
  b.box(1, 0.07, 1, t, 0, y, 0).box(1, 0.05, 1, MARBLE, 0, y + 0.07, 0);
  const py = y + 0.12;
  b.box(0.84, 0.02, 0.84, PAVING, 0, py, 0);
  for (const [x, z, w, d] of [[0, 0.45, 0.82, 0.1], [0, -0.45, 0.82, 0.1], [0.45, 0, 0.1, 0.82], [-0.45, 0, 0.1, 0.82]]) b.box(w, 0.14, d, ASHLAR, x, py, z);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.16, 0.22, 0.16, ASHLAR_D, x * 0.41, py, z * 0.41).box(0.18, 0.03, 0.18, MARBLE_D, x * 0.41, py + 0.22, z * 0.41);
  return py + 0.25;
}
