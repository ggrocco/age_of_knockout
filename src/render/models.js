// Procedural models with merged vertex colors (cached per type, team and building design).
// Limbs / arms / flags are separate animated meshes; the view draws every MODEL_MATERIAL mesh through one batch.
import * as THREE from 'three';
import { styleOf } from './styles.js';
import { B, C, unit, TEAM, TEAM_DARK, MODEL_MATERIAL, cached, mesh, pivot } from './builder.js';
import { designOf, archGeos } from './arch/index.js';
import {
  unitEra, eraSpec, mountOf, siegeLook, SIEGE_REMAP, pads, motorbike, hoverbike, mortar, rockets, armoredTrain,
} from './era-units.js';
import { shipModel, animateShip, SHIP_TYPES } from './ships.js';
export { TEAM, TEAM_DARK, MODEL_MATERIAL, unitEra };

// A small seeded generator (mulberry32) so every tree, rock and berry bush keeps its shape.
const rng = seed => {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};
const HALF_TURN = Math.PI / 2;

// ---------- humanoids ----------
// Head gear on the body, by spec.helmet; t / td are the team colour and its dark shade.
const HELMETS = {
  leather: body => body.sph(0.145, C.leather, 0, 0.9, 0, 1, 0.8, 1),
  bronze: (body, t, td) => body.sph(0.155, C.bronze, 0, 0.9, 0, 1, 0.9, 1)
    .box(0.05, 0.14, 0.26, td, 0, 0.98, 0).box(0.03, 0.12, 0.03, C.bronze, 0, 0.84, 0.15),
  iron: (body, t) => body.sph(0.155, C.iron, 0, 0.9, 0, 1, 0.9, 1)
    .box(0.03, 0.14, 0.03, C.iron, 0, 0.84, 0.15).cone(0.05, 0.2, t, 0, 1.0, -0.02, 6),
  great: (body, t) => body.cylT(0.135, 0.155, 0.24, C.iron, 0, 0.77, 0, 10)
    .box(0.2, 0.025, 0.03, C.dark, 0, 0.9, 0.14).cone(0.05, 0.12, t, 0, 1.01, 0, 6),
  tricorn: body => body.sph(0.13, 0x1f1a16, 0, 0.95, 0, 1, 0.55, 1).cylT(0.21, 0.21, 0.05, 0x1f1a16, 0, 0.95, 0, 3),
  kepi: (body, t, td) => body.cylT(0.12, 0.145, 0.13, td, 0, 0.92, 0, 10).box(0.17, 0.02, 0.09, C.dark, 0, 0.93, 0.12),
  kettle: (body, t) => body.sph(0.15, C.iron, 0, 0.91, 0, 1, 0.7, 1)
    .cyl(0.22, 0.02, C.iron, 0, 0.9, 0).box(0.03, 0.08, 0.03, t, 0, 0.99, 0),
  visor: (body, t) => body.sph(0.155, 0xd8e2e8, 0, 0.9, 0, 1, 0.95, 1.05)
    .box(0.22, 0.05, 0.06, 0x39f3ff, 0, 0.84, 0.14).box(0.04, 0.035, 0.28, t, 0, 1.03, 0),
  steel: body => body.sph(0.16, 0x55603a, 0, 0.92, 0, 1, 0.62, 1).cyl(0.2, 0.018, 0x4a5034, 0, 0.9, 0),
};

// Right-hand weapons, by spec.weapon, built on the right arm.
const WEAPONS = {
  club: arm => arm.cylT(0.055, 0.03, 0.42, C.wood, 0, -0.33, 0.1, 8, 1.3).sph(0.075, C.woodD, 0, -0.1, 0.42),
  axe: arm => {
    arm.cyl(0.02, 0.5, C.wood, 0, -0.42, 0.14, 1.3);
    arm.box(0.03, 0.18, 0.14, C.iron, 0, -0.16, 0.42, 1.3);
  },
  spear: arm => {
    arm.cyl(0.018, 1.25, C.wood, 0, -0.6, 0.06, 0.15);
    arm.cone(0.045, 0.16, C.iron, 0, 0.56, 0.14, 6, 0);
  },
  sword: arm => arm.box(0.04, 0.05, 0.4, C.iron, 0, -0.31, 0.3, 0.2).box(0.14, 0.03, 0.03, C.gold, 0, -0.32, 0.1),
  crossbow: arm => arm.box(0.04, 0.045, 0.44, C.wood, 0, -0.38, 0.22)
    .box(0.5, 0.03, 0.04, C.woodD, 0, -0.36, 0.42).box(0.46, 0.01, 0.01, C.hay, 0, -0.35, 0.36),
  musket: arm => arm.box(0.05, 0.055, 0.3, C.wood, 0, -0.39, 0.05).box(0.026, 0.026, 0.78, C.iron, 0, -0.36, 0.48),
  rifle: arm => arm.box(0.045, 0.055, 0.28, C.woodD, 0, -0.39, 0.05)
    .box(0.03, 0.03, 0.56, 0x3a3f44, 0, -0.36, 0.38).box(0.012, 0.03, 0.2, C.iron, 0, -0.36, 0.76),
  mg: arm => arm.box(0.08, 0.09, 0.36, 0x2f3437, 0, -0.42, 0.12)
    .box(0.045, 0.045, 0.62, 0x2f3437, 0, -0.38, 0.5).box(0.1, 0.1, 0.12, 0x55603a, -0.08, -0.47, 0.06),
  mace: arm => arm.cyl(0.022, 0.5, C.wood, 0, -0.42, 0.14, 1.3).sph(0.075, C.iron, 0, -0.09, 0.4)
    .box(0.19, 0.03, 0.03, C.iron, 0, -0.105, 0.4).box(0.03, 0.19, 0.03, C.iron, 0, -0.185, 0.4),
  baton: arm => arm.cyl(0.024, 0.44, C.woodD, 0, -0.4, 0.14, 1.3)
    .sph(0.034, C.iron, 0, -0.12, 0.35).box(0.1, 0.02, 0.02, C.iron, 0, -0.33, 0.13),
  sabre: arm => arm.box(0.025, 0.045, 0.26, C.iron, 0, -0.33, 0.22, 0.24)
    .box(0.025, 0.045, 0.2, C.iron, 0, -0.36, 0.44, 0.02).box(0.14, 0.03, 0.03, C.gold, 0, -0.32, 0.1),
  bayonet: arm => arm.box(0.045, 0.055, 0.3, C.wood, 0, -0.39, 0.05)
    .box(0.03, 0.03, 0.6, 0x3a3f44, 0, -0.36, 0.4).box(0.014, 0.04, 0.34, C.iron, 0, -0.365, 0.86),
  sling: arm => { arm.cyl(0.008, 0.36, C.leather, 0, -0.35, 0.04, 0.2).sph(0.04, C.stoneD, 0, -0.72, 0.06); },
};

// Left-hand shields, by spec.shield, built on the left arm; the round ones are discs turned to face forward.
const SHIELDS = {
  round: (arm, t, td) => arm.add(unit.cyl, td, -0.09, -0.22, 0.13, 0.19, 0.03, 0.19, HALF_TURN, 0, 0)
    .add(unit.cyl, C.gold, -0.09, -0.22, 0.155, 0.06, 0.03, 0.06, HALF_TURN, 0, 0)
    .add(unit.cyl, t, -0.09, -0.22, 0.145, 0.15, 0.02, 0.15, HALF_TURN, 0, 0),
  big: (arm, t) => arm.add(unit.cyl, C.bronze, -0.09, -0.2, 0.13, 0.24, 0.035, 0.24, HALF_TURN, 0, 0)
    .add(unit.cyl, t, -0.09, -0.2, 0.15, 0.17, 0.02, 0.17, HALF_TURN, 0, 0)
    .add(unit.cyl, C.gold, -0.09, -0.2, 0.165, 0.05, 0.02, 0.05, HALF_TURN, 0, 0),
  rect: (arm, t) => arm.box(0.05, 0.42, 0.3, t, -0.1, -0.44, 0.13).box(0.06, 0.1, 0.1, C.iron, -0.1, -0.3, 0.13),
  riot: (arm, t) => arm.box(0.04, 0.52, 0.32, 0x8aa4b4, -0.1, -0.52, 0.13)
    .box(0.045, 0.05, 0.33, t, -0.1, -0.24, 0.13).box(0.05, 0.03, 0.33, 0x2f3437, -0.1, -0.03, 0.13),
  energy: (arm, t) => arm.box(0.03, 0.5, 0.32, 0xd8e2e8, -0.1, -0.5, 0.13)
    .box(0.045, 0.42, 0.25, 0x39f3ff, -0.1, -0.46, 0.13).box(0.05, 0.08, 0.08, t, -0.1, -0.29, 0.13),
};

// Torso, head and what is worn on them (armour, sash, hair or helmet, hat, quiver, cape).
function humanBody(body, spec, t, td) {
  const tunic = spec.tunic ?? t;
  body.add(unit.cyl, tunic, 0, 0.57, 0, 0.19, 0.34, 0.115)
    .cylT(0.15, 0.21, 0.2, tunic, 0, 0.32, 0, 10)
    .box(0.34, 0.04, 0.24, spec.belt ?? C.woodD, 0, 0.47, 0)
    .box(0.045, 0.045, 0.025, C.bronze, 0, 0.47, 0.135);
  if (spec.armor) body.box(0.37, 0.32, 0.23, spec.armor, 0, 0.4, 0).box(0.4, 0.06, 0.25, C.stoneD, 0, 0.7, 0);
  if (spec.sash) body.box(0.06, 0.4, 0.22, t, 0.1, 0.36, 0, 0, 0, -0.5);
  body.sph(0.13, C.skin, 0, 0.87, 0).sph(0.05, C.skin, 0, 0.85, 0.12, 0.7, 0.7, 0.7);
  if (!spec.helmet) body.sph(0.135, spec.hair ?? C.hair, 0, 0.9, -0.02, 1, 0.75, 1);
  HELMETS[spec.helmet]?.(body, t, td);
  if (spec.hat === 'straw') {
    body.cylT(0.05, 0.1, 0.07, C.hay, 0, 0.99, 0, 8).cyl(0.22, 0.02, C.hay, 0, 0.98, 0)
      .box(0.02, 0.03, 0.3, t, 0, 1.0, 0, 0, 0, 0);
  }
  if (spec.quiver) body.cyl(0.05, 0.3, C.leather, -0.08, 0.42, -0.14, 0.3).box(0.02, 0.1, 0.02, C.hay, -0.08, 0.72, -0.18);
  if (spec.cape) body.box(0.3, 0.55, 0.03, spec.cape, 0, 0.2, -0.12, 0.08);
}

// A humanoid in five animated parts (body, legs, arms) from a HUMAN-style spec; s is its scale.
function limbs(spec, team) {
  const t = TEAM[team], td = TEAM_DARK[team], scale = spec.scale || 1;
  const body = new B(), legL = new B(), legR = new B(), armL = new B(spec.remap), armR = new B(spec.remap);
  humanBody(body, spec, t, td);
  const pants = spec.pants ?? C.leather;
  for (const leg of [legL, legR]) {
    leg.cylT(0.065, 0.045, 0.32, pants, 0, -0.32, 0, 8).box(0.11, 0.08, 0.17, C.dark, 0, -0.38, 0.025);
  }
  const sleeve = spec.sleeve ?? spec.tunic ?? t;
  for (const arm of [armL, armR]) {
    arm.cylT(0.065, 0.047, 0.17, sleeve, 0, -0.17, 0, 8).cylT(0.047, 0.035, 0.14, C.skin, 0, -0.3, 0, 8)
      .sph(0.045, C.skin, 0, -0.33, 0);
  }
  WEAPONS[spec.weapon]?.(armR);
  SHIELDS[spec.shield]?.(armL, t, td);
  if (spec.bow) {
    armL.add(unit.tor, C.wood, 0, -0.32, 0.12, 0.36, 0.36, 0.36, 0, 0, -HALF_TURN).box(0.008, 0.68, 0.008, C.hay, 0, -0.66, 0.12);
  }
  return {
    body: body.geometry(), legL: legL.geometry(), legR: legR.geometry(), armL: armL.geometry(), armR: armR.geometry(), s: scale,
  };
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
  machine_gunner: {
    scale: 1.04, helmet: 'steel', tunic: 0x5d6640, sleeve: 0x5d6640, pants: 0x4a5034, weapon: 'mg', sash: true,
  },
  king: { scale: 1.12, tunic: 0x7a2a8a, sleeve: 0x7a2a8a, pants: 0x4a1a5a, helmet: null, cape: 'team', weapon: null, sash: true },
};
// The villager's job tools, held in the right hand; animate() shows the one for the current job.
function villagerTools() {
  const toolGeometry = build => {
    const tool = new B();
    build(tool);
    return tool.geometry();
  };
  return {
    axe: toolGeometry(b => { b.cyl(0.02, 0.5, C.wood, 0, -0.42, 0.14, 1.3).box(0.03, 0.18, 0.14, C.iron, 0, -0.16, 0.42, 1.3); }),
    pick: toolGeometry(b => { b.cyl(0.02, 0.5, C.wood, 0, -0.42, 0.14, 1.3).box(0.32, 0.03, 0.03, C.iron, 0, -0.16, 0.42, 1.3); }),
    hammer: toolGeometry(b => {
      b.cyl(0.02, 0.36, C.wood, 0, -0.38, 0.1, 1.2).box(0.1, 0.08, 0.08, C.stoneD, 0, -0.15, 0.32, 1.2);
    }),
    basket: toolGeometry(b => {
      b.cylT(0.13, 0.09, 0.14, C.leather, 0, -0.5, 0.16, 8).sph(0.09, 0xc026d3, 0, -0.34, 0.16, 1, 0.6, 1);
    }),
  };
}
// A horse (the Knight's is barded): body with head, mane and tail, plus one leg shape for the four leg pivots.
function horse(team, barded = false) {
  const t = TEAM[team], body = new B(), leg = new B();
  if (barded) {
    body.box(0.6, 0.36, 1.02, t, 0, 0.42, -0.04).box(0.62, 0.05, 1.04, C.gold, 0, 0.42, -0.04)
      .box(0.14, 0.12, 0.3, C.iron, 0, 0.92, 0.66, 0.5);
  }
  const coat = 0x8a5a33, dark = 0x4a2f1a;
  body.sph(0.4, coat, 0, 0.61, 0, 0.56, 0.6, 1.28).box(0.36, 0.05, 0.4, t, 0, 0.78, -0.02)
    .box(0.26, 0.34, 0.16, coat, 0, 0.66, 0.42, -0.6);
  body.box(0.22, 0.24, 0.32, coat, 0, 0.9, 0.62, 0.5).box(0.1, 0.06, 0.1, dark, 0, 0.95, 0.78)
    .box(0.05, 0.16, 0.08, dark, 0, 0.98, 0.5, 0.2).box(0.03, 0.05, 0.03, dark, -0.06, 1.12, 0.6)
    .box(0.03, 0.05, 0.03, dark, 0.06, 1.12, 0.6);
  body.box(0.08, 0.4, 0.08, dark, 0, 0.36, -0.5, 0.5).sph(0.05, dark, 0, 0.22, -0.62);
  leg.box(0.1, 0.44, 0.1, coat, 0, -0.44, 0).box(0.11, 0.08, 0.12, dark, 0, -0.44, 0);
  return { body: body.geometry(), leg: leg.geometry() };
}
function catapult(team) {
  const t = TEAM[team], frame = new B(), arm = new B();
  frame.box(0.16, 0.14, 1.1, C.wood, -0.3, 0.2, 0).box(0.16, 0.14, 1.1, C.wood, 0.3, 0.2, 0)
    .box(0.7, 0.1, 0.12, C.woodD, 0, 0.3, 0.4).box(0.7, 0.1, 0.12, C.woodD, 0, 0.3, -0.4);
  frame.box(0.1, 0.5, 0.1, C.woodD, -0.3, 0.3, -0.05).box(0.1, 0.5, 0.1, C.woodD, 0.3, 0.3, -0.05)
    .box(0.7, 0.08, 0.08, C.woodD, 0, 0.75, -0.05).box(0.5, 0.05, 0.4, t, 0, 0.34, 0.1);
  for (const [x, z] of [[-0.42, 0.4], [0.42, 0.4], [-0.42, -0.4], [0.42, -0.4]]) {
    frame.add(unit.cyl, C.woodD, x, 0.2, z, 0.22, 0.06, 0.22, 0, 0, HALF_TURN)
      .add(unit.cyl, C.iron, x, 0.2, z, 0.06, 0.09, 0.06, 0, 0, HALF_TURN);
  }
  arm.box(0.08, 0.08, 1.0, C.wood, 0, 0, -0.1).box(0.2, 0.12, 0.2, C.woodD, 0, 0.0, 0.42).sph(0.09, C.stoneD, 0, 0.14, 0.42);
  return { base: frame.geometry(), arm: arm.geometry() };
}

// Medieval to Modern siege and armour: tall-armed Trebuchet, wheeled guns and the Tank.
function trebuchet(team) {
  const t = TEAM[team], frame = new B(), arm = new B();
  for (const x of [-0.32, 0.32]) {
    frame.box(0.14, 0.12, 1.2, C.wood, x, 0.12, 0).box(0.08, 1.08, 0.08, C.woodD, x, 0.2, -0.22, 0.3)
      .box(0.08, 1.08, 0.08, C.woodD, x, 0.2, 0.22, -0.3);
  }
  frame.box(0.76, 0.06, 0.06, C.woodD, 0, 1.12, 0).box(0.6, 0.06, 0.5, t, 0, 0.24, 0);
  for (const [x, z] of [[-0.42, 0.45], [0.42, 0.45], [-0.42, -0.45], [0.42, -0.45]]) {
    frame.add(unit.cyl, C.woodD, x, 0.2, z, 0.2, 0.06, 0.2, 0, 0, HALF_TURN);
  }
  arm.box(0.07, 0.07, 1.7, C.wood, 0, -0.035, 0.35).box(0.32, 0.3, 0.3, C.stoneD, 0, -0.42, -0.5)
    .cyl(0.01, 0.4, C.leather, 0, -0.4, 1.18).sph(0.08, C.stoneD, 0, -0.42, 1.18);
  return { base: frame.geometry(), arm: arm.geometry() };
}
// map: the era finish of a gun or tank built in an earlier era (era-units.js); the AI Future ones hover.
function cannon(team, kind, map = null, hover = false) {
  const t = TEAM[team], artillery = kind === 'artillery', carriage = new B(map), barrel = new B(map);
  const metal = artillery ? 0x4a5034 : C.bronze;
  carriage.box(0.36, 0.14, 0.62, artillery ? 0x55603a : C.wood, 0, 0.26, -0.05)
    .box(0.12, 0.08, 0.8, artillery ? 0x4a5034 : C.woodD, 0, 0.12, -0.55, -0.25).box(0.38, 0.06, 0.2, t, 0, 0.4, -0.2);
  if (hover) pads(carriage, [-0.24, 0.24], [-0.05]);
  else for (const x of [-0.3, 0.3]) {
    carriage.add(unit.cyl, artillery ? 0x2f3437 : C.woodD, x, 0.28, 0, 0.28, 0.06, 0.28, 0, 0, HALF_TURN)
      .add(unit.cyl, C.iron, x, 0.28, 0, 0.06, 0.09, 0.06, 0, 0, HALF_TURN);
    if (artillery) for (let spoke = 0; spoke < 4; spoke++) {
      carriage.box(0.03, 0.5, 0.04, C.iron, x * 1.02, 0.03, 0, spoke * Math.PI / 4, 0, 0);
    }
  }
  if (artillery) carriage.box(0.66, 0.42, 0.04, 0x55603a, 0, 0.32, 0.22).box(0.68, 0.04, 0.05, t, 0, 0.7, 0.22);
  const bore = artillery ? 0.06 : 0.09;
  barrel.add(unit.cyl, metal, 0, 0, 0.2, bore, artillery ? 1.0 : 0.8, bore, HALF_TURN, 0, 0)
    .add(unit.cyl, metal, 0, 0, -0.2, 0.12, 0.18, 0.12, HALF_TURN, 0, 0);
  return { base: carriage.geometry(), barrel: barrel.geometry() };
}
function tank(team, map = null, hover = false) {
  const t = TEAM[team], hull = new B(map), turret = new B(map), olive = 0x5d6640, dark = 0x2f3437;
  if (hover) pads(hull, [-0.38, 0.38], [-0.38, 0.38], 0.04);
  else for (const x of [-0.44, 0.44]) { // tracks with their road wheels
    hull.box(0.22, 0.3, 1.36, dark, x, 0.04, 0);
    for (let z = -0.5; z <= 0.5; z += 0.25) hull.add(unit.cyl, 0x4a4f52, x * 1.02, 0.17, z, 0.12, 0.24, 0.12, 0, 0, HALF_TURN);
  }
  hull.box(0.7, 0.3, 1.26, olive, 0, 0.18, 0).box(0.72, 0.06, 0.32, t, 0, 0.48, -0.38)
    .box(0.66, 0.08, 0.2, 0x4a5034, 0, 0.36, 0.62, -0.5);
  turret.box(0.5, 0.22, 0.56, olive, 0, 0, -0.04).add(unit.cyl, 0x3a3f33, 0, 0.11, 0.6, 0.045, 0.8, 0.045, HALF_TURN, 0, 0)
    .cyl(0.09, 0.06, 0x4a5034, 0.1, 0.22, -0.12).box(0.18, 0.05, 0.05, t, -0.14, 0.23, -0.24);
  return { hull: hull.geometry(), turret: turret.geometry() };
}

// A base with an aimed part on a pivot (a barrel or a throwing arm), tilted, the whole model scaled.
function aimedModel(base, aimed, tilt, scale) {
  const root = new THREE.Group();
  aimed.rotation.x = tilt;
  root.add(mesh(base), aimed);
  root.scale.setScalar(scale);
  return root;
}
// A hull with a turret pivot on it (the Tank and the Armored Train).
function turretModel(parts, turretAt) {
  const root = new THREE.Group(), hull = new THREE.Group();
  hull.add(mesh(parts.hull));
  const turret = pivot(...turretAt, parts.turret);
  hull.add(turret);
  root.add(hull);
  root.scale.setScalar(1.1);
  return { root, hull, turret };
}
function eraSiegeModel(e, era) {
  const team = e.owner, native = era === unitEra(e.type);
  const map = native ? null : SIEGE_REMAP[era] ?? null, hover = !native && era === 'future';
  const look = siegeLook(e.type, era);
  if (look === 'mortar' || look === 'rockets') {
    const parts = cached(`${look}:${team}:${era}`, () => (look === 'mortar' ? mortar : rockets)(team, era));
    const barrel = pivot(...parts.at, parts.barrel);
    const root = aimedModel(parts.base, barrel, look === 'mortar' ? -0.85 : -0.4, 1.1);
    return { root, anim: { type: 'gun', barrel, z: parts.at[2] }, shadow: 0.6 };
  }
  if (look === 'catapult') {
    const parts = cached('cat' + team, () => catapult(team)), arm = pivot(0, 0.5, -0.05, parts.arm);
    return { root: aimedModel(parts.base, arm, -0.5, 1.15), anim: { type: 'cat', arm }, shadow: 0.6 };
  }
  if (e.type === 'tank') {
    const parts = cached(`tank${team}:${map ? era : ''}`, () => tank(team, map, hover));
    const { root, hull, turret } = turretModel(parts, [0, 0.5, 0]);
    return { root, anim: { type: 'tank', hull, turret }, shadow: 0.75 };
  }
  if (e.type === 'armored_train') {
    const parts = cached(`train:${team}:${era}`, () => armoredTrain(team, era));
    const { root, hull, turret } = turretModel(parts, parts.at);
    return { root, anim: { type: 'tank', hull, turret }, shadow: 0.85 };
  }
  if (e.type === 'trebuchet') {
    const parts = cached('treb' + team, () => trebuchet(team)), arm = pivot(0, 1.12, 0, parts.arm);
    return { root: aimedModel(parts.base, arm, -0.6, 1.15), anim: { type: 'treb', arm }, shadow: 0.7 };
  }
  const kind = e.type === 'field_artillery' ? 'artillery' : 'cannon';
  const parts = cached(`gun:${kind}:${team}:${map ? era : ''}`, () => cannon(team, kind, map, hover));
  const barrel = pivot(0, 0.48, 0.05, parts.barrel);
  return { root: aimedModel(parts.base, barrel, -0.12, 1.1), anim: { type: 'gun', barrel }, shadow: 0.6 };
}

// The cavalry mount under the rider, filling in anim (type, legs / wheels / ride) for animate().
const HORSE_LEGS = [[-0.11, 0.42, 0.3], [0.11, 0.42, 0.3], [-0.11, 0.42, -0.3], [0.11, 0.42, -0.3]];
function mountModel(mount, team, barded, ride, anim) {
  const mountGroup = new THREE.Group();
  const attach = joint => { mountGroup.add(joint); return joint; };
  if (mount === 'horse') {
    const horseParts = cached((barded ? 'horse:barded' : 'horse') + team, () => horse(team, barded));
    mountGroup.add(mesh(horseParts.body));
    anim.type = 'horse';
    anim.legs = HORSE_LEGS.map(([x, y, z]) => attach(pivot(x, y, z, horseParts.leg)));
  } else if (mount === 'bike') {
    const bikeParts = cached(`bike:${barded}:${team}`, () => motorbike(team, barded));
    mountGroup.add(mesh(bikeParts.body));
    anim.type = 'bike';
    anim.wheels = [0.42, -0.42].map(z => attach(pivot(0, 0.2, z, bikeParts.wheel)));
  } else {
    const hoverParts = cached(`hoverbike:${barded}:${team}`, () => hoverbike(team, barded));
    mountGroup.add(mesh(hoverParts.body));
    anim.type = 'hoverbike';
    anim.ride = ride;
  }
  return mountGroup;
}
// Cavalry: a mount (horse, motorbike or hoverbike by era) carrying a rider with animated arms.
function cavalryModel(e, team, era) {
  const root = new THREE.Group(), anim = { type: 'human' };
  const barded = e.type === 'knight', mount = mountOf(era), ride = new THREE.Group();
  const mountGroup = mountModel(mount, team, barded, ride, anim);
  anim.mount = mount;
  const rider = new THREE.Group();
  rider.position.y = { horse: 0.72, bike: 0.36, hover: 0.5 }[mount];
  rider.scale.setScalar(0.9);
  const base = barded
    ? { tunic: TEAM[team], weapon: 'spear', helmet: 'great', armor: C.iron, shield: 'rect' }
    : { tunic: TEAM[team], bow: e.type === 'horse_archer', weapon: e.type === 'scout' ? 'spear' : null, helmet: 'leather' };
  const riderSpec = eraSpec(e.type, base, era);
  const riderParts = cached(`rider:${e.type}:${team}:${era}`, () => limbs(riderSpec, team));
  rider.add(mesh(riderParts.body));
  anim.armR = pivot(0.22, 0.7, 0, riderParts.armR);
  anim.armL = pivot(-0.22, 0.7, 0, riderParts.armL);
  rider.add(anim.armR, anim.armL);
  ride.add(mountGroup, rider);
  root.add(ride);
  root.scale.setScalar(1.1);
  return { root, anim, shadow: 0.55 };
}
// The villager's hidden tools (in the right hand) and carry sack, shown by animate() per job.
function addVillagerGear(inner, anim) {
  const tools = cached('vtools', villagerTools);
  anim.tools = {};
  for (const [name, geometry] of Object.entries(tools)) {
    const tool = mesh(geometry);
    tool.visible = false;
    anim.armR.add(tool);
    anim.tools[name] = tool;
  }
  const sack = new B().box(0.22, 0.26, 0.14, C.cloth, 0, 0.36, -0.2).sph(0.08, C.cloth, 0, 0.66, -0.2);
  anim.sack = mesh(cached('sack', () => sack.geometry()));
  anim.sack.visible = false;
  inner.add(anim.sack);
}
const kingCrown = () => {
  const crown = new B().cyl(0.145, 0.07, C.gold, 0, 0.96, 0);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 0.4;
    crown.cone(0.035, 0.1, C.gold, Math.cos(angle) * 0.12, 1.03, Math.sin(angle) * 0.12, 4);
  }
  return crown.geometry();
};
// A soldier, villager or the King on foot: the body plus leg and arm pivots.
function footModel(e, team, era) {
  const spec = eraSpec(e.type, { ...(HUMAN[e.type] || {}) }, era);
  if (spec.cape === 'team') spec.cape = TEAM_DARK[team];
  const parts = cached(`h:${e.type}:${team}:${era}`, () => limbs(spec, team));
  const root = new THREE.Group(), inner = new THREE.Group(), anim = { type: 'human' };
  inner.scale.setScalar(parts.s);
  root.add(inner);
  inner.add(mesh(parts.body));
  anim.legL = pivot(-0.09, 0.38, 0, parts.legL);
  anim.legR = pivot(0.09, 0.38, 0, parts.legR);
  anim.armL = pivot(-0.22, 0.7, 0, parts.armL);
  anim.armR = pivot(0.22, 0.7, 0, parts.armR);
  inner.add(anim.legL, anim.legR, anim.armL, anim.armR);
  if (e.type === 'villager') addVillagerGear(inner, anim);
  if (e.type === 'king') inner.add(mesh(cached('crown', kingCrown)));
  return { root, anim, shadow: 0.32 };
}

// age: the owner's era. A unit from an earlier era is drawn in this one (era-units.js); without it, its own era.
function unitModel(e, age) {
  const team = e.owner, era = unitEra(e.type, age);
  if (['drone', 'mech', 'railgun'].includes(e.type)) return futureModel(e);
  if (SHIP_TYPES.includes(e.type)) return shipModel(e);
  if (e.cls === 'siege' || e.cls === 'armor') return eraSiegeModel(e, era);
  if (e.cls === 'cav') return cavalryModel(e, team, era);
  return footModel(e, team, era);
}

// The game's fictional fifth age has its own silhouettes, not ancient-unit fallbacks.
const SHELL = 0x697678, SHELL_DARK = 0x303a3c, CYAN_GLASS = 0x8ddbe7;
// The Combat Drone: a pod on four arms; `moving` is one crossed rotor, placed four times.
function droneParts(body, moving, t) {
  body.sph(0.3, SHELL, 0, 0, 0, 1, 0.48, 1.2).box(0.22, 0.06, 0.3, t, 0, 0.12, 0)
    .sph(0.075, CYAN_GLASS, 0, -0.025, 0.32);
  for (const x of [-0.4, 0.4]) for (const z of [-0.35, 0.35]) {
    body.box(0.5, 0.045, 0.065, SHELL_DARK, x * 0.55, 0, z).cyl(0.1, 0.12, SHELL, x, 0, z);
  }
  moving.box(0.48, 0.025, 0.045, SHELL_DARK).box(0.045, 0.025, 0.48, SHELL_DARK);
}
// The Mech: torso, cockpit and shoulders; `moving` is one leg, placed twice.
function mechParts(body, moving, t) {
  body.box(0.55, 0.5, 0.38, SHELL, 0, 0.55, 0).box(0.4, 0.22, 0.1, t, 0, 0.72, 0.23)
    .box(0.3, 0.2, 0.25, SHELL_DARK, 0, 1.08, 0).box(0.23, 0.055, 0.04, CYAN_GLASS, 0, 1.17, 0.14);
  for (const x of [-0.38, 0.38]) {
    body.sph(0.15, t, x, 0.98, 0).box(0.14, 0.38, 0.18, SHELL, x, 0.53, 0)
      .box(0.18, 0.16, 0.22, SHELL_DARK, x, 0.4, 0.03);
  }
  moving.cyl(0.1, 0.36, SHELL_DARK, 0, -0.36, 0).box(0.18, 0.26, 0.18, SHELL, 0, -0.38, 0)
    .box(0.23, 0.1, 0.34, SHELL_DARK, 0, -0.55, 0.055);
}
// The Railgun: a tracked hull; `moving` is the twin-rail barrel, which recoils.
function railgunParts(body, moving, t) {
  body.box(0.68, 0.3, 1.05, SHELL, 0, 0.15, 0).box(0.52, 0.1, 0.75, t, 0, 0.45, 0);
  for (const x of [-0.4, 0.4]) {
    body.box(0.2, 0.3, 1.2, SHELL_DARK, x, 0.05, 0);
    for (let z = -0.5; z <= 0.5; z += 0.16) body.box(0.23, 0.04, 0.065, SHELL, x, 0.35, z);
  }
  body.cyl(0.24, 0.16, SHELL_DARK, 0, 0.55, 0);
  moving.box(0.32, 0.24, 0.5, SHELL, 0, 0, 0);
  for (const x of [-0.12, 0.12]) {
    moving.box(0.06, 0.08, 1.05, SHELL, x, 0.09, 0.6).box(0.025, 0.035, 0.9, CYAN_GLASS, x, 0.17, 0.62);
  }
}
const FUTURE_PARTS = { drone: droneParts, mech: mechParts, railgun: railgunParts };
function futureModel(e) {
  const root = new THREE.Group();
  const parts = cached(`future:${e.type}:${e.owner}`, () => {
    const body = new B(), moving = new B();
    FUTURE_PARTS[e.type](body, moving, TEAM[e.owner]);
    return { body: body.geometry(), moving: moving.geometry() };
  });
  const body = new THREE.Group();
  body.add(mesh(parts.body));
  root.add(body);
  const anim = { type: e.type, body };
  if (e.type === 'drone') {
    body.position.y = 1.1;
    anim.rotors = [];
    for (const x of [-0.4, 0.4]) for (const z of [-0.35, 0.35]) {
      const rotor = pivot(x, 0.13, z, parts.moving);
      body.add(rotor);
      anim.rotors.push(rotor);
    }
  } else if (e.type === 'mech') {
    anim.legs = [-0.18, 0.18].map(x => {
      const leg = pivot(x, 0.55, 0, parts.moving);
      root.add(leg);
      return leg;
    });
  } else {
    anim.barrel = pivot(0, 0.68, 0, parts.moving);
    body.add(anim.barrel);
  }
  return { root, anim, shadow: e.type === 'railgun' ? 0.7 : 0.45 };
}

// ---------- buildings ----------
// Geometry comes from the arch registry (arch/index.js) and is cached per design key, so eras that show the same
// design share it. buildingStyle is the legacy palette key, still used by the buildings gallery.
export const buildingStyle = age => styleOf(age).key;
// Static extras outside the body (they don't grow with construction): mast, scaffold, crops and the flag pivot.
function addBuildingExtras(root, anim, geos) {
  const { extra } = geos;
  if (geos.mast) { anim.mast = mesh(geos.mast); root.add(anim.mast); } // flagpoles, antennas, spire tips: outside the body's height
  if (extra.scaffold) { anim.scaffold = mesh(extra.scaffold); root.add(anim.scaffold); }
  if (extra.crops) { anim.crops = mesh(extra.crops); root.add(anim.crops); }
  if (extra.flag) { anim.flag = pivot(...extra.flagAt, extra.flag); root.add(anim.flag); }
}
// Animated parts (gears, rings, floating plates, smoke puffs, a tower's shot), each on its own pivot; animate() moves them.
function addMovingParts(root, anim, extra, part) {
  for (const spec of extra.spinners ?? []) {
    (anim.spinners ??= []).push({ p: part(spec), axis: spec.axis ?? 'y', speed: spec.speed ?? 1 });
  }
  for (const spec of extra.floaters ?? []) {
    (anim.floaters ??= []).push({
      p: part(spec), y: spec.at[1], amp: spec.amp ?? 0.08, speed: spec.speed ?? 1.6, phase: spec.phase ?? 0,
    });
  }
  for (const spec of extra.smoke ?? []) (anim.smoke ??= []).push({ p: part(spec), y: spec.at[1], phase: spec.phase ?? 0 });
  // A tower's shot (muzzle flash, loosed bolt, laser): a pivot that animate() shows just after each shot.
  if (extra.fire) { anim.fire = part(extra.fire); anim.fire.visible = false; }
}
// A Mine's winding wheel and ore cart, which move only while villagers dig, and the ore pile of the patch's kind.
function addMineParts(root, anim, extra, part, gatherType) {
  if (extra.wheel) anim.wheel = { p: part(extra.wheel), axis: extra.wheel.axis, speed: extra.wheel.speed ?? 2 };
  if (extra.cart) anim.cart = { p: pivot(...extra.cart.from, extra.cart.geo), from: extra.cart.from, to: extra.cart.to };
  if (anim.cart) root.add(anim.cart.p);
  if (extra.ore) {
    const ore = extra.ore;
    anim.ore = pivot(...ore.at, ore[gatherType] ?? ore.gold);
    root.add(anim.ore);
  }
  if (anim.wheel || anim.cart) anim.dig = { phase: 0, last: null };
}
function buildingModel(e, age = 'stone') {
  const root = new THREE.Group();
  const geos = cached(`b:${e.type}:${e.owner}:${designOf(e.type, age).key}`, () => archGeos(e.type, e.owner, e.size, age));
  const body = new THREE.Group();
  body.add(mesh(geos.body));
  root.add(body);
  const anim = { type: 'building', body };
  addBuildingExtras(root, anim, geos);
  const part = spec => {
    const joint = pivot(...spec.at, spec.geo);
    root.add(joint);
    return joint;
  };
  addMovingParts(root, anim, geos.extra, part);
  addMineParts(root, anim, geos.extra, part, e.gatherType);
  return { root, anim, shadow: e.size * 0.62, boxShadow: true };
}

// ---------- nature ----------
// A pine: five stacked cones, each ringed with tufts.
function pineCrown(b, height) {
  for (let tier = 0; tier < 5; tier++) {
    const radius = 0.65 - tier * 0.105, y = height * 0.25 + tier * 0.29;
    b.cone(radius, 0.65, [0x384f2c, 0x455e31, 0x536c36][tier % 3], 0, y, 0, 9, tier * 0.7);
    for (let j = 0; j < 5; j++) {
      const angle = j * 1.256 + tier;
      b.foliage(radius * 0.43, 0x496138, Math.cos(angle) * radius * 0.56, y + 0.03, Math.sin(angle) * radius * 0.56, 1, 0.5, 1, angle);
    }
  }
}
const LEAF_COLORS = [0x526c32, 0x637c3b, 0x465e2c, 0x768448];
// A broadleaf: seven branches, each ending in three random leaf clumps, and a clump on top.
function broadleafCrown(b, height, random) {
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4, radius = 0.28 + random() * 0.2, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const y = height * 0.52 + random() * 0.45;
    b.cylT(0.025, 0.075, 0.65, 0x685038, x * 0.5, y - 0.45, z * 0.5, 7, Math.sin(angle) * 0.6, 0, -Math.cos(angle) * 0.6);
    for (let j = 0; j < 3; j++) {
      // Arguments are evaluated left to right, so the random draws keep their order.
      b.foliage(0.28 + random() * 0.15, LEAF_COLORS[(i + j) % 4],
        x + (random() - 0.5) * 0.35, y + random() * 0.27, z + (random() - 0.5) * 0.35, 1, 0.8, 1, random() * 6);
    }
  }
  b.foliage(0.42, 0x687d3c, 0, height * 0.86, 0, 1, 0.7, 1);
}
function tree(variant) {
  const random = rng(variant + 11), b = new B(), pine = variant % 3 === 0, height = 1.5 + random() * 0.7;
  b.cylT(0.065, 0.15, height * 0.75, 0x685038, 0, 0, 0, 8);
  for (let i = 0; i < 5; i++) { // roots
    const angle = i * Math.PI * 0.4;
    b.cylT(0.035, 0.09, 0.38, C.woodD, Math.sin(angle) * 0.09, 0.02, Math.cos(angle) * 0.09, 6,
      Math.sin(angle) * 0.7, 0, Math.cos(angle) * 0.7);
  }
  if (pine) pineCrown(b, height);
  else broadleafCrown(b, height, random);
  return b.geometry();
}
function rockPile(kind, variant) {
  const gold = kind === 'gold', random = rng(variant + (gold ? 77 : 33)), b = new B();
  const base = gold ? 0x8a8478 : 0x9ca3af, dark = gold ? 0x6f6a60 : 0x6b7280;
  b.rock(0.42, base, 0, 0, 0, 1.1, 0.75, 0.95, random() * 3).rock(0.28, dark, 0.32, 0, 0.12, 1, 0.8, 1, random() * 3)
    .rock(0.22, base, -0.3, 0, 0.18, 1, 0.9, 1, random() * 3);
  if (gold) for (let i = 0; i < 5; i++) { // nuggets
    b.rock(0.11 + random() * 0.06, [C.gold, 0xffd84a, 0xe0a81a][i % 3],
      (random() - 0.5) * 0.6, 0.28 + random() * 0.15, (random() - 0.5) * 0.5, 1, 1, 1, random() * 3);
  }
  else b.rock(0.2, 0xb8bec6, 0.05, 0.3, -0.05, 1, 0.8, 1, random() * 3);
  return b.geometry();
}
function berry(variant) {
  const random = rng(variant + 5), b = new B();
  for (let i = 0; i < 8; i++) { // leafy mounds
    b.rock(0.21, [0x4c6534, 0x647c3f, 0x3d562e][i % 3],
      (random() - 0.5) * 0.55, 0.1 + random() * 0.16, (random() - 0.5) * 0.55, 1, 0.85, 1, random() * 6);
  }
  for (let i = 0; i < 12; i++) {
    b.sph(0.035, i % 3 ? 0x8f2630 : 0xb94036, (random() - 0.5) * 0.6, 0.25 + random() * 0.2, (random() - 0.5) * 0.6);
  }
  return b.geometry();
}
// A shoal: silver fish with dark backs just under the surface, a few bubbles, and one leaping.
function fishShoal(variant) {
  const random = rng(variant + 91), b = new B();
  for (let i = 0; i < 7; i++) {
    const heading = i * 0.9 + random() * 0.6, distance = 0.1 + random() * 0.24;
    const x = Math.cos(heading) * distance, z = Math.sin(heading) * distance, color = i % 2 ? 0xc4d2da : 0xa9bcc7;
    b.add(unit.sph, color, x, 0.05, z, 0.06, 0.035, 0.15, 0, heading, 0)
      .add(unit.sph, 0x41545e, x, 0.075, z, 0.03, 0.015, 0.11, 0, heading, 0)
      .add(unit.box, color, x - Math.sin(heading) * 0.16, 0.05, z - Math.cos(heading) * 0.16, 0.08, 0.05, 0.02, 0, heading, 0);
  }
  for (let i = 0; i < 4; i++) b.sph(0.025, 0xe8f4f6, (random() - 0.5) * 0.5, 0.05, (random() - 0.5) * 0.5);
  return b.add(unit.sph, 0xd4e0e6, 0.05, 0.3, -0.05, 0.06, 0.04, 0.15, -0.6, 0.4, 0)
    .add(unit.sph, 0xe8f4f6, 0.12, 0.05, 0.05, 0.08, 0.02, 0.08);
}
function resourceGeometry(type, variant) {
  if (type === 'tree') return tree(variant);
  if (type === 'berry') return berry(variant);
  if (type === 'fish') return fishShoal(variant).geometry();
  return rockPile(type, variant);
}
// One of six shape variants per resource type, turned and sized at random (seeded by the entity id).
function resourceModel(e) {
  const variant = e.id % 6, root = new THREE.Group(), random = rng(e.id);
  const geometry = cached(`r:${e.type}:${variant}`, () => resourceGeometry(e.type, variant));
  const model = mesh(geometry);
  model.rotation.y = random() * 6.28;
  model.userData.baseScale = 0.9 + random() * 0.25;
  root.add(model);
  if (e.type === 'tree') model.rotation.z = (random() - 0.5) * 0.08;
  const shadow = e.type === 'tree' ? 0.5 : e.type === 'fish' ? 0.1 : 0.4;
  return { root, anim: { type: 'res', mesh: model }, shadow };
}
const relicGeometry = () => {
  const b = new B();
  b.cylT(0.2, 0.26, 0.2, C.stone, 0, 0, 0, 8).cylT(0.05, 0.08, 0.2, C.gold, 0, 0.2, 0, 8)
    .cylT(0.16, 0.06, 0.2, C.gold, 0, 0.4, 0, 10).add(unit.tor, C.gold, 0.16, 0.5, 0, 0.09, 0.09, 0.09, 0, 0, 0)
    .sph(0.06, 0xd6336c, 0, 0.64, 0);
  return b.geometry();
};
function relicModel() {
  const root = new THREE.Group(), geometry = cached('relic', relicGeometry);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe27a, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), glowMaterial);
  glow.position.y = 0.5;
  glow.raycast = () => {};
  const body = mesh(geometry);
  root.add(body, glow);
  return { root, anim: { type: 'relic', glow, body }, shadow: 0.3 };
}

// age: the owner's era (buildings default to Stone; units to their own era).
export function buildModel(e, age) {
  if (e.kind === 'unit') return unitModel(e, age);
  if (e.kind === 'building') return buildingModel(e, age ?? 'stone');
  if (e.kind === 'resource') return resourceModel(e);
  return relicModel();
}

// ---------- per-frame animation ----------
// Legs, mount and arms of people and riders: walk cycle, attack swing, work swing, the villager's tool and sack.
function animateHumanoid(a, e, t, moving) {
  const stride = moving ? Math.sin(t * (a.mount ? 14 : 11) + e.id) : 0;
  if (a.type === 'human') { a.legL.rotation.x = stride * 0.7; a.legR.rotation.x = -stride * 0.7; }
  else if (a.type === 'horse') for (let i = 0; i < 4; i++) a.legs[i].rotation.x = (i % 3 === 0 ? stride : -stride) * 0.8;
  else if (a.type === 'bike') { if (moving) for (const wheel of a.wheels) wheel.rotation.x = t * 16; }
  else { a.ride.position.y = 0.05 + Math.sin(t * 3 + e.id) * 0.04; a.ride.rotation.x = moving ? 0.08 : 0; }
  const order = e.order, attacking = order.type === 'attack' && e.cd > e.cooldown - 8;
  const working = order.type === 'gather' && order.phase === 'work' || (order.type === 'build' || order.type === 'repair') && !moving;
  if (a.armL) a.armL.rotation.x = moving ? -stride * 0.6 : 0.05 * Math.sin(t * 2 + e.id);
  if (a.armR) {
    if (attacking) a.armR.rotation.x = -1.7 + (e.cd - (e.cooldown - 8)) * -0.2;
    else if (working) a.armR.rotation.x = -0.6 + Math.sin(t * 10 + e.id) * 0.9;
    else a.armR.rotation.x = moving ? stride * 0.6 : 0;
  }
  if (a.tools) showVillagerTool(a, e, order);
}
// The villager's tool follows the job; the sack shows while carrying from a gather.
function showVillagerTool(a, e, order) {
  let tool = null;
  if (order.type === 'build' || order.type === 'repair') tool = 'hammer';
  else if (order.type === 'gather') tool = order.kind === 'wood' ? 'axe' : order.kind === 'food' ? 'basket' : 'pick';
  for (const [name, toolMesh] of Object.entries(a.tools)) toolMesh.visible = name === tool;
  if (a.sack) a.sack.visible = e.carry.amount > 0.5 && order.type === 'gather';
}
// Siege, guns and armour: throwing arms and barrels recoil just after a shot; the tank hull rocks while driving.
function animateSiege(a, e, t, moving) {
  if (a.type === 'cat') {
    const swing = Math.max(0, (e.cd - (e.cooldown - 14)) / 14);
    a.arm.rotation.x = e.order.type === 'attack' && swing > 0 ? 1.1 - swing * 1.6 : -0.5;
  } else if (a.type === 'treb') {
    const swing = Math.max(0, (e.cd - (e.cooldown - 16)) / 16);
    a.arm.rotation.x = e.order.type === 'attack' && swing > 0 ? 1.5 - swing * 2.3 : -0.6;
  } else if (a.type === 'gun') {
    a.barrel.position.z = (a.z ?? 0.05) - (e.order.type === 'attack' ? Math.max(0, (e.cd - e.cooldown + 10) / 10) * 0.14 : 0);
  } else {
    a.turret.position.z = e.order.type === 'attack' ? -Math.max(0, (e.cd - e.cooldown + 8) / 8) * 0.1 : 0;
    a.hull.position.y = moving ? Math.abs(Math.sin(t * 12 + e.id)) * 0.02 : 0;
  }
}
// AI Future units. gpuCosmetics: in a match the GPU bobs the drone and spins its rotors.
function animateFuture(g, a, e, t, moving) {
  if (a.type === 'drone') {
    a.body.position.y = 1.1 + (g.userData.gpuCosmetics ? 0 : Math.sin(t * 3 + e.id) * 0.055);
    a.body.rotation.x = moving ? 0.12 : 0;
    if (!g.userData.gpuCosmetics) a.rotors.forEach((rotor, i) => { rotor.rotation.y = t * (i % 2 ? 35 : -35); });
  } else if (a.type === 'mech') {
    const stride = moving ? Math.sin(t * 8 + e.id) * 0.5 : 0;
    a.legs[0].rotation.x = stride;
    a.legs[1].rotation.x = -stride;
    a.body.position.y = moving ? Math.abs(Math.sin(t * 8 + e.id)) * 0.035 : 0;
  } else {
    a.barrel.position.z = e.order.type === 'attack' ? -Math.max(0, (e.cd - e.cooldown + 10) / 10) * 0.16 : 0;
  }
}
// Spinners, floaters and smoke show only on a finished building; on the CPU they also move (outside a match).
function animateBuildingParts(a, e, t, cpu) {
  for (const spinner of a.spinners ?? []) {
    spinner.p.visible = e.constructed;
    if (cpu) spinner.p.rotation[spinner.axis] = t * spinner.speed;
  }
  for (const floater of a.floaters ?? []) {
    floater.p.visible = e.constructed;
    if (cpu) floater.p.position.y = floater.y + Math.sin(t * floater.speed + floater.phase) * floater.amp;
  }
  for (const puff of a.smoke ?? []) {
    const rise = (t * 0.35 + puff.phase) % 1;
    puff.p.visible = e.constructed;
    if (cpu) { puff.p.position.y = puff.y + rise * 0.9; puff.p.scale.setScalar(0.5 + rise * 0.9); }
  }
}
// The Mine's work clock runs only while it is dug, so the wheel and cart stop where they are between trips.
function animateMine(a, e, t) {
  const dig = a.dig;
  if (e.constructed && e.digging > 0 && dig.last !== null) dig.phase += Math.max(0, t - dig.last);
  dig.last = t;
  if (a.wheel) { a.wheel.p.visible = !!e.constructed; a.wheel.p.rotation[a.wheel.axis] = -dig.phase * a.wheel.speed; }
  if (a.cart) {
    const { p, from, to } = a.cart, along = 0.5 - 0.5 * Math.cos(dig.phase * 1.6);
    p.visible = !!e.constructed;
    p.position.set(...from.map((v, i) => v + (to[i] - v) * along));
  }
}
function animateBuilding(g, a, e, t) {
  const cpu = !g.userData.gpuCosmetics;
  a.body.scale.y = e.constructed ? 1 : 0.15 + 0.85 * e.progress;
  if (a.scaffold) a.scaffold.visible = !e.constructed;
  if (a.crops) { a.crops.visible = e.constructed; a.crops.scale.y = 0.35 + 0.65 * Math.min(1, e.amount / (e.maxAmount || 400)); }
  if (a.flag && cpu) a.flag.rotation.y = Math.sin(t * 3) * 0.35;
  // The mast, every flag and the animated parts only show on a finished building.
  if (a.mast) a.mast.visible = e.constructed;
  if (a.flag) a.flag.visible = e.constructed;
  animateBuildingParts(a, e, t, cpu);
  // The sim sets a tower's cd to its cooldown on a shot and counts it down each tick: the shot shows for 6 ticks
  // (0.3 s), so even the Industrial tower's 12-tick burst blinks. No cooldown (the gallery's entities): never.
  if (a.fire) a.fire.visible = !!e.constructed && e.cooldown > 0 && e.cd > e.cooldown - 6;
  if (a.dig) animateMine(a, e, t);
  if (a.ore) a.ore.visible = !!e.constructed;
}
// A resource shrinks as it is used up (a tree loses height too; piles and bushes flatten less).
const RESOURCE_FULL = { tree: 100, berry: 200, gold: 800, stone: 600, fish: 300 };
function animateResource(a, e) {
  const full = RESOURCE_FULL[e.type] ?? 600, size = 0.55 + 0.45 * Math.min(1, e.amount / full);
  const scale = a.mesh.userData.baseScale;
  a.mesh.scale.set(scale * size, scale * (e.type === 'tree' ? size : 0.6 + 0.4 * size), scale * size);
}

// per-frame animation of a model's moving parts
export function animate(g, e, t, moving) {
  const a = g.userData.anim;
  if (!a) return;
  const type = a.type;
  if (type === 'human' || a.mount) animateHumanoid(a, e, t, moving);
  else if (type === 'cat' || type === 'treb' || type === 'gun' || type === 'tank') animateSiege(a, e, t, moving);
  else if (type === 'ship') animateShip(g, a, e, t, moving);
  else if (type === 'drone' || type === 'mech' || type === 'railgun') animateFuture(g, a, e, t, moving);
  else if (type === 'building') animateBuilding(g, a, e, t);
  else if (type === 'res') animateResource(a, e);
  else if (type === 'relic') { a.body.rotation.y = t * 1.5; a.glow.scale.setScalar(1 + Math.sin(t * 3) * 0.15); }
}
