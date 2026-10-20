// Procedural models with merged vertex colors (cached per type, team and building design).
// Limbs / arms / flags are separate animated meshes; the view draws every MODEL_MATERIAL mesh through one batch.
import * as THREE from 'three';
import { styleOf } from './styles.js';
import { B, C, unit, TEAM, TEAM_DARK, MODEL_MATERIAL, cached, mesh, pivot } from './builder.js';
import { designOf, archGeos } from './arch/index.js';
export { TEAM, TEAM_DARK, MODEL_MATERIAL };
const rng = seed => { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// ---------- humanoids ----------
function limbs(o, team) {
  const t = TEAM[team], td = TEAM_DARK[team], H = o.scale || 1;
  const body = new B(), legL = new B(), legR = new B(), armL = new B(), armR = new B();
  const tunic = o.tunic ?? t, pants = o.pants ?? C.leather;
  body.add(unit.cyl, tunic, 0, 0.57, 0, 0.19, 0.34, 0.115)
    .cylT(0.15, 0.21, 0.2, tunic, 0, 0.32, 0, 10)
    .box(0.34, 0.04, 0.24, o.belt ?? C.woodD, 0, 0.47, 0)
    .box(0.045, 0.045, 0.025, C.bronze, 0, 0.47, 0.135);
  if (o.armor) body.box(0.37, 0.32, 0.23, o.armor, 0, 0.4, 0).box(0.4, 0.06, 0.25, C.stoneD, 0, 0.7, 0);
  if (o.sash) body.box(0.06, 0.4, 0.22, t, 0.1, 0.36, 0, 0, 0, -0.5);
  body.sph(0.13, C.skin, 0, 0.87, 0).sph(0.05, C.skin, 0, 0.85, 0.12, 0.7, 0.7, 0.7);
  if (!o.helmet) body.sph(0.135, o.hair ?? C.hair, 0, 0.9, -0.02, 1, 0.75, 1);
  if (o.helmet === 'leather') body.sph(0.145, C.leather, 0, 0.9, 0, 1, 0.8, 1);
  if (o.helmet === 'bronze') { body.sph(0.155, C.bronze, 0, 0.9, 0, 1, 0.9, 1).box(0.05, 0.14, 0.26, td, 0, 0.98, 0).box(0.03, 0.12, 0.03, C.bronze, 0, 0.84, 0.15); }
  if (o.helmet === 'iron') { body.sph(0.155, C.iron, 0, 0.9, 0, 1, 0.9, 1).box(0.03, 0.14, 0.03, C.iron, 0, 0.84, 0.15).cone(0.05, 0.2, t, 0, 1.0, -0.02, 6); }
  if (o.helmet === 'great') body.cylT(0.135, 0.155, 0.24, C.iron, 0, 0.77, 0, 10).box(0.2, 0.025, 0.03, C.dark, 0, 0.9, 0.14).cone(0.05, 0.12, t, 0, 1.01, 0, 6);
  if (o.helmet === 'tricorn') body.sph(0.13, 0x1f1a16, 0, 0.95, 0, 1, 0.55, 1).cylT(0.21, 0.21, 0.05, 0x1f1a16, 0, 0.95, 0, 3);
  if (o.helmet === 'kepi') body.cylT(0.12, 0.145, 0.13, td, 0, 0.92, 0, 10).box(0.17, 0.02, 0.09, C.dark, 0, 0.93, 0.12);
  if (o.helmet === 'steel') body.sph(0.16, 0x55603a, 0, 0.92, 0, 1, 0.62, 1).cyl(0.2, 0.018, 0x4a5034, 0, 0.9, 0);
  if (o.hat === 'straw') body.cylT(0.05, 0.1, 0.07, C.hay, 0, 0.99, 0, 8).cyl(0.22, 0.02, C.hay, 0, 0.98, 0).box(0.02, 0.03, 0.3, t, 0, 1.0, 0, 0, 0, 0);
  if (o.quiver) body.cyl(0.05, 0.3, C.leather, -0.08, 0.42, -0.14, 0.3).box(0.02, 0.1, 0.02, C.hay, -0.08, 0.72, -0.18);
  if (o.cape) body.box(0.3, 0.55, 0.03, o.cape, 0, 0.2, -0.12, 0.08);
  for (const g of [legL, legR]) g.cylT(0.065, 0.045, 0.32, pants, 0, -0.32, 0, 8).box(0.11, 0.08, 0.17, C.dark, 0, -0.38, 0.025);
  const sleeve = o.sleeve ?? tunic;
  for (const g of [armL, armR]) g.cylT(0.065, 0.047, 0.17, sleeve, 0, -0.17, 0, 8).cylT(0.047, 0.035, 0.14, C.skin, 0, -0.3, 0, 8).sph(0.045, C.skin, 0, -0.33, 0);
  // right-hand weapon
  const w = o.weapon;
  if (w === 'club') armR.cylT(0.055, 0.03, 0.42, C.wood, 0, -0.33, 0.1, 8, 1.3).sph(0.075, C.woodD, 0, -0.1, 0.42);
  if (w === 'axe') { armR.cyl(0.02, 0.5, C.wood, 0, -0.42, 0.14, 1.3); armR.box(0.03, 0.18, 0.14, C.iron, 0, -0.16, 0.42, 1.3); }
  if (w === 'spear') { armR.cyl(0.018, 1.25, C.wood, 0, -0.6, 0.06, 0.15); armR.cone(0.045, 0.16, C.iron, 0, 0.56, 0.14, 6, 0); }
  if (w === 'sword') { armR.box(0.04, 0.05, 0.4, C.iron, 0, -0.31, 0.3, 0.2).box(0.14, 0.03, 0.03, C.gold, 0, -0.32, 0.1); }
  if (w === 'crossbow') armR.box(0.04, 0.045, 0.44, C.wood, 0, -0.38, 0.22).box(0.5, 0.03, 0.04, C.woodD, 0, -0.36, 0.42).box(0.46, 0.01, 0.01, C.hay, 0, -0.35, 0.36);
  if (w === 'musket') armR.box(0.05, 0.055, 0.3, C.wood, 0, -0.39, 0.05).box(0.026, 0.026, 0.78, C.iron, 0, -0.36, 0.48);
  if (w === 'rifle') armR.box(0.045, 0.055, 0.28, C.woodD, 0, -0.39, 0.05).box(0.03, 0.03, 0.56, 0x3a3f44, 0, -0.36, 0.38).box(0.012, 0.03, 0.2, C.iron, 0, -0.36, 0.76);
  if (w === 'mg') armR.box(0.08, 0.09, 0.36, 0x2f3437, 0, -0.42, 0.12).box(0.045, 0.045, 0.62, 0x2f3437, 0, -0.38, 0.5).box(0.1, 0.1, 0.12, 0x55603a, -0.08, -0.47, 0.06);
  if (w === 'sling') { armR.cyl(0.008, 0.36, C.leather, 0, -0.35, 0.04, 0.2).sph(0.04, C.stoneD, 0, -0.72, 0.06); }
  // left-hand equipment
  const sh = o.shield;
  if (sh === 'round') armL.add(unit.cyl, td, -0.09, -0.22, 0.13, 0.19, 0.03, 0.19, Math.PI / 2, 0, 0).add(unit.cyl, C.gold, -0.09, -0.22, 0.155, 0.06, 0.03, 0.06, Math.PI / 2, 0, 0).add(unit.cyl, t, -0.09, -0.22, 0.145, 0.15, 0.02, 0.15, Math.PI / 2, 0, 0);
  if (sh === 'big') armL.add(unit.cyl, C.bronze, -0.09, -0.2, 0.13, 0.24, 0.035, 0.24, Math.PI / 2, 0, 0).add(unit.cyl, t, -0.09, -0.2, 0.15, 0.17, 0.02, 0.17, Math.PI / 2, 0, 0).add(unit.cyl, C.gold, -0.09, -0.2, 0.165, 0.05, 0.02, 0.05, Math.PI / 2, 0, 0);
  if (sh === 'rect') armL.box(0.05, 0.42, 0.3, t, -0.1, -0.44, 0.13).box(0.06, 0.1, 0.1, C.iron, -0.1, -0.3, 0.13);
  if (o.bow) armL.add(unit.tor, C.wood, 0, -0.32, 0.12, 0.36, 0.36, 0.36, 0, 0, -Math.PI / 2).box(0.008, 0.68, 0.008, C.hay, 0, -0.66, 0.12);
  return { body: body.geometry(), legL: legL.geometry(), legR: legR.geometry(), armL: armL.geometry(), armR: armR.geometry(), s: H };
}
const HUMAN = {
  villager: { scale: 0.92, tunic: C.cloth, pants: 0x6b5a3a, hat: 'straw', sash: true },
  clubman: { helmet: null, weapon: 'club' },
  axeman: { helmet: 'leather', weapon: 'axe', shield: 'round' },
  slinger: { tunic: C.leather, weapon: 'sling', sash: true },
  bowman: { helmet: null, tunic: 0x4a6b3a, bow: true, quiver: true, sash: true },
  spearman: { helmet: 'leather', weapon: 'spear', shield: 'round' },
  hoplite: { scale: 1.05, helmet: 'bronze', weapon: 'spear', shield: 'big', armor: C.bronze, cape: null },
  swordsman: { scale: 1.08, helmet: 'iron', weapon: 'sword', shield: 'rect', armor: C.iron, cape: 'team' },
  crossbowman: { helmet: 'iron', tunic: 0x5a6b3a, weapon: 'crossbow', quiver: true, sash: true },
  musketeer: { helmet: 'tricorn', weapon: 'musket', belt: C.leather, sash: true, pants: 0xd8cfb4 },
  rifleman: { helmet: 'kepi', weapon: 'rifle', pants: 0x3a3f4a },
  machine_gunner: { scale: 1.04, helmet: 'steel', tunic: 0x5d6640, sleeve: 0x5d6640, pants: 0x4a5034, weapon: 'mg', sash: true },
  king: { scale: 1.12, tunic: 0x7a2a8a, sleeve: 0x7a2a8a, pants: 0x4a1a5a, helmet: null, cape: 'team', weapon: null, sash: true },
};
function villagerTools() {
  const mk = f => { const b = new B(); f(b); return b.geometry(); };
  return {
    axe: mk(b => { b.cyl(0.02, 0.5, C.wood, 0, -0.42, 0.14, 1.3).box(0.03, 0.18, 0.14, C.iron, 0, -0.16, 0.42, 1.3); }),
    pick: mk(b => { b.cyl(0.02, 0.5, C.wood, 0, -0.42, 0.14, 1.3).box(0.32, 0.03, 0.03, C.iron, 0, -0.16, 0.42, 1.3); }),
    hammer: mk(b => { b.cyl(0.02, 0.36, C.wood, 0, -0.38, 0.1, 1.2).box(0.1, 0.08, 0.08, C.stoneD, 0, -0.15, 0.32, 1.2); }),
    basket: mk(b => { b.cylT(0.13, 0.09, 0.14, C.leather, 0, -0.5, 0.16, 8).sph(0.09, 0xc026d3, 0, -0.34, 0.16, 1, 0.6, 1); }),
  };
}
function horse(team, barded = false) {
  const t = TEAM[team], body = new B(), leg = new B();
  if (barded) body.box(0.6, 0.36, 1.02, t, 0, 0.42, -0.04).box(0.62, 0.05, 1.04, C.gold, 0, 0.42, -0.04).box(0.14, 0.12, 0.3, C.iron, 0, 0.92, 0.66, 0.5);
  const coat = 0x8a5a33, dark = 0x4a2f1a;
  body.sph(0.4, coat, 0, 0.61, 0, 0.56, 0.6, 1.28).box(0.36, 0.05, 0.4, t, 0, 0.78, -0.02).box(0.26, 0.34, 0.16, coat, 0, 0.66, 0.42, -0.6);
  body.box(0.22, 0.24, 0.32, coat, 0, 0.9, 0.62, 0.5).box(0.1, 0.06, 0.1, dark, 0, 0.95, 0.78).box(0.05, 0.16, 0.08, dark, 0, 0.98, 0.5, 0.2).box(0.03, 0.05, 0.03, dark, -0.06, 1.12, 0.6).box(0.03, 0.05, 0.03, dark, 0.06, 1.12, 0.6);
  body.box(0.08, 0.4, 0.08, dark, 0, 0.36, -0.5, 0.5).sph(0.05, dark, 0, 0.22, -0.62);
  leg.box(0.1, 0.44, 0.1, coat, 0, -0.44, 0).box(0.11, 0.08, 0.12, dark, 0, -0.44, 0);
  return { body: body.geometry(), leg: leg.geometry() };
}
function catapult(team) {
  const t = TEAM[team], b = new B(), arm = new B();
  b.box(0.16, 0.14, 1.1, C.wood, -0.3, 0.2, 0).box(0.16, 0.14, 1.1, C.wood, 0.3, 0.2, 0).box(0.7, 0.1, 0.12, C.woodD, 0, 0.3, 0.4).box(0.7, 0.1, 0.12, C.woodD, 0, 0.3, -0.4);
  b.box(0.1, 0.5, 0.1, C.woodD, -0.3, 0.3, -0.05).box(0.1, 0.5, 0.1, C.woodD, 0.3, 0.3, -0.05).box(0.7, 0.08, 0.08, C.woodD, 0, 0.75, -0.05).box(0.5, 0.05, 0.4, t, 0, 0.34, 0.1);
  for (const [x, z] of [[-0.42, 0.4], [0.42, 0.4], [-0.42, -0.4], [0.42, -0.4]]) b.add(unit.cyl, C.woodD, x, 0.2, z, 0.22, 0.06, 0.22, 0, 0, Math.PI / 2).add(unit.cyl, C.iron, x, 0.2, z, 0.06, 0.09, 0.06, 0, 0, Math.PI / 2);
  arm.box(0.08, 0.08, 1.0, C.wood, 0, 0, -0.1).box(0.2, 0.12, 0.2, C.woodD, 0, 0.0, 0.42).sph(0.09, C.stoneD, 0, 0.14, 0.42);
  return { base: b.geometry(), arm: arm.geometry() };
}

// Medieval to Modern siege and armour: tall-armed Trebuchet, wheeled guns and the Tank.
function trebuchet(team) {
  const t = TEAM[team], b = new B(), arm = new B();
  for (const x of [-0.32, 0.32]) b.box(0.14, 0.12, 1.2, C.wood, x, 0.12, 0).box(0.08, 1.08, 0.08, C.woodD, x, 0.2, -0.22, 0.3).box(0.08, 1.08, 0.08, C.woodD, x, 0.2, 0.22, -0.3);
  b.box(0.76, 0.06, 0.06, C.woodD, 0, 1.12, 0).box(0.6, 0.06, 0.5, t, 0, 0.24, 0);
  for (const [x, z] of [[-0.42, 0.45], [0.42, 0.45], [-0.42, -0.45], [0.42, -0.45]]) b.add(unit.cyl, C.woodD, x, 0.2, z, 0.2, 0.06, 0.2, 0, 0, Math.PI / 2);
  arm.box(0.07, 0.07, 1.7, C.wood, 0, -0.035, 0.35).box(0.32, 0.3, 0.3, C.stoneD, 0, -0.42, -0.5).cyl(0.01, 0.4, C.leather, 0, -0.4, 1.18).sph(0.08, C.stoneD, 0, -0.42, 1.18);
  return { base: b.geometry(), arm: arm.geometry() };
}
function cannon(team, kind) {
  const t = TEAM[team], art = kind === 'artillery', b = new B(), barrel = new B(), metal = art ? 0x4a5034 : C.bronze;
  b.box(0.36, 0.14, 0.62, art ? 0x55603a : C.wood, 0, 0.26, -0.05).box(0.12, 0.08, 0.8, art ? 0x4a5034 : C.woodD, 0, 0.12, -0.55, -0.25).box(0.38, 0.06, 0.2, t, 0, 0.4, -0.2);
  for (const x of [-0.3, 0.3]) {
    b.add(unit.cyl, art ? 0x2f3437 : C.woodD, x, 0.28, 0, 0.28, 0.06, 0.28, 0, 0, Math.PI / 2).add(unit.cyl, C.iron, x, 0.28, 0, 0.06, 0.09, 0.06, 0, 0, Math.PI / 2);
    if (art) for (let k = 0; k < 4; k++) b.box(0.03, 0.5, 0.04, C.iron, x * 1.02, 0.03, 0, k * Math.PI / 4, 0, 0);
  }
  if (art) b.box(0.66, 0.42, 0.04, 0x55603a, 0, 0.32, 0.22).box(0.68, 0.04, 0.05, t, 0, 0.7, 0.22);
  barrel.add(unit.cyl, metal, 0, 0, 0.2, art ? 0.06 : 0.09, art ? 1.0 : 0.8, art ? 0.06 : 0.09, Math.PI / 2, 0, 0).add(unit.cyl, metal, 0, 0, -0.2, 0.12, 0.18, 0.12, Math.PI / 2, 0, 0);
  return { base: b.geometry(), barrel: barrel.geometry() };
}
function tank(team) {
  const t = TEAM[team], hull = new B(), turret = new B(), olive = 0x5d6640, dark = 0x2f3437;
  for (const x of [-0.44, 0.44]) { hull.box(0.22, 0.3, 1.36, dark, x, 0.04, 0); for (let z = -0.5; z <= 0.5; z += 0.25) hull.add(unit.cyl, 0x4a4f52, x * 1.02, 0.17, z, 0.12, 0.24, 0.12, 0, 0, Math.PI / 2); }
  hull.box(0.7, 0.3, 1.26, olive, 0, 0.18, 0).box(0.72, 0.06, 0.32, t, 0, 0.48, -0.38).box(0.66, 0.08, 0.2, 0x4a5034, 0, 0.36, 0.62, -0.5);
  turret.box(0.5, 0.22, 0.56, olive, 0, 0, -0.04).add(unit.cyl, 0x3a3f33, 0, 0.11, 0.6, 0.045, 0.8, 0.045, Math.PI / 2, 0, 0).cyl(0.09, 0.06, 0x4a5034, 0.1, 0.22, -0.12).box(0.18, 0.05, 0.05, t, -0.14, 0.23, -0.24);
  return { hull: hull.geometry(), turret: turret.geometry() };
}
function eraSiegeModel(e) {
  const root = new THREE.Group(), team = e.owner;
  if (e.type === 'tank') {
    const p = cached('tank' + team, () => tank(team)), hull = new THREE.Group(); hull.add(mesh(p.hull)); const turret = pivot(0, 0.5, 0, p.turret); hull.add(turret); root.add(hull);
    root.scale.setScalar(1.1); return { root, anim: { type: 'tank', hull, turret }, shadow: 0.75 };
  }
  if (e.type === 'trebuchet') {
    const p = cached('treb' + team, () => trebuchet(team)), arm = pivot(0, 1.12, 0, p.arm); arm.rotation.x = -0.6;
    root.add(mesh(p.base), arm); root.scale.setScalar(1.15); return { root, anim: { type: 'treb', arm }, shadow: 0.7 };
  }
  const kind = e.type === 'field_artillery' ? 'artillery' : 'cannon', p = cached(`gun:${kind}:${team}`, () => cannon(team, kind)), barrel = pivot(0, 0.48, 0.05, p.barrel);
  barrel.rotation.x = -0.12; root.add(mesh(p.base), barrel); root.scale.setScalar(1.1); return { root, anim: { type: 'gun', barrel }, shadow: 0.6 };
}

function unitModel(e) {
  const root = new THREE.Group(), team = e.owner;
  if (['drone', 'mech', 'railgun'].includes(e.type)) return futureModel(e);
  if (['tank', 'trebuchet', 'cannon', 'field_artillery'].includes(e.type)) return eraSiegeModel(e);
  if (e.cls === 'siege') {
    const p = cached('cat' + team, () => catapult(team)), armP = pivot(0, 0.5, -0.05, p.arm); armP.rotation.x = -0.5;
    root.add(mesh(p.base), armP); root.scale.setScalar(1.15); return { root, anim: { type: 'cat', arm: armP }, shadow: 0.6 };
  }
  const spec = { ...(HUMAN[e.type] || {}) }; if (spec.cape === 'team') spec.cape = TEAM_DARK[team];
  const h = cached(`h:${e.type}:${team}`, () => limbs(spec, team));
  const anim = { type: 'human' };
  if (e.cls === 'cav') {
    const barded = e.type === 'knight', hs = cached((barded ? 'horse:barded' : 'horse') + team, () => horse(team, barded)), hr = new THREE.Group(); hr.add(mesh(hs.body));
    anim.type = 'horse'; anim.legs = [[-0.11, 0.42, 0.3], [0.11, 0.42, 0.3], [-0.11, 0.42, -0.3], [0.11, 0.42, -0.3]].map(([x, y, z]) => { const p = pivot(x, y, z, hs.leg); hr.add(p); return p; });
    const rider = new THREE.Group(); rider.position.y = 0.72; rider.scale.setScalar(0.9);
    const spec2 = barded ? { tunic: TEAM[team], weapon: 'spear', helmet: 'great', armor: C.iron, shield: 'rect' } : { tunic: TEAM[team], bow: e.type === 'horse_archer', weapon: e.type === 'scout' ? 'spear' : null, helmet: 'leather' };
    const r = cached(`rider:${e.type}:${team}`, () => limbs(spec2, team)); rider.add(mesh(r.body)); anim.armR = pivot(0.22, 0.7, 0, r.armR); anim.armL = pivot(-0.22, 0.7, 0, r.armL); rider.add(anim.armR, anim.armL);
    root.add(hr, rider); root.scale.setScalar(1.1); return { root, anim, shadow: 0.55 };
  }
  const inner = new THREE.Group(); inner.scale.setScalar(h.s); root.add(inner);
  inner.add(mesh(h.body)); anim.legL = pivot(-0.09, 0.38, 0, h.legL); anim.legR = pivot(0.09, 0.38, 0, h.legR); anim.armL = pivot(-0.22, 0.7, 0, h.armL); anim.armR = pivot(0.22, 0.7, 0, h.armR);
  inner.add(anim.legL, anim.legR, anim.armL, anim.armR);
  if (e.type === 'villager') {
    const tl = cached('vtools', villagerTools); anim.tools = {}; for (const [k, g] of Object.entries(tl)) { const m = mesh(g); m.visible = false; anim.armR.add(m); anim.tools[k] = m; }
    const sack = new B().box(0.22, 0.26, 0.14, C.cloth, 0, 0.36, -0.2).sph(0.08, C.cloth, 0, 0.66, -0.2); anim.sack = mesh(cached('sack', () => sack.geometry())); anim.sack.visible = false; inner.add(anim.sack);
  }
  if (e.type === 'king') {
    const crown = cached('crown', () => {
      const b = new B().cyl(0.145, 0.07, C.gold, 0, 0.96, 0);
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 0.4; b.cone(0.035, 0.1, C.gold, Math.cos(a) * 0.12, 1.03, Math.sin(a) * 0.12, 4); }
      return b.geometry();
    });
    inner.add(mesh(crown));
  }
  return { root, anim, shadow: 0.32 };
}

// The game's fictional fifth age has its own silhouettes, not ancient-unit fallbacks.
function futureModel(e) {
  const root = new THREE.Group(), t = TEAM[e.owner], shell = 0x697678, dark = 0x303a3c;
  const parts = cached(`future:${e.type}:${e.owner}`, () => {
    const b = new B(), moving = new B();
    if (e.type === 'drone') {
      b.sph(0.3, shell, 0, 0, 0, 1, 0.48, 1.2).box(0.22, 0.06, 0.3, t, 0, 0.12, 0)
        .sph(0.075, 0x8ddbe7, 0, -0.025, 0.32);
      for (const x of [-0.4, 0.4]) for (const z of [-0.35, 0.35]) {
        b.box(0.5, 0.045, 0.065, dark, x * 0.55, 0, z).cyl(0.1, 0.12, shell, x, 0, z);
      }
      moving.box(0.48, 0.025, 0.045, dark).box(0.045, 0.025, 0.48, dark);
    } else if (e.type === 'mech') {
      b.box(0.55, 0.5, 0.38, shell, 0, 0.55, 0).box(0.4, 0.22, 0.1, t, 0, 0.72, 0.23)
        .box(0.3, 0.2, 0.25, dark, 0, 1.08, 0).box(0.23, 0.055, 0.04, 0x8ddbe7, 0, 1.17, 0.14);
      for (const x of [-0.38, 0.38]) b.sph(0.15, t, x, 0.98, 0).box(0.14, 0.38, 0.18, shell, x, 0.53, 0)
        .box(0.18, 0.16, 0.22, dark, x, 0.4, 0.03);
      moving.cyl(0.1, 0.36, dark, 0, -0.36, 0).box(0.18, 0.26, 0.18, shell, 0, -0.38, 0)
        .box(0.23, 0.1, 0.34, dark, 0, -0.55, 0.055);
    } else {
      b.box(0.68, 0.3, 1.05, shell, 0, 0.15, 0).box(0.52, 0.1, 0.75, t, 0, 0.45, 0);
      for (const x of [-0.4, 0.4]) {
        b.box(0.2, 0.3, 1.2, dark, x, 0.05, 0);
        for (let z = -0.5; z <= 0.5; z += 0.16) b.box(0.23, 0.04, 0.065, shell, x, 0.35, z);
      }
      b.cyl(0.24, 0.16, dark, 0, 0.55, 0);
      moving.box(0.32, 0.24, 0.5, shell, 0, 0, 0);
      for (const x of [-0.12, 0.12]) moving.box(0.06, 0.08, 1.05, shell, x, 0.09, 0.6)
        .box(0.025, 0.035, 0.9, 0x8ddbe7, x, 0.17, 0.62);
    }
    return { body: b.geometry(), moving: moving.geometry() };
  });
  const body = new THREE.Group(); body.add(mesh(parts.body)); root.add(body);
  const anim = { type: e.type, body };
  if (e.type === 'drone') {
    body.position.y = 1.1; anim.rotors = [];
    for (const x of [-0.4, 0.4]) for (const z of [-0.35, 0.35]) { const rotor = pivot(x, 0.13, z, parts.moving); body.add(rotor); anim.rotors.push(rotor); }
  } else if (e.type === 'mech') {
    anim.legs = [-0.18, 0.18].map(x => { const leg = pivot(x, 0.55, 0, parts.moving); root.add(leg); return leg; });
  } else { anim.barrel = pivot(0, 0.68, 0, parts.moving); body.add(anim.barrel); }
  return { root, anim, shadow: e.type === 'railgun' ? 0.7 : 0.45 };
}

// ---------- buildings ----------
// Geometry comes from the arch registry (arch/index.js) and is cached per design key, so eras that show the same
// design share it. buildingStyle is the legacy palette key, still used by the buildings gallery.
export const buildingStyle = age => styleOf(age).key;
function buildingModel(e, age = 'stone') {
  const root = new THREE.Group(), g = cached(`b:${e.type}:${e.owner}:${designOf(e.type, age).key}`, () => archGeos(e.type, e.owner, e.size, age));
  const body = new THREE.Group(); body.add(mesh(g.body)); root.add(body);
  const anim = { type: 'building', body };
  if (g.mast) { anim.mast = mesh(g.mast); root.add(anim.mast); } // flagpoles, antennas, spire tips: outside the body's height
  if (g.extra.scaffold) { anim.scaffold = mesh(g.extra.scaffold); root.add(anim.scaffold); }
  if (g.extra.crops) { anim.crops = mesh(g.extra.crops); root.add(anim.crops); }
  if (g.extra.flag) { anim.flag = pivot(...g.extra.flagAt, g.extra.flag); root.add(anim.flag); }
  // Animated parts (gears, rings, floating plates, smoke puffs), each on its own pivot; animate() moves them.
  const part = x => { const p = pivot(...x.at, x.geo); root.add(p); return p; };
  for (const x of g.extra.spinners ?? []) (anim.spinners ??= []).push({ p: part(x), axis: x.axis ?? 'y', speed: x.speed ?? 1 });
  for (const x of g.extra.floaters ?? []) (anim.floaters ??= []).push({ p: part(x), y: x.at[1], amp: x.amp ?? 0.08, speed: x.speed ?? 1.6, phase: x.phase ?? 0 });
  for (const x of g.extra.smoke ?? []) (anim.smoke ??= []).push({ p: part(x), y: x.at[1], phase: x.phase ?? 0 });
  return { root, anim, shadow: e.size * 0.62, boxShadow: true };
}

// ---------- nature ----------
function tree(variant) {
  const r = rng(variant + 11), b = new B(), pine = variant % 3 === 0, height = 1.5 + r() * 0.7;
  b.cylT(0.065, 0.15, height * 0.75, 0x685038, 0, 0, 0, 8);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 0.4;
    b.cylT(0.035, 0.09, 0.38, C.woodD, Math.sin(angle) * 0.09, 0.02, Math.cos(angle) * 0.09, 6, Math.sin(angle) * 0.7, 0, Math.cos(angle) * 0.7);
  }
  if (pine) {
    for (let tier = 0; tier < 5; tier++) {
      const radius = 0.65 - tier * 0.105, y = height * 0.25 + tier * 0.29;
      b.cone(radius, 0.65, [0x384f2c, 0x455e31, 0x536c36][tier % 3], 0, y, 0, 9, tier * 0.7);
      for (let j = 0; j < 5; j++) {
        const a = j * 1.256 + tier;
        b.foliage(radius * 0.43, 0x496138, Math.cos(a) * radius * 0.56, y + 0.03, Math.sin(a) * radius * 0.56, 1, 0.5, 1, a);
      }
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4, radius = 0.28 + r() * 0.2, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      const y = height * 0.52 + r() * 0.45;
      b.cylT(0.025, 0.075, 0.65, 0x685038, x * 0.5, y - 0.45, z * 0.5, 7, Math.sin(angle) * 0.6, 0, -Math.cos(angle) * 0.6);
      for (let j = 0; j < 3; j++) b.foliage(0.28 + r() * 0.15, [0x526c32, 0x637c3b, 0x465e2c, 0x768448][(i + j) % 4],
        x + (r() - 0.5) * 0.35, y + r() * 0.27, z + (r() - 0.5) * 0.35, 1, 0.8, 1, r() * 6);
    }
    b.foliage(0.42, 0x687d3c, 0, height * 0.86, 0, 1, 0.7, 1);
  }
  return b.geometry();
}
function rockPile(kind, variant) {
  const r = rng(variant + (kind === 'gold' ? 77 : 33)), b = new B(), base = kind === 'gold' ? 0x8a8478 : 0x9ca3af, dk = kind === 'gold' ? 0x6f6a60 : 0x6b7280;
  b.rock(0.42, base, 0, 0, 0, 1.1, 0.75, 0.95, r() * 3).rock(0.28, dk, 0.32, 0, 0.12, 1, 0.8, 1, r() * 3).rock(0.22, base, -0.3, 0, 0.18, 1, 0.9, 1, r() * 3);
  if (kind === 'gold') for (let i = 0; i < 5; i++) b.rock(0.11 + r() * 0.06, [C.gold, 0xffd84a, 0xe0a81a][i % 3], (r() - 0.5) * 0.6, 0.28 + r() * 0.15, (r() - 0.5) * 0.5, 1, 1, 1, r() * 3);
  else b.rock(0.2, 0xb8bec6, 0.05, 0.3, -0.05, 1, 0.8, 1, r() * 3);
  return b.geometry();
}
function berry(variant) {
  const r = rng(variant + 5), b = new B();
  for (let i = 0; i < 8; i++) b.rock(0.21, [0x4c6534, 0x647c3f, 0x3d562e][i % 3], (r() - 0.5) * 0.55, 0.1 + r() * 0.16, (r() - 0.5) * 0.55, 1, 0.85, 1, r() * 6);
  for (let i = 0; i < 12; i++) b.sph(0.035, i % 3 ? 0x8f2630 : 0xb94036, (r() - 0.5) * 0.6, 0.25 + r() * 0.2, (r() - 0.5) * 0.6);
  return b.geometry();
}
function resourceModel(e) {
  const v = e.id % 6, root = new THREE.Group(), rr = rng(e.id);
  const geo = cached(`r:${e.type}:${v}`, () => e.type === 'tree' ? tree(v) : e.type === 'berry' ? berry(v) : rockPile(e.type, v));
  const m = mesh(geo); m.rotation.y = rr() * 6.28; m.userData.baseScale = 0.9 + rr() * 0.25; root.add(m);
  if (e.type === 'tree') m.rotation.z = (rr() - 0.5) * 0.08;
  return { root, anim: { type: 'res', mesh: m }, shadow: e.type === 'tree' ? 0.5 : 0.4 };
}
function relicModel() {
  const root = new THREE.Group(), g = cached('relic', () => { const b = new B(); b.cylT(0.2, 0.26, 0.2, C.stone, 0, 0, 0, 8).cylT(0.05, 0.08, 0.2, C.gold, 0, 0.2, 0, 8).cylT(0.16, 0.06, 0.2, C.gold, 0, 0.4, 0, 10).add(unit.tor, C.gold, 0.16, 0.5, 0, 0.09, 0.09, 0.09, 0, 0, 0).sph(0.06, 0xd6336c, 0, 0.64, 0); return b.geometry(); });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.y = 0.5; glow.raycast = () => {};
  const body = mesh(g); root.add(body, glow); return { root, anim: { type: 'relic', glow, body }, shadow: 0.3 };
}

export function buildModel(e, age = 'stone') {
  if (e.kind === 'unit') return unitModel(e);
  if (e.kind === 'building') return buildingModel(e, age);
  if (e.kind === 'resource') return resourceModel(e);
  return relicModel();
}

// per-frame animation of a model's moving parts
export function animate(g, e, t, moving) {
  const a = g.userData.anim; if (!a) return;
  if (a.type === 'human' || a.type === 'horse') {
    const k = moving ? Math.sin(t * (a.type === 'horse' ? 14 : 11) + e.id) : 0;
    if (a.type === 'human') { a.legL.rotation.x = k * 0.7; a.legR.rotation.x = -k * 0.7; }
    else for (let i = 0; i < 4; i++) a.legs[i].rotation.x = (i % 3 === 0 ? k : -k) * 0.8;
    const o = e.order, attacking = o.type === 'attack' && e.cd > e.cooldown - 8, working = o.type === 'gather' && o.phase === 'work' || o.type === 'build' && !moving;
    if (a.armL) a.armL.rotation.x = moving ? -k * 0.6 : 0.05 * Math.sin(t * 2 + e.id);
    if (a.armR) {
      if (attacking) a.armR.rotation.x = -1.7 + (e.cd - (e.cooldown - 8)) * -0.2;
      else if (working) a.armR.rotation.x = -0.6 + Math.sin(t * 10 + e.id) * 0.9;
      else a.armR.rotation.x = moving ? k * 0.6 : 0;
    }
    if (a.tools) { // villager tool follows the job
      const kind = o.type === 'build' ? 'hammer' : o.type === 'gather' ? (o.kind === 'wood' ? 'axe' : o.kind === 'food' ? 'basket' : 'pick') : null;
      for (const [n, m] of Object.entries(a.tools)) m.visible = n === kind;
      if (a.sack) a.sack.visible = e.carry.amount > 0.5 && o.type === 'gather';
    }
  } else if (a.type === 'cat') {
    const p = Math.max(0, (e.cd - (e.cooldown - 14)) / 14); a.arm.rotation.x = e.order.type === 'attack' && p > 0 ? 1.1 - p * 1.6 : -0.5;
  } else if (a.type === 'treb') {
    const p = Math.max(0, (e.cd - (e.cooldown - 16)) / 16); a.arm.rotation.x = e.order.type === 'attack' && p > 0 ? 1.5 - p * 2.3 : -0.6;
  } else if (a.type === 'gun') {
    a.barrel.position.z = 0.05 - (e.order.type === 'attack' ? Math.max(0, (e.cd - e.cooldown + 10) / 10) * 0.14 : 0);
  } else if (a.type === 'tank') {
    a.turret.position.z = e.order.type === 'attack' ? -Math.max(0, (e.cd - e.cooldown + 8) / 8) * 0.1 : 0;
    a.hull.position.y = moving ? Math.abs(Math.sin(t * 12 + e.id)) * 0.02 : 0;
  } else if (a.type === 'drone') {
    a.body.position.y = 1.1 + Math.sin(t * 3 + e.id) * 0.055;
    a.body.rotation.x = moving ? 0.12 : 0;
    a.rotors.forEach((rotor, i) => { rotor.rotation.y = t * (i % 2 ? 35 : -35); });
  } else if (a.type === 'mech') {
    const stride = moving ? Math.sin(t * 8 + e.id) * 0.5 : 0;
    a.legs[0].rotation.x = stride; a.legs[1].rotation.x = -stride;
    a.body.position.y = moving ? Math.abs(Math.sin(t * 8 + e.id)) * 0.035 : 0;
  } else if (a.type === 'railgun') {
    a.barrel.position.z = e.order.type === 'attack' ? -Math.max(0, (e.cd - e.cooldown + 10) / 10) * 0.16 : 0;
  } else if (a.type === 'building') {
    const p = e.constructed ? 1 : 0.15 + 0.85 * e.progress; a.body.scale.y = p;
    if (a.scaffold) a.scaffold.visible = !e.constructed;
    if (a.crops) { a.crops.visible = e.constructed; a.crops.scale.y = 0.35 + 0.65 * Math.min(1, e.amount / 400); }
    if (a.flag) a.flag.rotation.y = Math.sin(t * 3) * 0.35;
    // The mast, every flag and the animated parts only show on a finished building.
    if (a.mast) a.mast.visible = e.constructed;
    if (a.flag) a.flag.visible = e.constructed;
    for (const sp of a.spinners ?? []) { sp.p.visible = e.constructed; sp.p.rotation[sp.axis] = t * sp.speed; }
    for (const f of a.floaters ?? []) { f.p.visible = e.constructed; f.p.position.y = f.y + Math.sin(t * f.speed + f.phase) * f.amp; }
    for (const sm of a.smoke ?? []) { const k = (t * 0.35 + sm.phase) % 1; sm.p.visible = e.constructed; sm.p.position.y = sm.y + k * 0.9; sm.p.scale.setScalar(0.5 + k * 0.9); }
  } else if (a.type === 'res') {
    const full = e.type === 'tree' ? 100 : e.type === 'berry' ? 200 : e.type === 'gold' ? 800 : 600, f = 0.55 + 0.45 * Math.min(1, e.amount / full), s = a.mesh.userData.baseScale;
    a.mesh.scale.set(s * f, s * (e.type === 'tree' ? f : 0.6 + 0.4 * f), s * f);
  } else if (a.type === 'relic') {
    a.body.rotation.y = t * 1.5; a.glow.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
  }
}
