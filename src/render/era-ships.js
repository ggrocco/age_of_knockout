// Role-preserving ship evolution. Geometry only: combat stats and cargo capacity stay in the sim tables.
import { B, C, TEAM, unit } from './builder.js';
import { ageIndex } from '../data/ages.js';

export function eraShipParts(type, team, era) {
  const t = TEAM[team], fishing = type === 'fishing_ship', transport = type === 'transport_ship';
  const i = ageIndex(era), powered = i >= ageIndex('industrial'), future = era === 'future';
  const w = fishing ? 0.48 : transport ? 0.74 : 0.62, len = fishing ? 1.22 : transport ? 1.75 : 2;
  const finish = [C.woodD, C.wood, 0x98663c, 0x67503c, 0x583c29, 0x282b31, 0x4c555d, 0x77848c, 0xd8e2e8][i];
  const trim = future ? 0x39f3ff : t, deck = powered ? 0x43505a : 0xb49b73, b = new B();
  b.box(w, 0.22, len * 0.76, finish, 0, 0, -len * 0.1)
    .box(w / Math.SQRT2, 0.22, w / Math.SQRT2, finish, 0, 0, len * 0.28, 0, Math.PI / 4)
    .box(w + 0.025, 0.045, len * 0.76, trim, 0, 0.16, -len * 0.1)
    .box(w * 0.86, 0.025, len * 0.7, deck, 0, 0.22, -len * 0.1);
  // Rails and a higher stern distinguish the larger pre-steam vessels from the first open boats.
  if (i >= ageIndex('bronze')) for (const x of [-w * 0.48, w * 0.48]) {
    b.box(0.025, 0.1, len * 0.65, finish, x, 0.23, -0.1);
    if (i >= ageIndex('medieval')) b.box(0.04, 0.18, 0.32, trim, x, 0.23, -len * 0.33);
  }
  if (!powered) {
    if (era === 'stone') { // an open paddled fishing boat, before sail and warships
      for (const z of [-0.3, 0.06]) b.box(w * 0.9, 0.04, 0.1, C.wood, 0, 0.23, z);
      for (const x of [-0.3, 0.3]) b.box(0.04, 0.035, 0.65, C.wood, x, 0.22, -0.1, 0, x, 0);
    } else {
      const h = 0.75 + i * 0.1, masts = era === 'sail' ? [-0.38, 0.25] : [0.05];
      for (const z of masts) b.cyl(0.025, h, C.woodD, 0, 0.22, z)
        .box(w * 1.15, 0.32 + i * 0.025, 0.025, 0xe9e1cc, 0, h * 0.6, z + 0.025)
        .box(w * 1.2, 0.025, 0.03, finish, 0, h * 0.6 + 0.32 + i * 0.025, z)
        .box(0.02, 0.12, 0.22, t, 0, h + 0.22, z);
    }
  } else {
    // A working wheelhouse, steam funnel, then radar; futuristic boats use twin illuminated sponsons.
    b.box(w * 0.62, 0.3, 0.4, finish, 0, 0.24, -len * 0.25)
      .box(w * 0.65, 0.055, 0.43, trim, 0, 0.54, -len * 0.25)
      .box(w * 0.5, 0.08, 0.025, future ? 0x39f3ff : 0x8db7cf, 0, 0.43, -len * 0.25 + 0.21);
    if (era === 'industrial') b.cyl(0.065, 0.4, 0x30363b, 0, 0.28, -0.06).cyl(0.08, 0.04, C.bronze, 0, 0.66, -0.06);
    else b.cyl(0.018, 0.5, finish, 0, 0.56, -len * 0.25).box(0.3, 0.04, 0.07, trim, 0, 1.04, -len * 0.25);
    if (future) for (const x of [-w * 0.65, w * 0.65]) b.box(0.16, 0.18, len * 0.8, finish, x, 0.02, 0).box(0.17, 0.035, len * 0.7, trim, x, 0.04, 0);
  }
  if (fishing) { // net boom, visible net and fish boxes in every era
    b.add(unit.cyl, powered ? C.iron : C.woodD, 0, 0.5, 0.12, 0.018, 0.65, 0.018, 0, 0, 1.0);
    for (const x of [0.2, 0.27, 0.34]) b.box(0.012, 0.26, 0.012, future ? trim : C.hay, x, 0.1, 0.12);
    for (const y of [0.1, 0.22, 0.35]) b.box(0.16, 0.012, 0.012, future ? trim : C.hay, 0.27, y, 0.12);
    b.box(0.2, 0.12, 0.25, deck, 0, 0.24, -0.23).sph(0.04, 0xb8c4cc, 0, 0.37, -0.23, 1.7, 0.5, 0.7);
  }
  if (transport) {
    b.box(0.42, 0.035, 0.3, trim, 0, 0.24, len * 0.38, -0.35);
    const person = new B().cylT(0.045, 0.06, 0.16, t, 0, 0, 0, 8).sph(0.045, C.skin, 0, 0.21, 0);
    return { body: b.geometry(), person: person.geometry() };
  }
  if (!fishing) {
    const gun = new B().box(0.22, 0.12, 0.24, finish, 0, 0, 0)
      .add(unit.cyl, future ? trim : C.iron, 0, 0.06, 0.24, 0.028, 0.36, 0.028, Math.PI / 2, 0, 0);
    // On early galleys this is a deck-mounted bolt launcher; in later eras it becomes a gun.
    if (!powered) gun.box(0.42, 0.03, 0.04, C.woodD, 0, 0.08, 0.35);
    return { body: b.geometry(), guns: gun.geometry(), gunsAt: [0, 0.25, len * 0.23] };
  }
  return { body: b.geometry() };
}
