// Era looks for units trained in an earlier era than their owner's current one. A unit keeps what tells it apart (its
// weapon family, shield, scale, mount or chassis role) but takes the owner's era uniform, weapon finish, mount and
// siege chassis: a Scout in the AI Future rides a hoverbike, a Catapult in the Age of Sail is a mortar. Villagers and
// ships follow their owner; only the King keeps one look. unitEra and eraSpec are pure data; geometry uses builder.js.
import { UNITS } from '../data/units.js';
import { AGES, ageIndex } from '../data/ages.js';
import { B, C, TEAM, unit } from './builder.js';

const CHROME = 0xd8e2e8, DARK = 0x26343c, NEON = 0x39f3ff, SHELL = 0x697678;
const OLIVE = 0x5d6640, OLIVE_D = 0x4a5034, ARMY = 0x55603a, GUNMETAL = 0x3a3f44, POLY = 0x2f3437, MAIL = 0x8d949b;
const HALF_TURN = Math.PI / 2;
const remap = pairs => new Map(pairs);

// The era a unit is drawn in: its owner's era once that is past the unit's own, else the unit's own era.
export function unitEra(type, age) {
  const spec = UNITS[type], native = spec?.age ?? 'stone';
  if (!spec || type === 'king' || !AGES.includes(age)) return native;
  return ageIndex(age) > ageIndex(native) ? age : native;
}

// Weapon and shield finish (only the arm parts are recoloured, never skin or uniform): polymer and gunmetal in the
// Modern Age, chrome with neon edges in the AI Future.
const ARMS = {
  modern: remap([[C.wood, POLY], [C.woodD, DARK], [C.gold, GUNMETAL], [C.bronze, GUNMETAL]]),
  future: remap([[C.wood, CHROME], [C.woodD, DARK], [C.iron, NEON], [C.gold, NEON], [C.bronze, CHROME], [C.hay, NEON],
    [C.stoneD, NEON], [GUNMETAL, CHROME], [POLY, CHROME], [ARMY, DARK]]),
};

// The era's helmet and uniform over a copy of the spec (`look`). A tunic/sleeve left undefined falls back to the team
// colour: a coat in the team's colour.
function dressForEra(look, base, era) {
  if (era === 'tool') look.helmet = base.helmet ?? 'leather';
  if (era === 'bronze' || era === 'iron') look.helmet = era;
  if (era === 'medieval') {
    look.helmet = 'kettle';
    if (look.armor) look.armor = MAIL;
  }
  if (era === 'sail') {
    Object.assign(look, { helmet: 'tricorn', tunic: undefined, sleeve: undefined, pants: 0xd8cfb4, belt: C.leather, sash: true });
  }
  if (era === 'industrial') {
    Object.assign(look, { helmet: 'kepi', tunic: undefined, sleeve: undefined, pants: 0x3a3f4a, belt: C.dark });
  }
  if (era === 'modern') {
    const armor = look.armor ? OLIVE_D : undefined;
    Object.assign(look, { helmet: 'steel', tunic: OLIVE, sleeve: OLIVE, pants: OLIVE_D, sash: true, armor });
  }
  if (era === 'future') {
    Object.assign(look, { helmet: 'visor', tunic: DARK, sleeve: DARK, pants: DARK, sash: true, armor: CHROME });
  }
}

// Weapon and shield updates: clubs become maces then batons, swords sabres, spears bayonets; shields go, then riot and
// energy shields.
function armForEra(look, era) {
  const reached = age => ageIndex(era) >= ageIndex(age);
  if (look.weapon === 'club' && reached('bronze')) look.weapon = reached('modern') ? 'baton' : 'mace';
  if (look.weapon === 'sword' && reached('sail') && !reached('future')) look.weapon = 'sabre';
  if (look.weapon === 'spear' && (era === 'industrial' || era === 'modern')) look.weapon = 'bayonet';
  if (look.shield && reached('industrial')) look.shield = { industrial: null, modern: 'riot', future: 'energy' }[era];
  look.remap = ARMS[era] ?? null;
}

// Civilian workwear stays distinct from soldiers: aprons, caps, then safety gear and a utility suit.
const WORKWEAR = {
  tool: { tunic: 0xb39970, pants: 0x705238, hat: 'straw' },
  bronze: { tunic: 0xe1c89b, pants: 0x89633f, hat: 'straw', belt: C.bronze },
  iron: { tunic: 0xb1a28a, pants: 0x554b42, hat: 'straw', belt: C.iron },
  medieval: { tunic: 0x94734e, pants: 0x443a30, helmet: 'leather', hat: null },
  sail: { tunic: 0xe3d7b9, pants: 0x374b64, helmet: 'tricorn', hat: null },
  industrial: { tunic: 0x53677e, pants: 0x303d50, helmet: 'kepi', hat: null, apron: C.leather },
  modern: { tunic: 0xe39728, pants: 0x30475e, helmet: 'hardhat', hat: null, apron: 0xe9ce41 },
  future: { tunic: DARK, pants: DARK, helmet: 'visor', hat: null, apron: CHROME, remap: ARMS.future },
};

// A humanoid spec (models.js HUMAN, or a rider) in the given era: helmet, uniform, then weapon and shield updates.
export function eraSpec(type, base, era) {
  const native = UNITS[type]?.age ?? 'stone';
  if (era === native || !AGES.includes(era)) return base;
  if (type === 'villager') return { ...base, ...WORKWEAR[era] };
  const look = { ...base };
  dressForEra(look, base, era);
  armForEra(look, era);
  return look;
}

// Cavalry mount: horses up to the Industrial Age, motorbikes in the Modern Age, hoverbikes in the AI Future.
export const mountOf = era => era === 'future' ? 'hover' : era === 'modern' ? 'bike' : 'horse';

// Siege chassis: the stone-throwers give way to a mortar (Catapult) and a rocket battery (Trebuchet) from the Age of
// Sail on; guns and the Tank keep their chassis in the era's finish (the AI Future ones hover).
export function siegeLook(type, era) {
  const late = ageIndex(era) >= ageIndex('sail');
  if (type === 'catapult') return late ? 'mortar' : 'catapult';
  if (type === 'trebuchet') return late ? 'rockets' : 'trebuchet';
  return type;
}
// Siege finish per era, applied over the Age of Sail colours (wood, bronze) and the Modern olive drab.
export const SIEGE_REMAP = {
  industrial: remap([[C.wood, 0x4a4f55], [C.woodD, POLY], [C.bronze, GUNMETAL]]),
  modern: remap([[C.wood, ARMY], [C.woodD, OLIVE_D], [C.bronze, 0x3a3f33]]),
  future: remap([[C.wood, CHROME], [C.woodD, DARK], [C.bronze, SHELL], [ARMY, CHROME], [OLIVE, CHROME], [OLIVE_D, SHELL],
    [POLY, DARK], [0x3a3f33, SHELL], [0x4a4f52, DARK], [GUNMETAL, SHELL], [C.iron, NEON]]),
};

// ---------- geometry ----------
// Spoked wheels (axle along x) and AI Future hover pads, glowing underneath.
function wheels(b, radius, xs, zs, tyre = C.woodD) {
  for (const x of xs) for (const z of zs) {
    b.add(unit.cyl, tyre, x, radius, z, radius, 0.07, radius, 0, 0, HALF_TURN)
      .add(unit.cyl, C.iron, x, radius, z, radius * 0.3, 0.09, radius * 0.3, 0, 0, HALF_TURN);
  }
  return b;
}
export function pads(b, xs, zs, top = 0.26) {
  for (const x of xs) for (const z of zs) b.box(0.2, top - 0.1, 0.32, DARK, x, 0.1, z).box(0.16, 0.025, 0.27, NEON, x, 0.075, z);
  return b;
}

// A rider's motorbike (wheels spin on their own pivots) and hoverbike, nose to +z like the horse. The Knight's are
// armoured: a team-coloured fairing and side plates.
export function motorbike(team, armoured) {
  const t = TEAM[team], body = new B(), wheel = new B();
  body.box(0.16, 0.18, 0.62, POLY, 0, 0.22, 0).box(0.2, 0.12, 0.32, t, 0, 0.4, 0.12).box(0.22, 0.06, 0.34, DARK, 0, 0.44, -0.2)
    .box(0.24, 0.04, 0.26, OLIVE, 0, 0.4, -0.44).box(0.46, 0.03, 0.03, DARK, 0, 0.62, 0.36).sph(0.05, 0xfff3c0, 0, 0.55, 0.47)
    .add(unit.cyl, C.iron, 0.12, 0.26, -0.26, 0.035, 0.4, 0.035, HALF_TURN, 0, 0);
  for (const x of [-0.07, 0.07]) body.box(0.035, 0.44, 0.035, C.iron, x, 0.2, 0.42, -0.25); // the front fork
  if (armoured) {
    body.box(0.36, 0.28, 0.08, t, 0, 0.36, 0.5, -0.3).box(0.38, 0.05, 0.09, GUNMETAL, 0, 0.64, 0.46, -0.3);
    for (const x of [-0.17, 0.17]) body.box(0.06, 0.18, 0.4, OLIVE_D, x, 0.24, -0.22);
  }
  wheel.add(unit.cyl, POLY, 0, 0, 0, 0.2, 0.09, 0.2, 0, 0, HALF_TURN).add(unit.cyl, C.iron, 0, 0, 0, 0.08, 0.1, 0.08, 0, 0, HALF_TURN)
    .box(0.1, 0.34, 0.04, C.iron, 0, -0.17, 0);
  return { body: body.geometry(), wheel: wheel.geometry() };
}
export function hoverbike(team, armoured) {
  const t = TEAM[team], body = new B();
  body.sph(0.3, CHROME, 0, 0.5, 0.05, 0.72, 0.45, 1.7).box(0.14, 0.05, 0.56, t, 0, 0.6, 0.12).box(0.22, 0.06, 0.32, DARK, 0, 0.6, -0.22)
    .box(0.3, 0.14, 0.04, 0x8ddbe7, 0, 0.64, 0.42, -0.6).box(0.5, 0.03, 0.03, DARK, 0, 0.72, 0.3).sph(0.05, NEON, 0, 0.5, 0.56);
  for (const z of [-0.36, 0.36]) body.cyl(0.15, 0.1, DARK, 0, 0.22, z).cyl(0.12, 0.02, NEON, 0, 0.2, z); // the lift fans
  if (armoured) {
    for (const x of [-0.21, 0.21]) body.box(0.05, 0.16, 0.66, t, x, 0.4, 0.04).box(0.06, 0.03, 0.62, NEON, x, 0.56, 0.04);
    body.box(0.3, 0.1, 0.2, SHELL, 0, 0.36, 0.6, 0.3);
  }
  return { body: body.geometry() };
}

// Catapult from the Age of Sail on: a squat mortar, high-angled barrel on a pivot (base, barrel).
export function mortar(team, era) {
  const t = TEAM[team], map = SIEGE_REMAP[era] ?? null, hover = era === 'future';
  const bed = new B(map), barrel = new B(map), y = hover ? 0.26 : 0.18;
  bed.box(0.62, 0.14, 0.72, C.wood, 0, y, 0).box(0.64, 0.05, 0.22, t, 0, y + 0.14, -0.26);
  for (const x of [-0.2, 0.2]) bed.box(0.1, 0.24, 0.32, C.woodD, x, y + 0.14, 0.05);
  if (hover) pads(bed, [-0.24, 0.24], [0]);
  else wheels(bed, 0.17, [-0.36, 0.36], [-0.22, 0.24]);
  barrel.add(unit.cyl, C.bronze, 0, 0, 0.1, 0.15, 0.44, 0.15, HALF_TURN, 0, 0)
    .add(unit.cyl, C.bronze, 0, 0, 0.33, 0.18, 0.07, 0.18, HALF_TURN, 0, 0)
    .add(unit.cyl, C.dark, 0, 0, 0.37, 0.11, 0.012, 0.11, HALF_TURN, 0, 0).sph(0.15, C.bronze, 0, 0, -0.12)
    .add(unit.cyl, C.iron, 0, 0, 0, 0.05, 0.5, 0.05, 0, 0, HALF_TURN);
  return { base: bed.geometry(), barrel: barrel.geometry(), at: [0, y + 0.36, 0.05] };
}

// The Armored Train's colours per era: plate, dark (frame, slits) and trim.
function trainColors(hover, steam) {
  return {
    plate: hover ? CHROME : steam ? 0x4a4f55 : OLIVE,
    dark: hover ? DARK : steam ? 0x2a2d30 : OLIVE_D,
    trim: hover ? NEON : steam ? C.bronze : GUNMETAL,
  };
}
// The frame, cowcatcher and two four-wheeled bogies.
function trainBogies(hull, { dark, trim }) {
  hull.box(0.5, 0.08, 1.7, dark, 0, 0.18, 0).box(0.46, 0.1, 0.06, trim, 0, 0.08, 0.86, -0.5);
  for (const x of [-0.27, 0.27]) for (const z of [-0.62, -0.36, 0.36, 0.62]) {
    hull.add(unit.cyl, POLY, x, 0.13, z, 0.13, 0.06, 0.13, 0, 0, HALF_TURN)
      .add(unit.cyl, trim, x * 1.12, 0.13, z, 0.04, 0.02, 0.04, 0, 0, HALF_TURN);
  }
}
// The front: a steam boiler with smokestack and headlamp, or a slab-sided diesel nose.
function trainNose(hull, steam, y, { plate, dark, trim }) {
  if (steam) {
    hull.add(unit.cyl, plate, 0, y + 0.2, 0.5, 0.2, 0.7, 0.2, HALF_TURN, 0, 0)
      .add(unit.cyl, trim, 0, y + 0.2, 0.86, 0.17, 0.03, 0.17, HALF_TURN, 0, 0)
      .cyl(0.06, 0.24, dark, 0, y + 0.36, 0.7).cyl(0.085, 0.05, dark, 0, y + 0.58, 0.7).sph(0.045, C.gold, 0, y + 0.42, 0.86);
  } else {
    hull.box(0.56, 0.3, 0.62, plate, 0, y, 0.46).box(0.56, 0.06, 0.26, dark, 0, y + 0.24, 0.8, -0.5)
      .box(0.4, 0.04, 0.03, trim, 0, y + 0.14, 0.78);
  }
}
// The casemate behind, with a team band, a roof and firing slits.
function trainCasemate(hull, t, y, { plate, dark, trim }) {
  hull.box(0.62, 0.44, 1.0, plate, 0, y, -0.35).box(0.64, 0.07, 1.02, t, 0, y + 0.3, -0.35)
    .box(0.64, 0.03, 1.02, dark, 0, y + 0.42, -0.35).box(0.66, 0.025, 1.04, trim, 0, y + 0.38, -0.35);
  for (const z of [-0.7, -0.35, 0]) hull.box(0.66, 0.04, 0.12, dark, 0, y + 0.18, z);
}
// The twin machine-gun cupola.
function trainCupola(turret, t, { plate, dark, trim }) {
  turret.cyl(0.17, 0.16, plate, 0, 0, -0.35).cyl(0.18, 0.03, dark, 0, 0.16, -0.35).box(0.1, 0.03, 0.1, t, 0, 0.19, -0.42);
  for (const x of [-0.05, 0.05]) {
    turret.add(unit.cyl, dark, x, 0.08, -0.07, 0.025, 0.36, 0.025, HALF_TURN, 0, 0)
      .add(unit.cyl, trim, x, 0.08, 0.12, 0.03, 0.03, 0.03, HALF_TURN, 0, 0);
  }
}

// Armored Train (Industrial): a riveted locomotive on bogies, boiler and smokestack in front, a casemate with firing slits
// behind and a twin machine-gun cupola on top (hull, turret; the turret's pivot sits at z 0 so the recoil can move it).
// Modern repaints it olive drab with a slab-sided diesel nose; the AI Future one is a chrome maglev on hover pads.
export function armoredTrain(team, era) {
  const t = TEAM[team], hover = era === 'future', steam = !hover && era !== 'modern', hull = new B(), turret = new B();
  const colors = trainColors(hover, steam);
  const y = hover ? 0.2 : 0.26;
  if (hover) pads(hull, [-0.22, 0.22], [-0.5, 0.5], 0.2);
  else trainBogies(hull, colors);
  trainNose(hull, steam, y, colors);
  trainCasemate(hull, t, y, colors);
  trainCupola(turret, t, colors);
  return { hull: hull.geometry(), turret: turret.geometry(), at: [0, y + 0.44, 0] };
}

// Sail and Industrial: Congreve rockets in a trough on a two-wheeled cart.
function congreveRockets(t, base, rack) {
  base.box(0.5, 0.1, 0.9, C.wood, 0, 0.24, -0.15).box(0.52, 0.05, 0.2, t, 0, 0.34, -0.45);
  for (const x of [-0.18, 0.18]) base.box(0.06, 0.36, 0.06, C.woodD, x, 0.3, 0.05);
  wheels(base, 0.26, [-0.33, 0.33], [-0.05]);
  rack.box(0.46, 0.04, 1.0, C.woodD, 0, -0.05, 0.05);
  for (const x of [-0.13, 0, 0.13]) {
    rack.add(unit.cyl, C.iron, x, 0.04, 0.12, 0.045, 0.56, 0.045, HALF_TURN, 0, 0)
      .sph(0.05, t, x, 0.04, 0.44, 1, 1, 1.6).add(unit.cyl, C.wood, x, 0.04, -0.36, 0.012, 0.44, 0.012, HALF_TURN, 0, 0);
  }
  return { base: base.geometry(), barrel: rack.geometry(), at: [0, 0.66, 0.05] };
}
// Modern and AI Future: a launcher box of six tubes on a four-wheeled carriage or a hover sled.
function launcherBox(t, era, base, rack) {
  const hover = era === 'future', y = hover ? 0.26 : 0.2;
  base.box(0.62, 0.18, 1.1, C.wood, 0, y, 0).box(0.5, 0.26, 0.3, C.woodD, 0, y + 0.18, 0.4).box(0.52, 0.04, 0.22, t, 0, y + 0.44, 0.4);
  if (hover) pads(base, [-0.25, 0.25], [-0.3, 0.3]);
  else wheels(base, 0.2, [-0.34, 0.34], [-0.36, 0.36], POLY);
  rack.box(0.52, 0.3, 0.7, C.woodD, 0, -0.12, -0.05).box(0.54, 0.05, 0.4, t, 0, 0.18, -0.15);
  for (const x of [-0.16, 0, 0.16]) for (const tubeY of [-0.04, 0.1]) {
    rack.add(unit.cyl, C.iron, x, tubeY, 0.3, 0.055, 0.04, 0.055, HALF_TURN, 0, 0);
  }
  return { base: base.geometry(), barrel: rack.geometry(), at: [0, y + 0.42, -0.1] };
}
// Trebuchet from the Age of Sail on: a rocket battery. Sail and Industrial fire Congreve rockets from a two-wheeled
// trough; Modern is a launcher box of tubes on a four-wheeled carriage, the AI Future one a hover sled.
export function rockets(team, era) {
  const t = TEAM[team], map = SIEGE_REMAP[era] ?? null, base = new B(map), rack = new B(map);
  if (era === 'sail' || era === 'industrial') return congreveRockets(t, base, rack);
  return launcherBox(t, era, base, rack);
}
