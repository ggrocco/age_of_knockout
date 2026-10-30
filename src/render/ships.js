// Ships (the Dock's units), bow to +z like every unit, hull resting on the water at y = 0. Each follows its owner's
// era while retaining its role. Parts that move: the War Galley's two banks of oars, the
// Frigate's and Destroyer's guns (recoil on a shot), the Transport Ship's passengers (one figure on deck for each one
// aboard), the Fishing Ship's net (cast into a splashing sea while it fishes) and catch (grows with its load); the whole
// hull bobs and rolls (CPU, or the GPU's bob in a match).
import * as THREE from 'three';
import { UNITS } from '../data/units.js';
import { CATCH_AT, NET_AT, eraShipParts } from './era-ships.js';
import { B, C, TEAM, TEAM_DARK, cached, mesh, pivot, unit } from './builder.js';

const GREY = 0x7d868c, GREY_D = 0x5b6369, DECK = 0x9c8a6a, HULL = 0x4e3320, OCHRE = 0xc79a3a, SAIL = 0xe9e1cc, BLACK = 0x1c1c1c;
const HALF_TURN = Math.PI / 2;

// A pointed hull w wide, len long and hh high, its keel at y and bow at +z: a box with a wedge bow, a band in c2 along the sides.
function hull(b, w, len, hh, c, c2, y = 0, bowLen = w * 0.75) {
  const body = len - bowLen;
  b.box(w, hh, body, c, 0, y, -bowLen / 2);
  const k = w / Math.SQRT2; // a square turned 45 degrees, half of it past the body's front, makes the bow
  b.box(k, hh, k, c, 0, y, len / 2 - bowLen, 0, Math.PI / 4)
    .box(w * 0.36, hh * 0.9, bowLen * 0.9, c, 0, y + hh * 0.05, len / 2 - bowLen * 0.55);
  b.box(w + 0.03, 0.045, body, c2, 0, y + hh - 0.08, -bowLen / 2); // a stripe along the sides, under the deck's edge
  return b;
}

// The Frigate's three masts: [z, height], each with up to three square sails [height on the mast, width].
const FRIGATE_MASTS = [[0.48, 1.3], [-0.05, 1.55], [-0.55, 1.2]];
const FRIGATE_SAILS = [[0.62, 0.62], [0.98, 0.5], [1.28, 0.36]];
function frigateRigging(b) {
  for (const [z, mastHeight] of FRIGATE_MASTS) {
    b.cyl(0.03, mastHeight, C.woodD, 0, 0.32, z);
    for (const [y, w] of FRIGATE_SAILS) {
      if (y >= mastHeight) continue;
      b.box(w, Math.min(0.3, mastHeight - y - 0.04), 0.03, SAIL, 0, 0.32 + y - 0.18, z + 0.03)
        .box(w + 0.06, 0.025, 0.025, C.woodD, 0, 0.32 + y + 0.12, z + 0.03); // the yard
    }
  }
}

const parts = {
  fishing_ship(team) { return eraShipParts('fishing_ship', team, 'stone'); },
  transport_ship(team) { // a broad, deep-bellied cargo cog: a hold amidships, a square team sail, a ramp at the bow
    const t = TEAM[team], b = hull(new B(), 0.66, 1.6, 0.3, C.wood, t), person = new B();
    b.box(0.58, 0.02, 1.1, DECK, 0, 0.28, -0.12).box(0.62, 0.22, 0.3, C.woodD, 0, 0.28, -0.62)
      .box(0.64, 0.03, 0.32, t, 0, 0.5, -0.62);
    for (const side of [-1, 1]) b.box(0.03, 0.1, 1.1, C.woodD, side * 0.31, 0.3, -0.12);
    b.box(0.4, 0.03, 0.26, C.woodD, 0, 0.32, 0.62, -0.5).cyl(0.03, 1.1, C.woodD, 0, 0.28, -0.25)
      .box(0.7, 0.03, 0.03, C.woodD, 0, 1.3, -0.24)
      .box(0.66, 0.5, 0.02, t, 0, 0.78, -0.22).box(0.66, 0.06, 0.025, SAIL, 0, 1.18, -0.22);
    person.cylT(0.045, 0.06, 0.16, t, 0, 0, 0, 8).sph(0.045, C.skin, 0, 0.21, 0);
    return { body: b.geometry(), person: person.geometry() };
  },
  war_galley(team) { // a Bronze Age bireme: long low hull, a bronze ram, a painted eye, a square team sail and the stern curl
    const t = TEAM[team], td = TEAM_DARK[team], b = hull(new B(), 0.5, 1.7, 0.22, HULL, OCHRE), oar = new B();
    b.box(0.42, 0.02, 1.2, DECK, 0, 0.2, -0.18).add(unit.cyl, C.bronze, 0, 0.06, 0.92, 0.05, 0.22, 0.05, HALF_TURN, 0, 0);
    for (const side of [-1, 1]) b.sph(0.035, 0xf2efe6, side * 0.15, 0.17, 0.66).sph(0.018, BLACK, side * 0.165, 0.17, 0.68);
    b.add(unit.tor, HULL, 0, 0.3, -0.78, 0.14, 0.14, 0.14, 0, HALF_TURN, 0);
    b.cyl(0.03, 1.15, C.woodD, 0, 0.2, 0.05).box(0.72, 0.03, 0.03, C.woodD, 0, 1.15, 0.05)
      .box(0.7, 0.48, 0.02, t, 0, 0.66, 0.06).box(0.7, 0.07, 0.025, td, 0, 0.88, 0.06);
    for (const side of [-1, 1]) for (let z = -0.55; z <= 0.4; z += 0.19) b.box(0.03, 0.12, 0.08, td, side * 0.26, 0.2, z); // oar ports
    oar.add(unit.cyl, C.wood, 0.3, 0, 0, 0.012, 0.6, 0.012, 0, 0, HALF_TURN - 0.5).box(0.02, 0.02, 0.07, C.wood, 0.56, -0.15, 0);
    return { body: b.geometry(), oar: oar.geometry() };
  },
  frigate(team) { // an Age of Sail frigate: black hull with an ochre band and gun ports, three masts of square sails, a bowsprit
    const t = TEAM[team], b = hull(new B(), 0.6, 1.9, 0.34, BLACK, OCHRE), guns = new B();
    b.box(0.52, 0.02, 1.38, DECK, 0, 0.32, -0.2).box(0.56, 0.16, 0.36, BLACK, 0, 0.32, -0.74)
      .box(0.58, 0.03, 0.38, OCHRE, 0, 0.48, -0.74);
    b.add(unit.cyl, C.woodD, 0, 0.42, 1.02, 0.02, 0.5, 0.02, 1.2, 0, 0);
    frigateRigging(b);
    b.box(0.02, 0.1, 0.24, t, 0, 1.75, -0.05).box(0.02, 0.08, 0.2, t, 0, 1.46, 0.48); // pennants
    for (const side of [-1, 1]) for (let z = -0.6; z <= 0.45; z += 0.21) {
      guns.box(0.04, 0.06, 0.06, BLACK, side * 0.31, 0, z)
        .add(unit.cyl, 0x33373b, side * 0.36, 0.03, z, 0.022, 0.1, 0.022, 0, 0, HALF_TURN);
    }
    return { body: b.geometry(), guns: guns.geometry(), gunsAt: [0, 0.2, 0] };
  },
  destroyer(team) { // a Modern destroyer: grey hull with a raked bow, a bridge and mast with radar, a funnel and two turrets
    const t = TEAM[team], b = hull(new B(), 0.52, 2.0, 0.26, GREY, GREY_D, 0, 0.6), turret = new B(), aft = new B();
    b.box(0.46, 0.02, 1.36, 0x6f777c, 0, 0.25, -0.3).box(0.53, 0.04, 0.5, t, 0, 0.18, -0.6);
    b.box(0.34, 0.32, 0.44, GREY, 0, 0.27, 0.05).box(0.36, 0.05, 0.1, 0x1d2b3a, 0, 0.5, 0.25)
      .box(0.24, 0.14, 0.24, GREY_D, 0, 0.59, 0.0);
    b.cyl(0.025, 0.6, GREY_D, 0, 0.73, -0.02).box(0.26, 0.03, 0.05, GREY_D, 0, 1.1, -0.02)
      .box(0.14, 0.06, 0.03, 0xd8e2e8, 0, 1.24, -0.02);
    b.cylT(0.09, 0.11, 0.3, GREY_D, 0, 0.27, -0.32, 10).cyl(0.095, 0.04, BLACK, 0, 0.57, -0.32);
    for (const gun of [turret, aft]) {
      gun.box(0.22, 0.12, 0.24, GREY, 0, 0, 0).add(unit.cyl, GREY_D, 0, 0.06, 0.24, 0.025, 0.36, 0.025, HALF_TURN, 0, 0);
    }
    return {
      body: b.geometry(), turret: turret.geometry(), turretAt: [0, 0.27, 0.55], aft: aft.geometry(), aftAt: [0, 0.27, -0.72],
    };
  },
};
export const SHIP_TYPES = Object.keys(parts);

// The Transport Ship's passengers: eight hidden figures on deck, shown one per unit aboard.
function addCrew(body, person) {
  return [-0.15, 0.15].flatMap(x => [0.32, 0.12, -0.08, -0.28].map(z => {
    const figure = pivot(x, 0.3, z, person);
    figure.visible = false;
    body.add(figure);
    return figure;
  }));
}
// The War Galley's oars, three a side; the port side is mirrored.
function addOars(body, oar) {
  return [-1, 1].flatMap(side => [-0.45, -0.15, 0.15].map(z => {
    const joint = pivot(side * 0.25, 0.22, z, oar);
    joint.scale.x = side;
    body.add(joint);
    return joint;
  }));
}
// The guns: the Frigate's broadside, or the Destroyer's fore turret and the aft one turned to face astern.
function addGuns(body, shipParts, anim) {
  if (shipParts.guns) {
    anim.gun = pivot(...shipParts.gunsAt, shipParts.guns);
    body.add(anim.gun);
  }
  if (shipParts.turret) {
    anim.gun = pivot(...shipParts.turretAt, shipParts.turret);
    anim.aft = pivot(...shipParts.aftAt, shipParts.aft);
    anim.aft.rotation.y = Math.PI;
    body.add(anim.gun, anim.aft);
  }
}

// The Fishing Ship's net on the boom, the splash on the water under it (hidden until it fishes) and the catch on deck.
function addFishingGear(body, shipParts, anim) {
  anim.net = pivot(...NET_AT, shipParts.net);
  anim.splash = pivot(NET_AT[0], 0.02, NET_AT[2], shipParts.splash);
  anim.heap = pivot(...CATCH_AT, shipParts.heap);
  anim.splash.visible = anim.heap.visible = false;
  body.add(anim.net, anim.splash, anim.heap);
}

// A ship's model: { root, anim, shadow } like models.js's units. anim.body bobs; oars, guns and turrets are pivots.
export function shipModel(e, era = UNITS[e.type].age) {
  const root = new THREE.Group(), shipParts = cached(`ship:${e.type}:${e.owner}:${era}`,
    () => era !== UNITS[e.type].age ? eraShipParts(e.type, e.owner, era) : parts[e.type](e.owner));
  const body = new THREE.Group();
  body.add(mesh(shipParts.body));
  root.add(body);
  const anim = { type: 'ship', body };
  if (shipParts.person) anim.crew = addCrew(body, shipParts.person);
  if (shipParts.oar) anim.oars = addOars(body, shipParts.oar);
  addGuns(body, shipParts, anim);
  if (shipParts.net) addFishingGear(body, shipParts, anim);
  root.scale.setScalar(e.type === 'fishing_ship' ? 1 : 1.15);
  return { root, anim, shadow: e.type === 'fishing_ship' ? 0.4 : 0.6 };
}

// Per frame: the hull bobs and rolls (on the CPU only outside a match, where the GPU's bob does it), the oars sweep while
// rowing, the guns recoil just after a shot.
export function animateShip(g, a, e, t, moving) {
  if (!g.userData.gpuCosmetics) a.body.position.y = Math.sin(t * 3 + e.id) * 0.025; // the GPU's bob: sin(time * 3 + phase)
  a.body.rotation.z = Math.sin(t * 1.3 + e.id * 0.7) * 0.035;
  if (a.oars) for (const oar of a.oars) oar.rotation.y = moving ? Math.sin(t * 6 + e.id) * 0.45 : 0;
  if (a.net) animateFishing(a, e, t);
  if (a.crew) a.crew.forEach((figure, i) => { figure.visible = i < (e.cargo?.length ?? 0); });
  const kick = e.order?.type === 'attack' && e.cooldown ? Math.max(0, (e.cd - e.cooldown + 8) / 8) : 0;
  if (a.gun && a.aft) a.gun.position.z = 0.55 - kick * 0.06;
  else if (a.gun) a.gun.scale.x = 1 - kick * 0.12; // the Frigate's broadside runs in on both sides
}

// While it fishes, the net hangs down into the water and sways in a ring of splashes; otherwise it is hauled up. The
// catch on deck shows from the first fish and grows to a full heap at the ship's capacity.
function animateFishing(a, e, t) {
  const fishing = e.order?.type === 'gather' && e.order.phase === 'work';
  a.net.scale.y = fishing ? 1.9 + Math.sin(t * 2.2 + e.id) * 0.12 : 1;
  a.net.rotation.x = fishing ? Math.sin(t * 1.7 + e.id) * 0.12 : 0;
  a.splash.visible = fishing;
  if (fishing) a.splash.scale.setScalar(0.8 + (t * 1.5 + e.id * 0.37) % 1 * 0.5);
  const load = Math.min(1, (e.carry?.amount ?? 0) / (UNITS[e.type].capacity ?? 10));
  a.heap.visible = load > 0.03;
  a.heap.scale.setScalar(0.5 + load * 0.7);
}
