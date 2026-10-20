// Today's building models, moved verbatim from models.js: the kept designs (Tool, the Iron Town Center / House /
// Government Center / Wonder, the Medieval Castle, the Industrial Factory) and the fallback for eras without their own
// design yet. Their geometry is pinned by test/fixtures/kept-buildings.json, so don't edit it; new looks go in <era>.js.
import { styleOf } from '../styles.js';
import { B, C, unit, TEAM, TEAM_DARK } from '../builder.js';

export function legacyGeos(type, team, size, age) {
  const t = TEAM[team], td = TEAM_DARK[team], s = size - 0.22, h = s / 2, b = new B(), extra = {};
  const st = styleOf(age), ancient = st.key === 'timber' || st.key === 'masonry', flat = st.roofForm === 'flat', roofColor = st.roof, wallColor = st.wall;
  // A gable roof plus its ridge cap, or (flat-roofed eras) a slab with a low parapet over the same footprint.
  const roof = (w, hh, d, x, y, z, ry = 0, ridge) => {
    if (!flat) { b.roof(w, hh, d, roofColor, x, y, z, ry); if (ridge) ridge(); return; }
    const X = ry ? d : w, Z = ry ? w : d; b.box(X, 0.14, Z, roofColor, x, y, z);
    for (const k of [-1, 1]) b.box(X, 0.12, 0.07, st.trim, x, y + 0.14, z + k * Z / 2).box(0.07, 0.12, Z, st.trim, x + k * X / 2, y + 0.14, z);
  };
  // The era's signature detail on a building's main wall block: width X, depth Z, centre z0, wall top y (round: a tower of diameter X).
  const eraDetail = (X, Z, z0, top, round = false) => {
    const d = st.detail; if (!d) return;
    if (d === 'chimney') { const cx = round ? X * 0.3 : X / 2 - 0.3, cz = z0 - (round ? X : Z) / 4; b.box(0.24, 1.1, 0.24, 0x7a3a2a, cx, top, cz).box(0.3, 0.06, 0.3, C.stoneD, cx, top + 1.1, cz); return; }
    const ys = d === 'bands' ? [top * 0.5, top - 0.1] : d === 'window' ? [top * 0.55] : [top - 0.12], hh = d === 'window' ? 0.16 : 0.06;
    if (round) {
      if (d === 'crenel') for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; b.box(0.16, 0.16, 0.12, st.trim, Math.cos(a) * X / 2, top, z0 + Math.sin(a) * X / 2, 0, -a); }
      else for (const y of ys) b.cyl(X / 2 + 0.02, hh, st.trim, 0, y, z0);
      return;
    }
    const edges = [[0, -Z / 2, X, 0], [0, Z / 2, X, 0], [-X / 2, 0, Z, Math.PI / 2], [X / 2, 0, Z, Math.PI / 2]];
    for (const [ex, ez, len, ry] of edges) {
      if (d === 'crenel') for (let k = -len / 2 + 0.1; k <= len / 2 - 0.1; k += 0.3) b.box(0.16, 0.16, 0.12, st.trim, ry ? ex : k, top, z0 + (ry ? k : ez), 0, ry);
      else for (const y of ys) b.box(len + 0.02, hh, 0.04, st.trim, ex, y, z0 + ez, 0, ry);
    }
  };
  const door = (w, hh, z, x = 0) => { b.box(w, hh, 0.06, C.dark, x, 0.16, z).box(w + 0.1, 0.06, 0.08, C.woodD, x, 0.16 + hh, z); };
  const win = (x, y, z, ry = 0) => { b.box(0.22, 0.22, 0.05, C.glass, x, y, z, 0, ry).box(0.28, 0.04, 0.07, C.woodD, x, y + 0.22, z, 0, ry); };
  const found = (w, d) => {
    b.box(w + 0.12, 0.12, d + 0.12, 0x756852, 0, 0, 0);
    for (let x = -w / 2; x < w / 2; x += 0.32) for (const z of [-d / 2, d / 2]) {
      b.box(0.29, 0.09, 0.16, Math.round(x * 100) % 3 ? 0xa6977b : 0xb3a487, x + 0.12, 0.09, z);
    }
  };
  const posts = (w, d, hh, c = C.woodD) => { for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.1, hh, 0.1, c, x * w / 2, 0.16, z * d / 2); };
  const banner = (x, z, y0, hh) => { b.cyl(0.025, hh, C.woodD, x, y0, z).box(0.02, 0.32, 0.28, t, x, y0 + hh - 0.34, z + 0.15); };
  if (type === 'house') {
    found(s, s); b.box(s - 0.1, 0.72, s - 0.1, wallColor, 0, 0.16, 0); posts(s - 0.1, s - 0.1, 0.72); b.box(s - 0.06, 0.06, s - 0.06, C.woodD, 0, 0.5, 0);
    roof(s + 0.35, 0.75, s + 0.3, 0, 0.88, 0, 0, () => b.box(0.09, 0.07, s + 0.36, td, 0, 1.6, 0).box(0.03, 0.03, s + 0.3, C.thatchD, 0, 0.9, 0));
    door(0.3, 0.5, (s - 0.1) / 2 + 0.02, -0.25); win(0.35, 0.5, (s - 0.1) / 2 + 0.02); b.box(0.18, 0.55, 0.18, C.stoneD, 0.5, 1.0, -0.4);
    eraDetail(s - 0.1, s - 0.1, 0, 0.88);
  } else if (type === 'town_center') {
    // An ancient assembly hall: a broad roof, shaded porch and working courtyard.
    // Team identity lives on cloth and trim rather than an entirely blue/red roof.
    found(s, s);
    b.box(s - 0.3, 1.05, s * 0.66, wallColor, 0, 0.16, -s * 0.12);
    posts(s - 0.3, s * 0.66, 1.05);
    b.box(s - 0.18, 0.1, s * 0.69, C.woodD, 0, 1.12, -s * 0.12);
    roof(s + 0.25, 0.95, s * 0.88, 0, 1.23, -s * 0.12, 0, () => b.box(0.1, 0.1, s * 0.92, C.woodD, 0, 2.16, -s * 0.12));
    const front = s * 0.22;
    door(0.5, 0.83, front); win(-0.68, 0.58, front); win(0.68, 0.58, front);
    for (const x of [-s * 0.4, -s * 0.18, s * 0.18, s * 0.4]) {
      b.cylT(0.06, 0.09, 1.0, st.key === 'timber' ? C.woodD : st.key === 'masonry' ? C.marble : st.trim, x, 0.16, s * 0.45, 8);
      b.box(0.2, 0.08, 0.2, C.stone, x, 0.16, s * 0.45);
    }
    b.box(s * 0.92, 0.08, 0.11, C.woodD, 0, 1.16, s * 0.45);
    for (let i = 0; i < 9; i++) {
      b.box(s / 10, 0.035, s * 0.37, i % 3 === 0 ? t : C.cloth,
        -s * 0.4 + i * s / 10, 1.2, s * 0.35, 0.14);
    }
    for (let i = 0; i < 3; i++) b.box(0.9 + i * 0.14, 0.045, 0.17, C.stone, 0, 0.11 - i * 0.03, h + i * 0.13);
    // Terracotta storage jars and stacked timber beside the entrance.
    for (const [x, z] of [[-h + 0.18, h - 0.15], [-h + 0.48, h - 0.16]]) {
      b.sph(0.15, 0xa56843, x, 0.27, z, 1, 1.2, 1).cyl(0.065, 0.05, C.dark, x, 0.43, z);
    }
    for (let i = 0; i < 3; i++) b.cyl(0.055, 0.6, C.wood, h - 0.22, 0.16 + i * 0.08, 0.1, Math.PI / 2);
    if (st.key !== 'timber') {
      for (const x of [-h + 0.12, h - 0.12]) for (let row = 0; row < 5; row++) {
        b.box(0.2, 0.13, s * 0.69, ancient ? (row % 2 ? C.stone : 0xc9baa0) : (row % 2 ? st.trim : st.wall), x, 0.18 + row * 0.19, -s * 0.12);
      }
    }
    eraDetail(s - 0.3, s * 0.66, -s * 0.12, 1.21);
    b.cyl(0.025, flat ? 1.83 : 1.0, C.woodD, 0, flat ? 1.37 : 2.2, -0.4);
    extra.flag = new B().box(0.025, 0.3, 0.55, t, 0, 0, 0.27).geometry(); extra.flagAt = [0, 2.84, -0.4];
  } else if (type === 'granary') {
    b.cyl(s / 2 + 0.05, 0.16, C.stone).cyl(s / 2 - 0.08, 0.85, ancient ? C.plaster : st.wall, 0, 0.16, 0);
    if (flat) b.cyl(s / 2 + 0.1, 0.14, st.roof, 0, 1.0, 0); else b.cone(s / 2 + 0.2, 0.85, ancient ? C.thatch : st.roof, 0, 1.0, 0, 12);
    b.cyl(s / 2 - 0.06, 0.08, t, 0, 0.72, 0);
    door(0.3, 0.5, s / 2 - 0.08); for (const [x, z] of [[0.6, 0.7], [0.85, 0.5], [0.7, 0.4]]) b.cyl(0.12, 0.22, C.hay, x, 0.16, z).sph(0.09, C.hay, x, 0.4, z, 1, 0.6, 1);
    b.box(0.1, 0.2, 0.1, C.woodD, 0, flat ? 1.14 : 1.8, 0).cone(0.06, 0.12, t, 0, flat ? 1.19 : 1.85, 0, 6); eraDetail(s - 0.16, 0, 0, 1.01, true);
  } else if (type === 'storage_pit') {
    b.box(s, 0.1, s, C.woodD, 0, 0, 0).box(s - 0.3, 0.08, s - 0.3, C.dark, 0, 0.08, 0).box(0.1, 0.9, 0.1, C.wood, -0.7, 0.1, -0.7).box(0.1, 0.9, 0.1, C.wood, 0.7, 0.1, -0.7).box(0.1, 0.6, 0.1, C.wood, -0.7, 0.1, 0.7).box(0.1, 0.6, 0.1, C.wood, 0.7, 0.1, 0.7);
    b.box(s + 0.3, 0.07, s + 0.2, t, 0, 0.85, 0, 0.28).box(s + 0.3, 0.03, s + 0.2, ancient ? C.thatch : st.roof, 0, 0.9, 0, 0.28);
    for (const [x, z] of [[-0.3, 0.2], [0.1, 0.45], [0.4, -0.1]]) b.box(0.24, 0.22, 0.24, C.wood, x, 0.14, z).box(0.26, 0.03, 0.26, C.woodD, x, 0.36, z);
    b.cylT(0.13, 0.15, 0.3, C.woodD, -0.55, 0.14, 0.3).sph(0.16, C.stoneD, 0.5, 0.2, 0.4, 1, 0.5, 1).sph(0.14, C.gold, 0.15, 0.24, -0.35, 1, 0.5, 1);
  } else if (type === 'farm') {
    b.box(s, 0.05, s, 0x6b4a26, 0, 0, 0); for (let i = -2; i <= 2; i++) b.box(s * 0.9, 0.05, 0.11, 0x4a3018, 0, 0.05, i * 0.32);
    b.box(0.06, 0.6, 0.06, C.wood, s / 2 - 0.1, 0.05, -s / 2 + 0.1).box(0.34, 0.05, 0.05, C.wood, s / 2 - 0.1, 0.5, -s / 2 + 0.1).box(0.16, 0.2, 0.05, t, s / 2 - 0.1, 0.28, -s / 2 + 0.1);
    const cr = new B(); for (let i = -2; i <= 2; i++) for (let j = -3; j <= 3; j++) { cr.cone(0.06, 0.22, i % 2 ? 0x6fae2f : 0x8bc34a, j * 0.24, 0.09, i * 0.32, 5).sph(0.045, C.hay, j * 0.24, 0.32, i * 0.32); }
    extra.crops = cr.geometry();
  } else if (type === 'barracks') {
    found(s, s); b.box(s - 0.2, 0.95, s - 0.3, ancient ? 0xcbb890 : st.wall, 0, 0.16, 0); posts(s - 0.2, s - 0.3, 0.95); b.box(s - 0.16, 0.08, s - 0.26, C.woodD, 0, 0.66, 0);
    roof(s - 0.05, 0.85, s + 0.25, 0, 1.06, 0, Math.PI / 2, () => b.box(s + 0.28, 0.08, 0.09, td, 0, 1.9, 0)); eraDetail(s - 0.2, s - 0.3, 0, 1.11);
    door(0.5, 0.7, (s - 0.3) / 2 + 0.02); for (const x of [-0.75, 0.75]) b.add(unit.cyl, C.bronze, x, 0.75, (s - 0.3) / 2 + 0.05, 0.2, 0.03, 0.2, Math.PI / 2, 0, 0).add(unit.cyl, t, x, 0.75, (s - 0.3) / 2 + 0.07, 0.13, 0.03, 0.13, Math.PI / 2, 0, 0);
    b.box(1.0, 0.06, 0.06, C.woodD, 0, 0.55, s / 2 + 0.28); for (let i = -2; i <= 2; i++) b.cyl(0.018, 0.75, C.wood, i * 0.2, 0.16, s / 2 + 0.28).cone(0.035, 0.1, C.iron, i * 0.2, 0.9, s / 2 + 0.28, 5);
    b.box(0.06, 0.06, 0.6, C.woodD, s / 2 - 0.1, 0.5, s / 2 + 0.28); banner(-s / 2 + 0.1, s / 2 + 0.2, 0.16, 1.4);
  } else if (type === 'archery_range') {
    found(s, s); posts(s - 0.3, s - 0.7, 1.05); b.box(s - 0.1, 0.09, s - 0.6, t, 0, 1.21, -0.25, 0.12).box(s - 0.1, 0.03, s - 0.6, ancient ? C.thatch : st.roof, 0, 1.3, -0.25, 0.12).box(s - 0.5, 0.7, 0.08, C.woodD, 0, 0.2, -s / 2 + 0.5);
    for (const x of [-0.8, 0, 0.8]) { b.box(0.05, 0.6, 0.05, C.wood, x, 0.16, s / 2 - 0.15); b.add(unit.cyl, C.hay, x, 0.66, s / 2 - 0.15, 0.3, 0.06, 0.3, Math.PI / 2).add(unit.cyl, 0xffffff, x, 0.66, s / 2 - 0.12, 0.22, 0.03, 0.22, Math.PI / 2).add(unit.cyl, C.red, x, 0.66, s / 2 - 0.1, 0.15, 0.03, 0.15, Math.PI / 2).add(unit.cyl, C.gold, x, 0.66, s / 2 - 0.08, 0.06, 0.03, 0.06, Math.PI / 2); }
    b.box(0.4, 0.3, 0.3, C.hay, -1.0, 0.16, 0.0).box(0.4, 0.3, 0.3, C.hay, -1.0, 0.46, 0.05); banner(s / 2 - 0.1, -s / 2 + 0.2, 0.16, 1.3);
  } else if (type === 'stable') {
    found(s, s); b.box(s - 0.2, 0.85, s - 0.4, ancient ? 0xb5854f : st.wall, 0, 0.16, -0.2); posts(s - 0.2, s - 0.4, 0.85);
    roof(s + 0.15, 1.0, s - 0.1, 0, 1.0, -0.2, Math.PI / 2, () => b.box(s + 0.2, 0.08, 0.09, td, 0, 2.0, -0.2)); eraDetail(s - 0.2, s - 0.4, -0.2, 1.01);
    b.box(0.6, 0.65, 0.06, C.dark, 0, 0.16, s / 2 - 0.4 + 0.02).box(0.7, 0.06, 0.08, C.woodD, 0, 0.8, s / 2 - 0.38);
    for (const x of [-1, 1]) { b.box(0.06, 0.5, 0.06, C.wood, x * 0.9, 0.16, s / 2 - 0.1).box(0.06, 0.06, 0.7, C.wood, x * 0.9, 0.5, s / 2 - 0.45); } b.box(1.9, 0.06, 0.06, C.wood, 0, 0.5, s / 2 - 0.1).box(1.9, 0.06, 0.06, C.wood, 0, 0.3, s / 2 - 0.1);
    b.box(0.45, 0.28, 0.3, C.hay, -1.0, 0.16, s / 2 - 0.4).box(0.3, 0.3, 0.3, C.hay, 1.0, 0.16, s / 2 - 0.5).box(0.3, 0.1, 0.3, C.wood, 0.95, 1.4, s / 2 - 0.65); banner(-s / 2 + 0.1, s / 2 - 0.1, 0.16, 1.4);
  } else if (type === 'market') {
    found(s, s); for (const [x, z, c1] of [[-0.7, -0.5, t], [0.7, -0.5, 0xffffff], [0, 0.6, t]]) {
      b.box(0.9, 0.35, 0.5, C.wood, x, 0.16, z).box(0.06, 0.95, 0.06, C.woodD, x - 0.42, 0.16, z - 0.25).box(0.06, 0.95, 0.06, C.woodD, x + 0.42, 0.16, z - 0.25).box(0.06, 0.75, 0.06, C.woodD, x - 0.42, 0.16, z + 0.25).box(0.06, 0.75, 0.06, C.woodD, x + 0.42, 0.16, z + 0.25);
      for (let i = 0; i < 4; i++) b.box(0.24, 0.04, 0.72, i % 2 ? 0xffffff : c1, x - 0.36 + i * 0.24, 0.95 - 0.02 * 0, z, 0.25);
      for (let i = 0; i < 4; i++) b.sph(0.08, [C.red, C.gold, C.green, 0xc026d3][i], x - 0.27 + i * 0.18, 0.55, z + 0.05, 1, 0.8, 1);
    } b.cylT(0.16, 0.18, 0.36, C.woodD, 1.0, 0.16, 0.9).cylT(0.16, 0.18, 0.36, C.woodD, 0.75, 0.16, 1.05).box(0.3, 0.26, 0.3, C.wood, -1.0, 0.16, 0.9);
  } else if (type === 'government_center') {
    b.box(s + 0.2, 0.14, s + 0.2, C.marble).box(s, 0.14, s, C.stone, 0, 0.14, 0);
    b.box(s - 0.5, 1.0, s - 0.9, ancient ? C.marble : st.wall, 0, 0.28, -0.35); eraDetail(s - 0.5, s - 0.9, -0.35, 1.28);
    for (let i = 0; i < 6; i++) b.cyl(0.11, 1.15, C.marble, -s / 2 + 0.3 + i * (s - 0.6) / 5, 0.28, s / 2 - 0.25).cyl(0.14, 0.07, C.stone, -s / 2 + 0.3 + i * (s - 0.6) / 5, 0.28, s / 2 - 0.25).cyl(0.14, 0.07, C.stone, -s / 2 + 0.3 + i * (s - 0.6) / 5, 1.36, s / 2 - 0.25);
    b.box(s - 0.2, 0.2, 0.55, C.marble, 0, 1.43, s / 2 - 0.25).roof(s - 0.1, 0.62, 0.6, C.marble, 0, 1.63, s / 2 - 0.25, 0).roof(s - 0.5, 0.42, 0.62, t, 0, 1.68, s / 2 - 0.25, 0);
    b.cone(0.5, 0.5, t, 0, 1.28, -0.35, 8).cone(0.14, 0.3, C.gold, 0, 1.75, -0.35, 6); banner(s / 2 - 0.05, s / 2 - 0.05, 0.28, 1.6);
  } else if (type === 'wonder') {
    for (let i = 0; i < 3; i++) b.box(s - i * 0.5, 0.22, s - i * 0.5, i % 2 ? C.marble : 0xd9cfb0, 0, i * 0.22, 0);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = s * 0.36; b.cyl(0.13, 1.1, C.marble, Math.cos(a) * r, 0.66, Math.sin(a) * r).cyl(0.17, 0.08, C.stone, Math.cos(a) * r, 0.66, Math.sin(a) * r).cyl(0.17, 0.08, C.stone, Math.cos(a) * r, 1.76, Math.sin(a) * r); }
    b.cyl(s * 0.4, 0.14, C.marble, 0, 1.84, 0);
    for (let i = 0; i < 4; i++) b.box(s * 0.62 - i * 0.5, 0.42, s * 0.62 - i * 0.5, [C.marble, 0xd9cfb0, C.marble, 0xd9cfb0][i], 0, 1.96 + i * 0.42, 0);
    b.cone(0.55, 0.8, C.gold, 0, 3.64, 0, 4, Math.PI / 4).cone(0.09, 0.5, C.gold, 0, 4.4, 0, 6).sph(0.11, 0xfff3a0, 0, 4.95);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { b.cyl(0.05, 0.6, C.woodD, x * (s / 2 - 0.15), 0.66, z * (s / 2 - 0.15)).cylT(0.13, 0.06, 0.12, C.bronze, x * (s / 2 - 0.15), 1.26, z * (s / 2 - 0.15)).cone(0.1, 0.24, 0xff9a1f, x * (s / 2 - 0.15), 1.36, z * (s / 2 - 0.15), 6); }
    banner(0, s / 2 - 0.05, 0.66, 1.9);
  } else if (type === 'castle') {
    // A keep inside a battlemented curtain wall with four corner towers; later eras re-skin the stone.
    const cw = ancient || st.key === 'castle' ? 0x9c9a92 : st.wall, ct = ancient || st.key === 'castle' ? 0x6f6f68 : st.trim, W = s - 0.7, tw = h - 0.42;
    found(s, s); b.box(W, 1.3, W, cw, 0, 0.16, 0).box(W + 0.06, 0.08, W + 0.06, t, 0, 1.08, 0);
    for (const [ex, ez, ry] of [[0, -W / 2, 0], [0, W / 2, 0], [-W / 2, 0, Math.PI / 2], [W / 2, 0, Math.PI / 2]]) for (let k = -W / 2 + 0.15; k <= W / 2 - 0.15; k += 0.34) b.box(0.18, 0.18, 0.14, ct, ry ? ex : k, 1.46, ry ? k : ez, 0, ry);
    b.box(s - 1.7, 1.1, s - 1.7, cw, 0, 1.46, -0.1); for (const x of [-0.35, 0.35]) b.box(0.08, 0.3, 0.04, C.dark, x, 1.9, -0.1 + (s - 1.7) / 2);
    if (flat) b.box(s - 1.6, 0.12, s - 1.6, st.roof, 0, 2.56, -0.1); else for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.18, 0.18, 0.14, ct, x * (s - 1.9) / 2, 2.56, -0.1 + z * (s - 1.9) / 2);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      b.cyl(0.42, 1.9, cw, x * tw, 0.16, z * tw);
      if (flat) b.cyl(0.46, 0.12, st.roof, x * tw, 2.06, z * tw); else b.cone(0.5, 0.65, ancient ? 0x4f5a66 : st.roof, x * tw, 2.06, z * tw, 8);
    }
    door(0.7, 0.85, W / 2 + 0.02); for (let i = -2; i <= 2; i++) b.box(0.03, 0.85, 0.03, C.iron, i * 0.13, 0.16, W / 2 + 0.06);
    eraDetail(s - 1.7, s - 1.7, -0.1, 2.56);
    b.cyl(0.025, 0.9, C.woodD, 0, 2.56, -0.1); extra.flag = new B().box(0.025, 0.3, 0.55, t, 0, 0, 0.27).geometry(); extra.flagAt = [0, 3.15, -0.1];
  } else if (type === 'factory') {
    // A works hall with a glazed sawtooth roof and two smokestacks at the back.
    const X = s - 0.2, Z = s - 0.3, L = Z / 3, rise = 0.42, len = Math.hypot(L, rise), tilt = Math.atan2(rise, L);
    found(s, s); b.box(X, 1.0, Z, ancient ? 0x9a4a35 : st.wall, 0, 0.16, 0).box(X + 0.04, 0.08, Z + 0.04, t, 0, 0.9, 0);
    for (let i = 0; i < 3; i++) {
      const z0 = -Z / 2 + i * L;
      b.box(X, 0.05, len, ancient ? 0x5d6468 : st.roof, 0, 1.16 + rise / 2 - 0.025, z0 + L / 2, -tilt).box(X - 0.04, rise, 0.04, C.glass, 0, 1.16, z0 + L - 0.02);
    }
    for (const x of [-X / 2 + 0.35, X / 2 - 0.35]) b.cyl(0.13, 2.1, 0x7a3a2a, x, 0.16, -Z / 2 + 0.25).cyl(0.16, 0.08, C.stoneD, x, 2.26, -Z / 2 + 0.25);
    door(0.8, 0.7, Z / 2 + 0.02); win(-0.85, 0.5, Z / 2 + 0.02); win(0.85, 0.5, Z / 2 + 0.02);
    eraDetail(X, Z, 0, 1.16); banner(X / 2 - 0.05, Z / 2 + 0.1, 0.16, 1.3);
  } else { b.box(s, 0.8, s, C.plaster); }
  if (['house', 'barracks', 'stable'].includes(type)) {
    const front = type === 'house' ? (s - 0.1) / 2 + 0.012 : type === 'stable' ? s / 2 - 0.39 : (s - 0.3) / 2 + 0.012;
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4; row++) {
        b.box(0.2, 0.09, 0.07, st.key === 'timber' ? C.wood : st.trim,
          side * (s / 2 - 0.18), 0.19 + row * 0.18, front);
      }
    }
    b.box(s * 0.55, 0.045, 0.045, td, 0, 0.81, front + 0.04);
  }
  // scaffolding shown while under construction
  const sc = new B(), sh = { house: 1.7, town_center: 3.0, granary: 1.6, storage_pit: 1.1, farm: 0.8, wonder: 5.0, castle: 3.2, factory: 2.4 }[type] ?? (type === 'government_center' ? 2.4 : 1.9), w = s / 2 + 0.12;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) sc.box(0.06, sh, 0.06, 0xa8823f, x * w, 0, z * w);
  for (let y = 0.5; y < sh; y += 0.6) for (const [x, z, ry] of [[0, -w, 0], [0, w, 0], [-w, 0, Math.PI / 2], [w, 0, Math.PI / 2]]) sc.box(w * 2, 0.05, 0.05, 0xa8823f, x, y, z, 0, ry);
  for (const [x, z, ry] of [[0, w, 0], [w, 0, Math.PI / 2]]) sc.box(w * 2.2, 0.04, 0.04, 0xa8823f, x, sh / 2, z, 0, ry, 0.6);
  extra.scaffold = sc.geometry();
  return { body: b.geometry(), extra };
}
