// Era looks for units trained in an earlier era than their owner's current one. A unit keeps what tells it apart (its
// weapon family, shield, scale, mount or chassis role) but takes the owner's era uniform, weapon finish, mount and
// siege chassis: a Scout in the AI Future rides a hoverbike, a Catapult in the Age of Sail is a mortar. Villagers,
// the King and ships keep one look. unitEra and eraSpec are pure data; the geometry builders share models.js's toolkit.
import { UNITS } from '../data/units.js';
import { AGES, ageIndex } from '../data/ages.js';
import { B, C, TEAM, unit } from './builder.js';

const CHROME = 0xd8e2e8, DARK = 0x26343c, NEON = 0x39f3ff, SHELL = 0x697678;
const OLIVE = 0x5d6640, OLIVE_D = 0x4a5034, ARMY = 0x55603a, GUNMETAL = 0x3a3f44, POLY = 0x2f3437, MAIL = 0x8d949b;
const remap = pairs => new Map(pairs);

// The era a unit is drawn in: its owner's era once that is past the unit's own, else the unit's own era.
export function unitEra(type, age) {
  const spec = UNITS[type], native = spec?.age ?? 'stone';
  if (!spec || spec.cls === 'civ' || spec.naval || !AGES.includes(age)) return native;
  return ageIndex(age) > ageIndex(native) ? age : native;
}

// Weapon and shield finish (only the arm parts are recoloured, never skin or uniform): polymer and gunmetal in the
// Modern Age, chrome with neon edges in the AI Future.
const ARMS = {
  modern: remap([[C.wood, POLY], [C.woodD, DARK], [C.gold, GUNMETAL], [C.bronze, GUNMETAL]]),
  future: remap([[C.wood, CHROME], [C.woodD, DARK], [C.iron, NEON], [C.gold, NEON], [C.bronze, CHROME], [C.hay, NEON],
    [C.stoneD, NEON], [GUNMETAL, CHROME], [POLY, CHROME], [ARMY, DARK]]),
};

// A humanoid spec (models.js HUMAN, or a rider) in the given era: helmet, uniform, then weapon and shield updates.
export function eraSpec(type, base, era) {
  const native = UNITS[type]?.age ?? 'stone';
  if (era === native || !AGES.includes(era)) return base;
  const at = a => ageIndex(era) >= ageIndex(a), o = { ...base };
  if (era === 'tool') o.helmet = base.helmet ?? 'leather';
  if (era === 'bronze' || era === 'iron') o.helmet = era;
  if (era === 'medieval') { o.helmet = 'kettle'; if (o.armor) o.armor = MAIL; }
  // tunic/sleeve undefined fall back to the team colour: a coat in the team's colour.
  if (era === 'sail') Object.assign(o, { helmet: 'tricorn', tunic: undefined, sleeve: undefined, pants: 0xd8cfb4, belt: C.leather, sash: true });
  if (era === 'industrial') Object.assign(o, { helmet: 'kepi', tunic: undefined, sleeve: undefined, pants: 0x3a3f4a, belt: C.dark });
  if (era === 'modern') Object.assign(o, { helmet: 'steel', tunic: OLIVE, sleeve: OLIVE, pants: OLIVE_D, sash: true, armor: o.armor ? OLIVE_D : undefined });
  if (era === 'future') Object.assign(o, { helmet: 'visor', tunic: DARK, sleeve: DARK, pants: DARK, sash: true, armor: CHROME });
  if (o.weapon === 'club' && at('bronze')) o.weapon = at('modern') ? 'baton' : 'mace';
  if (o.weapon === 'sword' && at('sail') && !at('future')) o.weapon = 'sabre';
  if (o.weapon === 'spear' && (era === 'industrial' || era === 'modern')) o.weapon = 'bayonet';
  if (o.shield && at('industrial')) o.shield = { industrial: null, modern: 'riot', future: 'energy' }[era];
  o.remap = ARMS[era] ?? null;
  return o;
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
function wheels(b, r, xs, zs, tyre = C.woodD) {
  for (const x of xs) for (const z of zs) b.add(unit.cyl, tyre, x, r, z, r, 0.07, r, 0, 0, Math.PI / 2).add(unit.cyl, C.iron, x, r, z, r * 0.3, 0.09, r * 0.3, 0, 0, Math.PI / 2);
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
    .add(unit.cyl, C.iron, 0.12, 0.26, -0.26, 0.035, 0.4, 0.035, Math.PI / 2, 0, 0);
  for (const x of [-0.07, 0.07]) body.box(0.035, 0.44, 0.035, C.iron, x, 0.2, 0.42, -0.25);
  if (armoured) {
    body.box(0.36, 0.28, 0.08, t, 0, 0.36, 0.5, -0.3).box(0.38, 0.05, 0.09, GUNMETAL, 0, 0.64, 0.46, -0.3);
    for (const x of [-0.17, 0.17]) body.box(0.06, 0.18, 0.4, OLIVE_D, x, 0.24, -0.22);
  }
  wheel.add(unit.cyl, POLY, 0, 0, 0, 0.2, 0.09, 0.2, 0, 0, Math.PI / 2).add(unit.cyl, C.iron, 0, 0, 0, 0.08, 0.1, 0.08, 0, 0, Math.PI / 2)
    .box(0.1, 0.34, 0.04, C.iron, 0, -0.17, 0);
  return { body: body.geometry(), wheel: wheel.geometry() };
}
export function hoverbike(team, armoured) {
  const t = TEAM[team], body = new B();
  body.sph(0.3, CHROME, 0, 0.5, 0.05, 0.72, 0.45, 1.7).box(0.14, 0.05, 0.56, t, 0, 0.6, 0.12).box(0.22, 0.06, 0.32, DARK, 0, 0.6, -0.22)
    .box(0.3, 0.14, 0.04, 0x8ddbe7, 0, 0.64, 0.42, -0.6).box(0.5, 0.03, 0.03, DARK, 0, 0.72, 0.3).sph(0.05, NEON, 0, 0.5, 0.56);
  for (const z of [-0.36, 0.36]) body.cyl(0.15, 0.1, DARK, 0, 0.22, z).cyl(0.12, 0.02, NEON, 0, 0.2, z);
  if (armoured) {
    for (const x of [-0.21, 0.21]) body.box(0.05, 0.16, 0.66, t, x, 0.4, 0.04).box(0.06, 0.03, 0.62, NEON, x, 0.56, 0.04);
    body.box(0.3, 0.1, 0.2, SHELL, 0, 0.36, 0.6, 0.3);
  }
  return { body: body.geometry() };
}

// Catapult from the Age of Sail on: a squat mortar, high-angled barrel on a pivot (base, barrel).
export function mortar(team, era) {
  const t = TEAM[team], map = SIEGE_REMAP[era] ?? null, hover = era === 'future', b = new B(map), barrel = new B(map), y = hover ? 0.26 : 0.18;
  b.box(0.62, 0.14, 0.72, C.wood, 0, y, 0).box(0.64, 0.05, 0.22, t, 0, y + 0.14, -0.26);
  for (const x of [-0.2, 0.2]) b.box(0.1, 0.24, 0.32, C.woodD, x, y + 0.14, 0.05);
  if (hover) pads(b, [-0.24, 0.24], [0]); else wheels(b, 0.17, [-0.36, 0.36], [-0.22, 0.24]);
  barrel.add(unit.cyl, C.bronze, 0, 0, 0.1, 0.15, 0.44, 0.15, Math.PI / 2, 0, 0).add(unit.cyl, C.bronze, 0, 0, 0.33, 0.18, 0.07, 0.18, Math.PI / 2, 0, 0)
    .add(unit.cyl, C.dark, 0, 0, 0.37, 0.11, 0.012, 0.11, Math.PI / 2, 0, 0).sph(0.15, C.bronze, 0, 0, -0.12)
    .add(unit.cyl, C.iron, 0, 0, 0, 0.05, 0.5, 0.05, 0, 0, Math.PI / 2);
  return { base: b.geometry(), barrel: barrel.geometry(), at: [0, y + 0.36, 0.05] };
}

// Armored Train (Industrial): a riveted locomotive on bogies, boiler and smokestack in front, a casemate with firing slits
// behind and a twin machine-gun cupola on top (hull, turret; the turret's pivot sits at z 0 so the recoil can move it).
// Modern repaints it olive drab with a slab-sided diesel nose; the AI Future one is a chrome maglev on hover pads.
export function armoredTrain(team, era) {
  const t = TEAM[team], hover = era === 'future', steam = !hover && era !== 'modern', hull = new B(), turret = new B();
  const plate = hover ? CHROME : steam ? 0x4a4f55 : OLIVE, dark = hover ? DARK : steam ? 0x2a2d30 : OLIVE_D, trim = hover ? NEON : steam ? C.bronze : GUNMETAL;
  const y = hover ? 0.2 : 0.26;
  if (hover) pads(hull, [-0.22, 0.22], [-0.5, 0.5], 0.2);
  else {
    hull.box(0.5, 0.08, 1.7, dark, 0, 0.18, 0).box(0.46, 0.1, 0.06, trim, 0, 0.08, 0.86, -0.5);
    for (const x of [-0.27, 0.27]) for (const z of [-0.62, -0.36, 0.36, 0.62]) hull.add(unit.cyl, POLY, x, 0.13, z, 0.13, 0.06, 0.13, 0, 0, Math.PI / 2).add(unit.cyl, trim, x * 1.12, 0.13, z, 0.04, 0.02, 0.04, 0, 0, Math.PI / 2);
  }
  if (steam) hull.add(unit.cyl, plate, 0, y + 0.2, 0.5, 0.2, 0.7, 0.2, Math.PI / 2, 0, 0).add(unit.cyl, trim, 0, y + 0.2, 0.86, 0.17, 0.03, 0.17, Math.PI / 2, 0, 0)
    .cyl(0.06, 0.24, dark, 0, y + 0.36, 0.7).cyl(0.085, 0.05, dark, 0, y + 0.58, 0.7).sph(0.045, C.gold, 0, y + 0.42, 0.86);
  else hull.box(0.56, 0.3, 0.62, plate, 0, y, 0.46).box(0.56, 0.06, 0.26, dark, 0, y + 0.24, 0.8, -0.5).box(0.4, 0.04, 0.03, trim, 0, y + 0.14, 0.78);
  hull.box(0.62, 0.44, 1.0, plate, 0, y, -0.35).box(0.64, 0.07, 1.02, t, 0, y + 0.3, -0.35).box(0.64, 0.03, 1.02, dark, 0, y + 0.42, -0.35).box(0.66, 0.025, 1.04, trim, 0, y + 0.38, -0.35);
  for (const z of [-0.7, -0.35, 0]) hull.box(0.66, 0.04, 0.12, dark, 0, y + 0.18, z);
  turret.cyl(0.17, 0.16, plate, 0, 0, -0.35).cyl(0.18, 0.03, dark, 0, 0.16, -0.35).box(0.1, 0.03, 0.1, t, 0, 0.19, -0.42);
  for (const x of [-0.05, 0.05]) turret.add(unit.cyl, dark, x, 0.08, -0.07, 0.025, 0.36, 0.025, Math.PI / 2, 0, 0).add(unit.cyl, trim, x, 0.08, 0.12, 0.03, 0.03, 0.03, Math.PI / 2, 0, 0);
  return { hull: hull.geometry(), turret: turret.geometry(), at: [0, y + 0.44, 0] };
}

// Trebuchet from the Age of Sail on: a rocket battery. Sail and Industrial fire Congreve rockets from a two-wheeled
// trough; Modern is a launcher box of tubes on a four-wheeled carriage, the AI Future one a hover sled.
export function rockets(team, era) {
  const t = TEAM[team], map = SIEGE_REMAP[era] ?? null, b = new B(map), rack = new B(map);
  if (era === 'sail' || era === 'industrial') {
    b.box(0.5, 0.1, 0.9, C.wood, 0, 0.24, -0.15).box(0.52, 0.05, 0.2, t, 0, 0.34, -0.45);
    for (const x of [-0.18, 0.18]) b.box(0.06, 0.36, 0.06, C.woodD, x, 0.3, 0.05);
    wheels(b, 0.26, [-0.33, 0.33], [-0.05]);
    rack.box(0.46, 0.04, 1.0, C.woodD, 0, -0.05, 0.05);
    for (const x of [-0.13, 0, 0.13]) rack.add(unit.cyl, C.iron, x, 0.04, 0.12, 0.045, 0.56, 0.045, Math.PI / 2, 0, 0)
      .sph(0.05, t, x, 0.04, 0.44, 1, 1, 1.6).add(unit.cyl, C.wood, x, 0.04, -0.36, 0.012, 0.44, 0.012, Math.PI / 2, 0, 0);
    return { base: b.geometry(), barrel: rack.geometry(), at: [0, 0.66, 0.05] };
  }
  const hover = era === 'future', y = hover ? 0.26 : 0.2;
  b.box(0.62, 0.18, 1.1, C.wood, 0, y, 0).box(0.5, 0.26, 0.3, C.woodD, 0, y + 0.18, 0.4).box(0.52, 0.04, 0.22, t, 0, y + 0.44, 0.4);
  if (hover) pads(b, [-0.25, 0.25], [-0.3, 0.3]); else wheels(b, 0.2, [-0.34, 0.34], [-0.36, 0.36], POLY);
  rack.box(0.52, 0.3, 0.7, C.woodD, 0, -0.12, -0.05).box(0.54, 0.05, 0.4, t, 0, 0.18, -0.15);
  for (const x of [-0.16, 0, 0.16]) for (const yy of [-0.04, 0.1]) rack.add(unit.cyl, C.iron, x, yy, 0.3, 0.055, 0.04, 0.055, Math.PI / 2, 0, 0);
  return { base: b.geometry(), barrel: rack.geometry(), at: [0, y + 0.42, -0.1] };
}
