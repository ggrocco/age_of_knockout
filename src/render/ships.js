// Ships (the Dock's units), bow to +z like every unit, hull resting on the water at y = 0. Each keeps one look in every
// era (era-units.js unitEra leaves them in their own). Parts that move: the War Galley's two banks of oars, the
// Frigate's and Destroyer's guns (recoil on a shot); the whole hull bobs and rolls (CPU, or the GPU's bob in a match).
import * as THREE from 'three';
import { B, C, TEAM, TEAM_DARK, cached, mesh, pivot, unit } from './builder.js';

const GREY = 0x7d868c, GREY_D = 0x5b6369, DECK = 0x9c8a6a, HULL = 0x4e3320, OCHRE = 0xc79a3a, SAIL = 0xe9e1cc, BLACK = 0x1c1c1c;

// A pointed hull w wide, len long and hh high, its keel at y and bow at +z: a box with a wedge bow, a band in c2 along the sides.
function hull(b, w, len, hh, c, c2, y = 0, bowLen = w * 0.75) {
  const body = len - bowLen;
  b.box(w, hh, body, c, 0, y, -bowLen / 2);
  const k = w / Math.SQRT2; // a square turned 45 degrees, half of it past the body's front, makes the bow
  b.box(k, hh, k, c, 0, y, len / 2 - bowLen, 0, Math.PI / 4).box(w * 0.36, hh * 0.9, bowLen * 0.9, c, 0, y + hh * 0.05, len / 2 - bowLen * 0.55);
  b.box(w + 0.03, 0.045, body, c2, 0, y + hh - 0.08, -bowLen / 2); // a stripe along the sides, under the deck's edge
  return b;
}

const parts = {
  fishing_ship(team) { // a small sailing smack: one mast with a lateen sail, a net boom over the stern and a fish crate
    const t = TEAM[team], b = hull(new B(), 0.44, 1.1, 0.2, C.wood, t);
    b.box(0.36, 0.02, 0.7, DECK, 0, 0.17, -0.12).box(0.24, 0.16, 0.22, C.woodD, 0, 0.18, -0.36).box(0.26, 0.03, 0.24, t, 0, 0.34, -0.36);
    b.cyl(0.022, 0.95, C.woodD, 0, 0.18, 0.12).add(unit.box, SAIL, 0.02, 0.62, 0.22, 0.02, 0.55, 0.42, 0.18, 0, 0);
    b.add(unit.cyl, C.woodD, 0, 0.42, -0.5, 0.015, 0.6, 0.015, 1.1, 0, 0).box(0.2, 0.2, 0.02, C.hay, 0, 0.12, -0.78);
    b.box(0.16, 0.08, 0.14, C.woodD, 0.08, 0.19, 0.12).sph(0.035, 0xb8c4cc, 0.08, 0.3, 0.12, 1.4, 0.5, 0.6);
    return { body: b.geometry() };
  },
  war_galley(team) { // a Bronze Age bireme: long low hull, a bronze ram, a painted eye, a square team sail and the stern curl
    const t = TEAM[team], td = TEAM_DARK[team], b = hull(new B(), 0.5, 1.7, 0.22, HULL, OCHRE), oar = new B();
    b.box(0.42, 0.02, 1.2, DECK, 0, 0.2, -0.18).add(unit.cyl, C.bronze, 0, 0.06, 0.92, 0.05, 0.22, 0.05, Math.PI / 2, 0, 0);
    for (const k of [-1, 1]) b.sph(0.035, 0xf2efe6, k * 0.15, 0.17, 0.66).sph(0.018, BLACK, k * 0.165, 0.17, 0.68);
    b.add(unit.tor, HULL, 0, 0.3, -0.78, 0.14, 0.14, 0.14, 0, Math.PI / 2, 0);
    b.cyl(0.03, 1.15, C.woodD, 0, 0.2, 0.05).box(0.72, 0.03, 0.03, C.woodD, 0, 1.15, 0.05).box(0.7, 0.48, 0.02, t, 0, 0.66, 0.06).box(0.7, 0.07, 0.025, td, 0, 0.88, 0.06);
    for (const k of [-1, 1]) for (let z = -0.55; z <= 0.4; z += 0.19) b.box(0.03, 0.12, 0.08, td, k * 0.26, 0.2, z);
    oar.add(unit.cyl, C.wood, 0.3, 0, 0, 0.012, 0.6, 0.012, 0, 0, Math.PI / 2 - 0.5).box(0.02, 0.02, 0.07, C.wood, 0.56, -0.15, 0);
    return { body: b.geometry(), oar: oar.geometry() };
  },
  frigate(team) { // an Age of Sail frigate: black hull with an ochre band and gun ports, three masts of square sails, a bowsprit
    const t = TEAM[team], b = hull(new B(), 0.6, 1.9, 0.34, BLACK, OCHRE), guns = new B();
    b.box(0.52, 0.02, 1.38, DECK, 0, 0.32, -0.2).box(0.56, 0.16, 0.36, BLACK, 0, 0.32, -0.74).box(0.58, 0.03, 0.38, OCHRE, 0, 0.48, -0.74);
    b.add(unit.cyl, C.woodD, 0, 0.42, 1.02, 0.02, 0.5, 0.02, 1.2, 0, 0);
    for (const [z, hgt] of [[0.48, 1.3], [-0.05, 1.55], [-0.55, 1.2]]) {
      b.cyl(0.03, hgt, C.woodD, 0, 0.32, z);
      for (const [y, w] of [[0.62, 0.62], [0.98, 0.5], [1.28, 0.36]]) if (y < hgt) b.box(w, Math.min(0.3, hgt - y - 0.04), 0.03, SAIL, 0, 0.32 + y - 0.18, z + 0.03).box(w + 0.06, 0.025, 0.025, C.woodD, 0, 0.32 + y + 0.12, z + 0.03);
    }
    b.box(0.02, 0.1, 0.24, t, 0, 1.75, -0.05).box(0.02, 0.08, 0.2, t, 0, 1.46, 0.48);
    for (const k of [-1, 1]) for (let z = -0.6; z <= 0.45; z += 0.21) guns.box(0.04, 0.06, 0.06, BLACK, k * 0.31, 0, z).add(unit.cyl, 0x33373b, k * 0.36, 0.03, z, 0.022, 0.1, 0.022, 0, 0, Math.PI / 2);
    return { body: b.geometry(), guns: guns.geometry(), gunsAt: [0, 0.2, 0] };
  },
  destroyer(team) { // a Modern destroyer: grey hull with a raked bow, a bridge and mast with radar, a funnel and two turrets
    const t = TEAM[team], b = hull(new B(), 0.52, 2.0, 0.26, GREY, GREY_D, 0, 0.6), turret = new B(), aft = new B();
    b.box(0.46, 0.02, 1.36, 0x6f777c, 0, 0.25, -0.3).box(0.53, 0.04, 0.5, t, 0, 0.18, -0.6);
    b.box(0.34, 0.32, 0.44, GREY, 0, 0.27, 0.05).box(0.36, 0.05, 0.1, 0x1d2b3a, 0, 0.5, 0.25).box(0.24, 0.14, 0.24, GREY_D, 0, 0.59, 0.0);
    b.cyl(0.025, 0.6, GREY_D, 0, 0.73, -0.02).box(0.26, 0.03, 0.05, GREY_D, 0, 1.1, -0.02).box(0.14, 0.06, 0.03, 0xd8e2e8, 0, 1.24, -0.02);
    b.cylT(0.09, 0.11, 0.3, GREY_D, 0, 0.27, -0.32, 10).cyl(0.095, 0.04, BLACK, 0, 0.57, -0.32);
    for (const g of [turret, aft]) g.box(0.22, 0.12, 0.24, GREY, 0, 0, 0).add(unit.cyl, GREY_D, 0, 0.06, 0.24, 0.025, 0.36, 0.025, Math.PI / 2, 0, 0);
    return { body: b.geometry(), turret: turret.geometry(), turretAt: [0, 0.27, 0.55], aft: aft.geometry(), aftAt: [0, 0.27, -0.72] };
  },
};
export const SHIP_TYPES = Object.keys(parts);

// A ship's model: { root, anim, shadow } like models.js's units. anim.body bobs; oars, guns and turrets are pivots.
export function shipModel(e) {
  const root = new THREE.Group(), p = cached(`ship:${e.type}:${e.owner}`, () => parts[e.type](e.owner)), body = new THREE.Group();
  body.add(mesh(p.body)); root.add(body);
  const anim = { type: 'ship', body };
  if (p.oar) anim.oars = [-1, 1].flatMap(k => [-0.45, -0.15, 0.15].map(z => { const o = pivot(k * 0.25, 0.22, z, p.oar); o.scale.x = k; body.add(o); return o; }));
  if (p.guns) { anim.gun = pivot(...p.gunsAt, p.guns); body.add(anim.gun); }
  if (p.turret) { anim.gun = pivot(...p.turretAt, p.turret); anim.aft = pivot(...p.aftAt, p.aft); anim.aft.rotation.y = Math.PI; body.add(anim.gun, anim.aft); }
  root.scale.setScalar(e.type === 'fishing_ship' ? 1 : 1.15);
  return { root, anim, shadow: e.type === 'fishing_ship' ? 0.4 : 0.6 };
}

// Per frame: the hull bobs and rolls (on the CPU only outside a match, where the GPU's bob does it), the oars sweep while
// rowing, the guns recoil just after a shot.
export function animateShip(g, a, e, t, moving) {
  if (!g.userData.gpuCosmetics) a.body.position.y = Math.sin(t * 3 + e.id) * 0.025; // the GPU's bob: sin(time * 3 + phase)
  a.body.rotation.z = Math.sin(t * 1.3 + e.id * 0.7) * 0.035;
  if (a.oars) for (const o of a.oars) o.rotation.y = moving ? Math.sin(t * 6 + e.id) * 0.45 : 0;
  const kick = e.order?.type === 'attack' && e.cooldown ? Math.max(0, (e.cd - e.cooldown + 8) / 8) : 0;
  if (a.gun && a.aft) a.gun.position.z = 0.55 - kick * 0.06;
  else if (a.gun) a.gun.scale.x = 1 - kick * 0.12; // the Frigate's broadside runs in on both sides
}
