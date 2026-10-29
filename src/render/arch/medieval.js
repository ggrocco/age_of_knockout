// Medieval Age: grey stone and slate, oak framing over limewashed plaster, battlements and pointed arches, beside
// today's kept Castle (legacy.js). Half-timbered houses, a stone hall with a tall spired keep tower, a timber tithe barn,
// a store with a treadwheel crane, strip fields with haystacks, a stone barracks behind a gatehouse, timber archery
// butts, a stable with a hay loft, an arcaded market hall, a hall with a rose window and a gothic cathedral; for
// defence, a round castle tower with a bartizan and a battlemented curtain wall.
//
// In every design `size` is ctx.s (the side of the drawn footprint), `half` is ctx.h (half of it), `team` and
// `teamDark` are the team colours ctx.t and ctx.td; `side` (-1 or 1) mirrors a part to the left or right.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import {
  P, flag, stick, lerp, hash, place, horse, streak, CYL6, CYL8, DISC, BALL, CONE4, FRUSTUM, HORSE_HEAD, sack, barrel,
} from './kit.js';

// House: a half-timbered house. A stone ground floor under an oak-framed, plastered upper floor, a slate roof with a
// stone chimney, an arched door and two glazed windows.
export function house(ctx) {
  const { b, s: size, t: team } = ctx, width = size - 0.2, depth = size - 0.3;
  const upperWidth = width + 0.15, upperDepth = depth + 0.15, upperFront = upperDepth / 2;
  b.box(width, 0.5, depth, C.stone);
  b.box(upperWidth, 0.55, upperDepth, P.plaster, 0, 0.5, 0);
  // Oak posts and braces on the front and back of the upper floor.
  for (const side of [-1, 1]) {
    const faceZ = side * upperDepth / 2;
    for (const x of [-0.75, -0.25, 0.25, 0.75]) b.box(0.06, 0.55, 0.03, P.beam, x * upperWidth / 1.6, 0.5, faceZ);
    for (const [x, tilt] of [[-0.48, 0.6], [0.48, -0.6]]) b.box(0.05, 0.62, 0.03, P.beam, x, 0.52, faceZ, 0, 0, tilt);
  }
  // The sill and head beams, the roof and the chimney.
  b.box(width + 0.2, 0.06, depth + 0.2, P.beam, 0, 0.47, 0);
  b.box(width + 0.2, 0.06, depth + 0.2, P.beam, 0, 1.03, 0);
  b.roof(size + 0.25, 1.0, size + 0.15, P.slate, 0, 1.06, 0);
  b.box(0.22, 0.95, 0.22, C.stoneD, 0.45, 1.06, -0.3);
  houseFront(b, team, depth, upperFront);
  return 2.06;
}

// The house's front: the door under its stone arch, two framed windows and a team board over them.
function houseFront(b, team, depth, upperFront) {
  b.box(0.28, 0.42, 0.04, C.dark, -0.2, 0.0, depth / 2 + 0.01);
  b.add(unit.tor, C.stoneD, -0.2, 0.42, depth / 2 + 0.02, 0.14, 0.12, 0.14);
  for (const x of [-0.35, 0.35]) {
    b.box(0.2, 0.22, 0.04, P.beam, x, 0.66, upperFront + 0.01);
    b.box(0.15, 0.17, 0.05, C.glass, x, 0.685, upperFront + 0.01);
  }
  b.box(0.3, 0.06, 0.06, team, 0, 0.98, upperFront + 0.03);
}

// Town Center: a stone hall with arched doorways beside a crenellated, spired keep flying the flag.
export function town_center(ctx) {
  const { b, s: size, h: half } = ctx;
  townHall(b, size);
  keep(ctx, half - 0.55, half - 0.55);
  return 3.42;
}

// The hall, with arched doorways.
function townHall(b, size) {
  const frontZ = -0.25 + size * 0.3;
  b.box(size + 0.12, 0.12, size + 0.12, 0x756852);
  b.box(size - 0.6, 1.0, size * 0.6, C.stone, -0.25, 0.12, -0.25);
  b.roof(size - 0.45, 0.85, size * 0.62, P.slate, -0.25, 1.12, -0.25);
  for (const x of [-0.95, -0.45, 0.05]) {
    b.box(0.12, 0.34, 0.04, C.dark, x, 0.55, frontZ + 0.01);
    b.add(unit.tor, C.stoneD, x, 0.89, frontZ + 0.02, 0.07, 0.07, 0.07);
  }
}

// The keep at (x, z): crenellated, spired, with arrow slits, a gate and team banners.
function keep(ctx, x, z) {
  const { b, mast, extra, t: team } = ctx;
  b.box(0.95, 2.3, 0.95, 0x8c8a84, x, 0.12, z);
  // Merlons along each edge of the top, [edgeX, edgeZ] out from the centre; the side edges run along z.
  for (const [edgeX, edgeZ, ry] of [[0, -0.475, 0], [0, 0.475, 0], [-0.475, 0, Math.PI / 2], [0.475, 0, Math.PI / 2]]) {
    for (let along = -0.4; along <= 0.41; along += 0.27) {
      b.box(0.15, 0.18, 0.12, C.stoneD, x + (ry ? edgeX : along), 2.42, z + (ry ? along : edgeZ), 0, ry);
    }
  }
  b.cone(0.6, 1.0, P.slate, x, 2.42, z, 4, Math.PI / 4);
  for (const y of [0.7, 1.3, 1.85]) b.box(0.06, 0.24, 0.04, C.dark, x, y, z + 0.48);
  b.box(0.5, 0.72, 0.06, C.dark, x, 0.12, z + 0.48);
  b.box(0.34, 0.6, 0.02, team, x - 0.5, 1.2, z + 0.48);
  b.box(0.34, 0.6, 0.02, team, x + 0.5, 1.2, z + 0.48);
  // The spire's flagpole carries the prototype's larger flag, a little above its tip; kit flag() would shrink it.
  mast.cyl(0.025, 0.7, C.woodD, x, 3.38, z);
  extra.flag = new B().box(0.025, 0.3, 0.55, team, 0, 0, 0.27).geometry();
  extra.flagAt = [x, 3.82, z];
}

// ---------- shared Medieval parts ----------
// The Castle's grey stone and dark dressings, the Town Center's slate, the House's oak and plaster.
const STONE = C.stone, STONE_D = C.stoneD, STONE_L = 0xb4b1a6, SLATE = P.slate, SLATE_L = 0x5f6a77, SLATE_D = 0x3a434d;
const OAK = P.beam, PLASTER = P.plaster, BOARD = 0x6e4c2c, BOARD_L = 0x84623e, STRAW = C.hay, STRAW_D = 0xc9a548;
const YARD = 0x8a7d62, COBBLE = 0x8d887c, PAVE = 0xb3ae9f, GRASS = 0x6a8a3e, GRASS_L = 0x7e9c4c, TURF = 0x5b7a37;
const SOIL = 0x6a5233, SOIL_L = 0x7d6440, GLASS = 0x28323c, ROPE = 0xcbb98a, LIMEWASH = 0xf2efe6;
// The four corners of a square, as [x, z] signs.
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
// A point on a wall face centred at (x, z) facing along ry (0: +z): u along the face, o out from it.
const onFace = (x, z, ry) => (u, o = 0) => [x + u * Math.cos(ry) + o * Math.sin(ry), z - u * Math.sin(ry) + o * Math.cos(ry)];
// A rectangle on the ground from x = left to right and z = back to front, with its middle and its size.
const footprint = (left, right, back, front) => ({
  left, right, back, front, midX: (left + right) / 2, midZ: (back + front) / 2, width: right - left, depth: front - back,
});

// A slate gable roof built at the origin for place(): `width` wide, `rise` high and `length` long, its ridge along z,
// with alternate courses of lighter slate down both slopes and a dark ridge.
const slateRoof = (width, rise, length) => {
  const roof = new B(), pitch = Math.atan2(rise, width / 2), slope = Math.hypot(width / 2, rise);
  roof.roof(width, rise, length, SLATE);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const down = (i + 0.5) / 4;
    const x = side * (width / 2 * down + Math.sin(pitch) * 0.012), y = rise * (1 - down) + Math.cos(pitch) * 0.012;
    roof.add(unit.box, i % 2 ? SLATE : SLATE_L, x, y, 0, slope / 4 + 0.01, 0.022, length + 0.03, 0, 0, -side * pitch);
  }
  return roof.box(0.06, 0.05, length + 0.05, SLATE_D, 0, rise - 0.03, 0);
};
// A single-pitch slate roof built at the origin for place(): `width` along x, from its high back edge (z = -run / 2,
// y = rise) down to its low front edge (z = run / 2, y = 0), in three courses.
const slateLeanTo = (width, run, rise) => {
  const roof = new B(), pitch = Math.atan2(rise, run), slope = Math.hypot(run, rise) + 0.06;
  roof.box(width, 0.035, slope, SLATE, 0, rise / 2 - 0.0175, 0, pitch);
  for (let i = 0; i < 3; i++) {
    const course = (i + 0.5) / 3 - 0.5;
    const y = rise / 2 - course * rise + 0.018 * Math.cos(pitch), z = course * run + 0.018 * Math.sin(pitch);
    roof.add(unit.box, i % 2 ? SLATE : SLATE_L, 0, y, z, width + 0.01, 0.02, slope / 3 - 0.01, pitch, 0, 0);
  }
  return roof;
};
// The gable-end triangle `width` wide and `rise` high on y, a thin infill at the end of a roof (ridge along z; along
// x, alongX).
const gableEnd = (b, width, rise, color, x, y, z, alongX = false) => {
  b.roof(width, rise, 0.02, color, x, y, z, alongX ? Math.PI / 2 : 0);
};
// Oak framing on a plastered wall face `width` wide and `height` tall standing on y, centred at (x, z) and facing
// along ry (0: +z): posts every ~0.22, sill, middle and head rails, and a brace in each end panel.
const halfTimber = (b, x, y, z, width, height, ry = 0) => {
  const at = onFace(x, z, ry), panels = Math.max(2, Math.round(width / 0.22)), panelWidth = width / panels;
  const braceAngle = Math.atan2(height / 2, panelWidth);
  for (let i = 0; i <= panels; i++) {
    const [postX, postZ] = at(-width / 2 + i * panelWidth, 0.012);
    b.box(0.04, height, 0.025, OAK, postX, y, postZ, 0, ry);
  }
  const [midX, midZ] = at(0, 0.012);
  for (const railY of [0, height / 2 - 0.0175, height - 0.035]) {
    b.box(width + 0.02, 0.035, 0.025, OAK, midX, y + railY, midZ, 0, ry);
  }
  for (const side of [-1, 1]) {
    const [braceX, braceZ] = at(side * (width / 2 - panelWidth / 2), 0.012);
    const braceLength = Math.hypot(panelWidth, height / 2);
    b.add(unit.box, OAK, braceX, y + height / 4, braceZ, braceLength, 0.03, 0.025, 0, ry, side * braceAngle);
  }
};
// A pointed (lancet) opening `width` wide on a wall face, its sill at y and its point at y + height, facing along ry
// (0: +z): a straight-sided opening under a square turned 45 degrees for the point.
const lancet = (b, x, y, z, width, height, ry = 0, color = C.dark) => {
  const headSide = width / Math.SQRT2;
  b.box(width, height - width / 2, 0.02, color, x, y, z, 0, ry);
  b.add(unit.box, color, x, y + height - width / 2, z, headSide, headSide, 0.02, 0, ry, Math.PI / 4);
};
// A stepped stone buttress `height` tall standing on y against a wall face at (x, z), projecting along ry (0: +z).
const buttress = (b, x, y, z, height, ry = 0, color = STONE_D) => {
  const [footX, footZ] = onFace(x, z, ry)(0, 0.07), [stepX, stepZ] = onFace(x, z, ry)(0, 0.045);
  b.box(0.1, height * 0.62, 0.14, color, footX, y, footZ, 0, ry);
  b.box(0.08, height * 0.38, 0.09, color, stepX, y + height * 0.62, stepZ, 0, ry);
};
// A battlemented stone wall from (x1, z1) to (x2, z2), `height` tall and `thickness` thick, standing on y, merlons
// along its top.
const curtain = (b, [x1, z1], [x2, z2], y, height, thickness = 0.16) => {
  const length = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(-(z2 - z1), x2 - x1);
  const gaps = Math.max(1, Math.round(length / 0.24));
  b.box(length + thickness, height, thickness, STONE, (x1 + x2) / 2, y, (z1 + z2) / 2, 0, ry);
  for (let i = 0; i <= gaps; i++) {
    const f = i / gaps;
    b.box(0.12, 0.13, thickness + 0.02, STONE_D, x1 + (x2 - x1) * f, y + height, z1 + (z2 - z1) * f, 0, ry);
  }
};
// Merlons round the top (y) of a square block `width` × `depth` centred at (x, z).
const battlements = (b, x, y, z, width, depth, color = STONE_D) => {
  const gapsAcross = Math.max(1, Math.round(width / 0.2)), gapsDeep = Math.max(1, Math.round(depth / 0.2));
  for (const side of [-1, 1]) {
    const edgeZ = z + side * (depth / 2 - 0.04), edgeX = x + side * (width / 2 - 0.04);
    for (let i = 0; i <= gapsAcross; i++) b.box(0.1, 0.12, 0.08, color, x - width / 2 + i * width / gapsAcross, y, edgeZ);
    for (let i = 1; i < gapsDeep; i++) b.box(0.08, 0.12, 0.1, color, edgeX, y, z - depth / 2 + i * depth / gapsDeep);
  }
};
// A heater shield built at the origin for place(), facing +z, its point at y = 0: team-painted with a gold cross.
const heaterShield = team => {
  const shield = new B();
  shield.box(0.15, 0.08, 0.02, team, 0, 0.085, 0);
  shield.add(unit.box, team, 0, 0.075, 0, 0.106, 0.106, 0.02, 0, 0, Math.PI / 4);
  shield.box(0.022, 0.13, 0.024, C.gold, 0, 0.02, 0);
  return shield.box(0.11, 0.022, 0.024, C.gold, 0, 0.11, 0);
};
// A rose window of `radius` built at the origin for place(), facing +z: a stone ring and tracery over dark glass,
// with petals of team colour and gold round a team boss.
const roseWindow = (team, radius) => {
  const rose = new B();
  const disc = (color, discRadius, z) => rose.add(DISC, color, 0, 0, z, discRadius, 0.02, discRadius, Math.PI / 2, 0, 0);
  disc(STONE_D, radius + 0.05, 0);
  disc(GLASS, radius, 0.01);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, petal = radius * 0.27;
    const x = Math.cos(a) * radius * 0.62, y = Math.sin(a) * radius * 0.62;
    rose.add(DISC, i % 2 ? C.gold : team, x, y, 0.02, petal, 0.02, petal, Math.PI / 2, 0, 0);
  }
  // Tracery: four stone bars across the window.
  for (let i = 0; i < 4; i++) {
    rose.add(unit.box, STONE_L, 0, 0, 0.032, radius * 2, radius * 0.07, 0.012, 0, 0, i * Math.PI / 4 + Math.PI / 8);
  }
  disc(team, radius * 0.25, 0.03);
  disc(STONE_L, radius * 0.09, 0.04);
  return rose;
};
// A conical haystack of `radius` and `height` standing on y, with its stack pole poking out of the top.
const haystack = (b, x, z, radius = 0.17, height = 0.44, y = 0.03) => {
  b.cylT(radius * 0.94, radius, height * 0.46, STRAW, x, y, z, 8);
  b.cone(radius * 1.05, height * 0.58, STRAW_D, x, y + height * 0.42, z, 8);
  b.cylT(radius * 0.96, radius * 0.96, 0.025, 0xb8953e, x, y + height * 0.36, z, 8);
  b.cylT(0.012, 0.012, 0.1, C.woodD, x, y + height * 0.95, z, 4);
};
// A two-wheeled cart facing +x built at the origin for place(); load(cart) piles its goods on the bed (top at
// y = 0.19).
const cart = load => {
  const body = new B();
  for (const side of [-1, 1]) {
    body.add(unit.cyl, C.woodD, 0, 0.12, side * 0.15, 0.12, 0.03, 0.12, Math.PI / 2, 0, 0);
    body.add(CYL6, OAK, 0, 0.12, side * 0.168, 0.03, 0.02, 0.03, Math.PI / 2, 0, 0);
  }
  // The bed, its two sides and the tailboard; the shafts.
  body.box(0.5, 0.04, 0.26, C.wood, 0, 0.15, 0);
  body.box(0.5, 0.08, 0.02, C.woodD, 0, 0.19, 0.12);
  body.box(0.5, 0.08, 0.02, C.woodD, 0, 0.19, -0.12);
  body.box(0.02, 0.08, 0.26, C.woodD, -0.25, 0.19, 0);
  for (const side of [-1, 1]) stick(body, 0.014, C.wood, [0.24, 0.17, side * 0.07], [0.6, 0.04, side * 0.07], CYL6);
  load(body);
  return body;
};
// A sheaf stook: three sheaves of wheat leant together, on y.
const stook = (b, x, z, y = 0.03) => {
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + x * 7;
    const sheafX = x + Math.cos(a) * 0.035, sheafZ = z + Math.sin(a) * 0.035;
    b.add(CONE4, STRAW_D, sheafX, y + 0.11, sheafZ, 0.05, 0.22, 0.05, Math.sin(a) * 0.25, a, -Math.cos(a) * 0.25);
  }
  b.add(CYL6, 0xb8953e, x, y + 0.12, z, 0.05, 0.03, 0.05);
};

// Granary: a timber tithe barn. Weatherboarded walls between oak posts on a stone plinth under a huge, steep slate
// roof, its ridge along x, with boarded gable ends (a team loft door in the +x one); a cart porch (midstrey) on the
// long +z side with great team-painted doors and the flag on the ridge. Before it a cart of sacks, sacks by the doors and
// stooks of wheat waiting to come in.
export function granary(ctx) {
  const { b, s: size } = ctx, barn = footprint(-0.84, 0.72, -0.68, 0.12), plinthTop = 0.15, wallHeight = 0.4;
  const eaves = plinthTop + wallHeight, roofRise = 0.82;
  b.box(size, 0.03, size, YARD);
  barnWalls(b, barn, plinthTop, wallHeight, eaves);
  barnRoof(ctx, barn, eaves, roofRise);
  midstrey(ctx, barn, plinthTop, wallHeight, eaves);
  harvestYard(b);
  return eaves + roofRise + 0.03;
}

// The barn's plinth, the boarded walls with battens and the oak frame, and two vents in the +x end.
function barnWalls(b, { left, right, back, front, midX, midZ, width, depth }, plinthTop, wallHeight, eaves) {
  b.box(width + 0.04, plinthTop - 0.03, depth + 0.04, STONE, midX, 0.03, midZ);
  b.box(width, wallHeight, depth, BOARD, midX, plinthTop, midZ);
  for (let x = left + 0.05; x < right - 0.02; x += 0.1) b.box(0.028, wallHeight, 0.012, BOARD_L, x, plinthTop, front + 0.006);
  for (let z = back + 0.05; z < front - 0.02; z += 0.1) b.box(0.012, wallHeight, 0.028, BOARD_L, right + 0.006, plinthTop, z);
  for (const x of [left + 0.03, left + 0.4, 0.37, right - 0.03]) b.box(0.06, wallHeight, 0.05, OAK, x, plinthTop, front + 0.005);
  for (const z of [back + 0.03, front - 0.03]) b.box(0.05, wallHeight, 0.06, OAK, right + 0.005, plinthTop, z);
  b.box(width + 0.06, 0.05, depth + 0.06, OAK, midX, eaves - 0.05, midZ);
  for (const z of [midZ - 0.2, midZ + 0.2]) b.box(0.014, 0.16, 0.035, C.dark, right + 0.014, plinthTop + 0.12, z);
}

// The barn roof and its boarded gable ends, the team loft door in the +x one; the flag on the ridge.
function barnRoof(ctx, { left, right, midX, midZ, width, depth }, eaves, rise) {
  const { b, t: team } = ctx, span = depth + 0.26;
  place(b, slateRoof(span, rise, width + 0.04), midX, eaves, midZ, Math.PI / 2);
  const gableWidth = span - 0.1, gableRise = rise * gableWidth / span, gableX = right + 0.034;
  for (const x of [gableX, left - 0.034]) gableEnd(b, gableWidth, gableRise, BOARD, x, eaves, midZ, true);
  // Battens up the +x gable, each as tall as the gable is over it.
  for (let i = 1; i < 8; i++) {
    const z = midZ - gableWidth / 2 + i * gableWidth / 8, height = gableRise * (1 - Math.abs(z - midZ) / (gableWidth / 2));
    b.box(0.012, height * 0.96, 0.026, BOARD_L, gableX + 0.012, eaves, z);
  }
  b.box(0.016, 0.22, 0.2, OAK, gableX + 0.018, eaves + 0.08, midZ);
  b.box(0.016, 0.18, 0.16, team, gableX + 0.024, eaves + 0.1, midZ);
  flag(ctx, left + 0.12, eaves + rise - 0.02, midZ, 0.45);
}

// The midstrey: a gabled cart porch out from the barn's front, with great team doors.
function midstrey(ctx, barn, plinthTop, wallHeight, eaves) {
  const { b } = ctx, x = -0.06, width = 0.58, front = barn.front + 0.42;
  const depth = front - barn.front, midZ = (barn.front + front) / 2;
  b.box(width + 0.04, plinthTop - 0.03, depth, STONE, x, 0.03, midZ);
  for (const side of [-1, 1]) {
    b.box(0.05, wallHeight, depth, BOARD, x + side * (width / 2 - 0.025), plinthTop, midZ);
    b.box(0.06, wallHeight, 0.06, OAK, x + side * width / 2, plinthTop, front);
  }
  b.box(width + 0.06, 0.06, 0.06, OAK, x, eaves - 0.06, front);
  midstreyDoors(ctx, x, width, front, plinthTop, wallHeight);
  const roofSpan = width + 0.18, roofRise = 0.48;
  place(b, slateRoof(roofSpan, roofRise, depth + 0.34), x, eaves, (front + barn.front - 0.32) / 2);
  gableEnd(b, roofSpan - 0.08, roofRise * (roofSpan - 0.08) / roofSpan, BOARD, x, eaves, front + 0.022);
}

// The midstrey's two great team doors, each Z-braced in oak: two rails and a diagonal brace.
function midstreyDoors(ctx, porchX, porchWidth, front, plinthTop, wallHeight) {
  const { b, t: team } = ctx, leafWidth = (porchWidth - 0.08) / 2, leafHeight = wallHeight - 0.07;
  const braceLength = Math.hypot(leafWidth - 0.04, leafHeight - 0.1), braceAngle = Math.atan2(leafHeight - 0.1, leafWidth - 0.04);
  for (const side of [-1, 1]) {
    const x = porchX + side * leafWidth / 2;
    b.box(leafWidth - 0.01, leafHeight, 0.025, team, x, plinthTop, front - 0.01);
    for (const railY of [0.04, leafHeight - 0.07]) b.box(leafWidth - 0.03, 0.03, 0.012, OAK, x, plinthTop + railY, front + 0.006);
    b.add(unit.box, OAK, x, plinthTop + leafHeight / 2, front + 0.006, braceLength, 0.03, 0.012, 0, 0, side * braceAngle);
  }
}

// Before the barn: a cart of sacks, sacks by the doors, stooks of wheat.
function harvestYard(b) {
  const loadSacks = bed => {
    for (const [dx, dy, dz] of [[-0.14, 0, -0.06], [0, 0, 0.06], [0.13, 0, -0.05], [-0.06, 0.11, 0], [0.08, 0.11, 0.02]]) {
      sack(bed, dx, 0.19 + dy, dz, 0.07);
    }
  };
  place(b, cart(loadSacks), 0.42, 0.03, 0.72, -0.35);
  for (const [x, z] of [[0.33, 0.66], [0.3, 0.48]]) sack(b, x, 0.03, z, 0.08);
  for (const [x, z] of [[-0.68, 0.42], [-0.48, 0.68], [-0.74, 0.76], [-0.28, 0.82]]) stook(b, x, z);
}

// The treadwheel built at the origin, its axle along z (it turns about z): two oak rims joined by treads (two of them
// team-painted, so the turning shows) and spoked to the axle.
const treadwheel = (team, radius, width) => {
  const wheel = new B(), rim = new THREE.TorusGeometry(radius, 0.028, 4, 16);
  for (const side of [-1, 1]) {
    wheel.add(rim, C.wood, 0, 0, side * width / 2, 1, 1, 1);
    for (let i = 0; i < 4; i++) {
      const spokeAngle = i * Math.PI / 4 + (side > 0 ? Math.PI / 8 : 0);
      wheel.add(unit.box, C.woodD, 0, 0, side * width / 2, radius * 2, 0.034, 0.03, 0, 0, spokeAngle);
    }
  }
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI / 7;
    wheel.add(unit.box, i % 7 ? C.wood : team, Math.cos(a) * radius, Math.sin(a) * radius, 0, 0.03, 0.07, width + 0.05, 0, 0, a);
  }
  rim.dispose();
  return wheel.add(CYL8, OAK, 0, 0, 0, 0.055, width + 0.1, 0.055, Math.PI / 2, 0, 0).geometry();
};
// Storage Pit: a timber store and a treadwheel crane. The store has a stone ground floor with team doors and shutters
// under a jettied, half-timbered upper floor and a slate roof flying the flag. The crane's treadwheel (an animated
// spinner) turns on its trestles and winds the rope up the post and along the jib to a block of stone; the wood, stone
// and gold brought in lie about the cobbled yard: logs half under a team cloth, dressed stone, a strongbox and barrels.
export function storage_pit(ctx) {
  const { b, s: size } = ctx, store = footprint(-0.86, 0.16, -0.86, -0.22), jetty = 0.06;
  const groundHeight = 0.38, upperHeight = 0.36, floorY = 0.03 + groundHeight, upperY = floorY + 0.04;
  b.box(size, 0.03, size, COBBLE);
  storeGroundFloor(ctx, store, groundHeight);
  const upper = footprint(store.left, store.right + jetty, store.back, store.front + jetty);
  storeUpperFloor(b, store, upper, jetty, floorY, upperY, upperHeight);
  storeRoof(ctx, upper, upperY + upperHeight);
  const jibTipY = treadwheelCrane(ctx);
  storeYard(b, ctx.t);
  return jibTipY + 0.04;
}

// The stone ground floor: quoins, the team doors under an oak lintel, a shuttered window on the +x side.
function storeGroundFloor(ctx, { right, front, midX, midZ, width, depth }, height) {
  const { b, t: team } = ctx;
  b.box(width, height, depth, STONE, midX, 0.03, midZ);
  // Quoins up the front corner, long and short stones alternating on its two faces.
  for (let i = 0; i < 4; i++) {
    const odd = i % 2, y = 0.035 + i * height / 4, stoneHeight = height / 4 - 0.01;
    b.box(odd ? 0.08 : 0.14, stoneHeight, 0.014, STONE_L, right - (odd ? 0.04 : 0.07), y, front + 0.007);
    b.box(0.014, stoneHeight, odd ? 0.14 : 0.08, STONE_L, right + 0.007, y, front - (odd ? 0.07 : 0.04));
  }
  // The doors: two team leaves, the gap between them, the lintel and two iron straps.
  const doorX = midX - 0.1;
  b.box(0.36, 0.3, 0.014, team, doorX, 0.03, front + 0.007);
  b.box(0.014, 0.3, 0.02, C.dark, doorX, 0.03, front + 0.012);
  b.box(0.44, 0.06, 0.04, OAK, doorX, 0.33, front + 0.012);
  for (const y of [0.09, 0.24]) b.box(0.32, 0.018, 0.02, P.iron, doorX, y, front + 0.015);
  // The window and its two team shutters, open.
  b.box(0.014, 0.14, 0.12, C.dark, right + 0.007, 0.16, midZ);
  b.box(0.014, 0.14, 0.06, team, right + 0.012, 0.16, midZ - 0.1);
  b.box(0.014, 0.14, 0.06, team, right + 0.012, 0.16, midZ + 0.1);
}

// The jetty: joist ends under the upper floor, which overhangs the +z and +x faces; its plaster, oak framing and
// windows.
function storeUpperFloor(b, store, upper, jetty, floorY, upperY, height) {
  const { right, front, midX, midZ, width, depth } = upper;
  b.box(width, 0.04, depth, OAK, midX, floorY, midZ);
  for (let x = store.left + 0.06; x < right; x += 0.12) b.box(0.03, 0.03, jetty, OAK, x, floorY - 0.03, store.front + jetty / 2);
  b.box(width, height, depth, PLASTER, midX, upperY, midZ);
  halfTimber(b, midX, upperY, front, width, height, 0);
  halfTimber(b, right, upperY, midZ, depth, height, Math.PI / 2);
  for (const x of [midX - 0.3, midX + 0.25]) b.box(0.13, 0.12, 0.02, GLASS, x, upperY + 0.2, front + 0.02);
  b.box(0.02, 0.12, 0.13, GLASS, right + 0.02, upperY + 0.2, midZ);
}

// The store's roof, its half-timbered +x gable (a king post and a tie beam), and the flag.
function storeRoof(ctx, { left, right, midX, midZ, width, depth }, eaves) {
  const { b } = ctx, span = depth + 0.22, rise = 0.48, gableWidth = span - 0.1, gableRise = rise * gableWidth / span;
  place(b, slateRoof(span, rise, width + 0.06), midX, eaves, midZ, Math.PI / 2);
  gableEnd(b, gableWidth, gableRise, PLASTER, right + 0.042, eaves, midZ, true);
  b.box(0.026, gableRise * 0.9, 0.04, OAK, right + 0.054, eaves, midZ);
  b.box(0.026, 0.035, gableWidth - 0.04, OAK, right + 0.054, eaves, midZ);
  flag(ctx, left + 0.12, eaves + rise - 0.02, midZ, 0.45);
}

// The treadwheel crane: trestles carrying the wheel's axle, the post and jib, the rope, and the stone on the hook.
// Returns the height of the jib's tip.
function treadwheelCrane(ctx) {
  const { b, t: team, extra } = ctx, wheelX = 0.5, axleY = 0.45, wheelZ = 0.36, radius = 0.36, wheelWidth = 0.22;
  const wheelBack = wheelZ - wheelWidth / 2;
  for (const z of [wheelBack - 0.07, wheelZ + wheelWidth / 2 + 0.07]) trestle(b, wheelX, axleY, z);
  b.add(CYL8, OAK, wheelX, axleY, wheelZ, 0.028, wheelWidth + 0.34, 0.028, Math.PI / 2, 0, 0);
  extra.spinners = [{ geo: treadwheel(team, radius, wheelWidth), at: [wheelX, axleY, wheelZ], axis: 'z', speed: 0.9 }];
  const postZ = wheelBack - 0.2, tip = [0.86, 1.62, -0.42];
  craneJib(b, wheelX, postZ, tip);
  craneRope(b, [wheelX, axleY, wheelBack - 0.12], [wheelX, 1.38, postZ], tip);
  return tip[1];
}

// A trestle standing across x at z, carrying the treadwheel's axle at (x, axleY): its foot beam, two legs, the
// axle block and a cross brace.
function trestle(b, x, axleY, z) {
  b.box(0.66, 0.04, 0.05, OAK, x, 0.03, z);
  for (const side of [-1, 1]) stick(b, 0.022, C.woodD, [x + side * 0.27, 0.06, z], [x, axleY + 0.04, z], unit.box);
  b.box(0.07, 0.07, 0.06, OAK, x, axleY - 0.035, z);
  b.box(0.34, 0.025, 0.025, C.woodD, x, 0.22, z);
}

// The crane's post at (x, z) on its stone step, the jib up to `tip` and its brace, and the pulleys at both ends.
function craneJib(b, x, z, tip) {
  b.box(0.16, 0.06, 0.16, STONE_D, x, 0.03, z);
  b.box(0.08, 1.36, 0.08, C.woodD, x, 0.09, z);
  stick(b, 0.03, C.wood, [x, 1.18, z], tip, unit.box);
  stick(b, 0.02, C.woodD, [x, 0.8, z], lerp([x, 1.18, z], tip, 0.45), unit.box);
  b.add(CYL8, OAK, x, 1.4, z, 0.06, 0.04, 0.06, Math.PI / 2, 0, 0);
  b.add(CYL8, OAK, tip[0], tip[1] - 0.02, tip[2], 0.045, 0.04, 0.045, Math.PI / 2, 0, Math.PI / 4);
}

// The rope from the treadwheel's drum up over the post top and along the jib, down to the hook, its two slings and
// the block of stone they lift.
function craneRope(b, drum, postTop, [tipX, tipY, tipZ]) {
  const sheave = [tipX, tipY - 0.05, tipZ];
  stick(b, 0.008, ROPE, drum, postTop, CYL6);
  stick(b, 0.008, ROPE, postTop, sheave, CYL6);
  stick(b, 0.008, ROPE, sheave, [tipX, 0.66, tipZ], CYL6);
  b.box(0.05, 0.03, 0.05, P.iron, tipX, 0.63, tipZ);
  for (const side of [-1, 1]) stick(b, 0.006, ROPE, [tipX, 0.64, tipZ], [tipX + side * 0.09, 0.52, tipZ], CYL6);
  b.box(0.22, 0.14, 0.18, STONE_L, tipX, 0.38, tipZ);
}

// The goods in the yard: logs half under a team cloth, dressed stone, the strongbox of gold, barrels.
function storeYard(b, team) {
  const logs = [[-0.74, 0.03], [-0.6, 0.03], [-0.46, 0.03], [-0.67, 0.15], [-0.53, 0.15]];
  for (const [i, [x, y]] of logs.entries()) {
    stick(b, 0.065, i % 2 ? C.woodD : C.wood, [x, y + 0.065, 0.06], [x, y + 0.065, 0.66], CYL6);
  }
  for (const side of [-1, 1]) b.box(0.17, 0.014, 0.3, team, -0.6 + side * 0.075, 0.25, 0.48, 0, 0, -side * 0.55);
  for (const [x, z, ry] of [[-0.24, 0.12, 0.1], [-0.12, 0.3, -0.25]]) b.box(0.2, 0.14, 0.15, STONE_L, x, 0.03, z, 0, ry);
  b.box(0.18, 0.12, 0.14, STONE, -0.2, 0.17, 0.2, 0, 0.35);
  strongbox(b, -0.28, 0.62);
  barrel(b, 0.04, 0.03, 0.78);
  barrel(b, -0.06, 0.03, 0.9, 0.065);
  barrel(b, 0.16, 0.03, 0.88, 0.065);
}

// A strongbox at (x, z): an iron-bound chest with gold coins on its lid.
function strongbox(b, x, z) {
  b.box(0.24, 0.14, 0.16, C.wood, x, 0.03, z);
  b.box(0.26, 0.03, 0.18, P.iron, x, 0.17, z);
  b.box(0.03, 0.15, 0.17, P.iron, x - 0.08, 0.03, z);
  b.box(0.03, 0.15, 0.17, P.iron, x + 0.08, 0.03, z);
  for (const [dx, dz] of [[-0.04, 0.0], [0.04, 0.03], [0.0, -0.04]]) b.cylT(0.03, 0.03, 0.02, C.gold, x + dx, 0.2, z + dz, 6);
}

// The farm's grass balks between its strips (also where the stakes stand).
const FARM_BALKS = [-0.51, -0.17, 0.17, 0.51];
// Farm: strip fields. Five long strips of ridge and furrow between grass balks, ending at a grass headland: a hay
// meadow with three haystacks, two strips of wheat and one of barley (extra.crops, which animate() shows once the farm is
// finished and shrinks as the food runs out), and one ploughed and fallow, the plough left at its end. A scarecrow in a
// team tunic keeps the barley, a hay rake leans on a stack, team-capped stakes mark the strips' ends and the flag flies
// from the headland.
export function farm(ctx) {
  const { b, h: half, t: team, extra } = ctx, strips = [-0.68, -0.34, 0, 0.34, 0.68], fieldBack = -half + 0.02, fieldFront = 0.74;
  stripFields(ctx, strips, fieldBack, fieldFront);
  meadow(b, strips[0]);
  plough(b);
  const scarecrowX = strips[3], scarecrowZ = 0.12;
  scarecrow(b, team, scarecrowX, scarecrowZ);
  // Team-capped stakes at the strips' ends, and the flag over the headland.
  for (const x of FARM_BALKS) {
    b.box(0.03, 0.2, 0.03, C.woodD, x, 0.03, fieldFront + 0.02);
    b.box(0.045, 0.05, 0.045, team, x, 0.2, fieldFront + 0.02);
  }
  flag(ctx, -half + 0.08, 0.05, half - 0.36, 0.62, C.woodD, [0.2, 0.34]);
  extra.crops = cropRows(strips, fieldBack, scarecrowX, scarecrowZ);
  return 0.7;
}

// The soil, the grass headland in front of the fields, the balks and each strip's ridges; the meadow is grassed
// over, the fallow strip freshly ploughed.
function stripFields(ctx, strips, back, front) {
  const { b, s: size, h: half } = ctx, length = front - back, midZ = (back + front) / 2;
  b.box(size, 0.03, size, SOIL);
  b.box(size, 0.02, half - front, GRASS, 0, 0.03, (front + half) / 2);
  for (const x of FARM_BALKS) b.box(0.04, 0.025, length, GRASS, x, 0.03, midZ);
  for (const [i, x] of strips.entries()) {
    if (i === 0) {
      b.box(0.3, 0.015, length, GRASS_L, x, 0.03, midZ);
      continue;
    }
    for (const ridge of [-0.09, 0, 0.09]) b.box(0.07, 0.016, length - 0.02, i === 2 ? SOIL_L : 0x5e482c, x + ridge, 0.03, midZ);
  }
}

// The meadow strip at x: its haystacks, a hay rake against one.
function meadow(b, x) {
  for (const [z, radius] of [[-0.58, 0.17], [-0.14, 0.16], [0.3, 0.17]]) haystack(b, x, z, radius, 0.44 + radius);
  stick(b, 0.01, C.wood, [x + 0.2, 0.03, 0.38], [x + 0.1, 0.5, 0.33], CYL6);
}

// A plough left at the end of the fallow strip: its beam, two handles and the iron share.
function plough(b) {
  stick(b, 0.018, C.woodD, [0.0, 0.07, 0.45], [0.0, 0.07, 0.72], unit.box);
  stick(b, 0.014, C.woodD, [0.0, 0.07, 0.48], [-0.05, 0.3, 0.36], unit.box);
  stick(b, 0.014, C.woodD, [0.0, 0.07, 0.48], [0.05, 0.3, 0.36], unit.box);
  b.box(0.05, 0.03, 0.1, P.iron, 0, 0.04, 0.72);
}

// The scarecrow among the barley: a post and cross-arm in a team tunic and sleeves, a sackcloth head and a straw hat.
function scarecrow(b, team, x, z) {
  b.box(0.03, 0.5, 0.03, C.woodD, x, 0.03, z);
  b.box(0.3, 0.025, 0.025, C.woodD, x, 0.4, z);
  b.box(0.15, 0.2, 0.08, team, x, 0.24, z);
  b.box(0.1, 0.06, 0.06, team, x - 0.11, 0.37, z);
  b.box(0.1, 0.06, 0.06, team, x + 0.11, 0.37, z);
  b.add(BALL, C.cloth, x, 0.5, z, 0.055, 0.06, 0.055);
  b.cone(0.09, 0.07, STRAW, x, 0.53, z, 8);
}

// Wheat and barley in rows along the ridges, ripening unevenly; clear of the scarecrow. Each stalk is a cone, leant
// a little, with its ear on top; returns the crops' geometry.
function cropRows(strips, back, scarecrowX, scarecrowZ) {
  const crops = new B();
  const fields = [[strips[1], 0xc9a84a, 0xe2c050], [strips[3], 0x7f9a3a, 0xa8b858], [strips[4], 0xd2ae4e, 0xe2c050]];
  for (const [x, stalkColor, earColor] of fields) {
    for (let row = 0; row < 13; row++) for (const [ridge, ridgeX] of [-0.09, 0, 0.09].entries()) {
      const z = back + 0.08 + row * 0.124 + (hash(row, ridge) - 0.5) * 0.03;
      const stalkX = x + ridgeX + (hash(ridge + 3, row) - 0.5) * 0.02;
      if (Math.hypot(stalkX - scarecrowX, z - scarecrowZ) < 0.11) continue;
      const height = 0.17 + hash(row + 5, ridge + Math.round(x * 10)) * 0.07, lean = (hash(row * 3, ridge + 1) - 0.5) * 0.3;
      const earX = stalkX + Math.sin(lean) * height * 0.5, earZ = z + Math.sin(lean) * height * 0.25;
      crops.add(CONE4, stalkColor, stalkX, 0.045 + height / 2, z, 0.05, height, 0.05, lean, 0, -lean);
      crops.add(CONE4, earColor, earX, 0.045 + height * 0.95, earZ, 0.03, 0.1, 0.03, lean, 0, -lean);
    }
  }
  return crops.geometry();
}

// Barracks: a stone barracks behind a gatehouse. A battlemented curtain wall closes a trodden yard; at the front the
// gatehouse, two square towers either side of a pointed gate with its portcullis half raised, a team shield over it,
// team banners on the towers and the flag; at the back the barrack hall, lancet windows between buttresses, a team door,
// a slate roof and a chimney. In the yard: a quintain with a team shield, pells for sword drill and a rack of spears
// and team shields.
export function barracks(ctx) {
  const { b, s: size, h: half, t: team } = ctx, edge = half - 0.12, y = 0.05, wallHeight = 0.46;
  const gateBack = edge - 0.3, towerHeight = 1.42, hallFront = -0.5;
  b.box(size, y, size, YARD);
  // The curtain wall, broken at the front for the gatehouse.
  curtain(b, [-edge, -edge], [edge, -edge], y, wallHeight);
  curtain(b, [-edge, -edge], [-edge, edge], y, wallHeight);
  curtain(b, [edge, -edge], [edge, edge], y, wallHeight);
  for (const side of [-1, 1]) curtain(b, [side * edge, edge], [side * 0.6, edge], y, wallHeight);
  gatehouse(ctx, gateBack, edge + 0.16, y, towerHeight);
  barrackHall(b, team, -edge + 0.08, hallFront, y);
  drillYard(b, team, y, gateBack, hallFront);
  return y + towerHeight + 0.12;
}

// The gatehouse from z = back to front: its block, the two towers, the gate and portcullis, the shield over it, the
// flag on a tower.
function gatehouse(ctx, back, front, y, towerHeight) {
  const { b, t: team } = ctx, midZ = (back + front) / 2, height = 1.1, towerZ = front - 0.14;
  b.box(0.9, height, front - back, STONE, 0, y, midZ);
  battlements(b, 0, y + height, midZ, 0.9, front - back);
  for (const side of [-1, 1]) gateTower(b, team, side * 0.5, side, y, towerZ, towerHeight);
  lancet(b, 0, y, front + 0.002, 0.36, 0.66);
  portcullis(b, y, front);
  place(b, heaterShield(team), 0, y + 0.72, front + 0.012, 0, 1.5);
  flag(ctx, 0.5, y + towerHeight + 0.12, towerZ, 0.55);
}

// A gate tower at (x, z) on the `side` (-1 or 1) of the gate: its string course and battlements, arrow slits in its
// front and outer side, and a team banner on a gold rod.
function gateTower(b, team, x, side, y, z, height) {
  b.box(0.36, height, 0.44, STONE, x, y, z);
  b.box(0.38, 0.04, 0.46, STONE_D, x, y + 0.95, z);
  battlements(b, x, y + height, z, 0.36, 0.44);
  b.box(0.04, 0.2, 0.02, C.dark, x, y + 1.08, z + 0.225);
  b.box(0.02, 0.2, 0.04, C.dark, x + side * 0.185, y + 0.6, z);
  b.box(0.16, 0.42, 0.012, team, x, y + 0.42, z + 0.226);
  b.box(0.2, 0.025, 0.025, C.gold, x, y + 0.84, z + 0.23);
}

// The portcullis in the gate on the wall face at z, half raised: spiked iron bars and two cross rails.
function portcullis(b, y, z) {
  for (let i = -2; i <= 2; i++) {
    b.box(0.018, 0.34, 0.02, P.iron, i * 0.065, y + 0.24, z + 0.016);
    b.cone(0.012, 0.04, P.iron, i * 0.065, y + 0.2, z + 0.016, 4);
  }
  for (const railY of [0.32, 0.46]) b.box(0.3, 0.018, 0.02, P.iron, 0, y + railY, z + 0.018);
}

// The barrack hall from z = back to front: lancets between buttresses, the team door under a stone arch, the roof,
// stone gables and a chimney.
function barrackHall(b, team, back, front, y) {
  const halfLength = 1.06, midZ = (back + front) / 2, depth = front - back, height = 0.78;
  b.box(2 * halfLength, height, depth, STONE, 0, y, midZ);
  for (const x of [-0.92, -0.62, -0.3, 0.3, 0.62, 0.92]) lancet(b, x, y + 0.3, front + 0.011, 0.11, 0.36);
  for (const x of [-0.77, -0.46, 0.46, 0.77]) buttress(b, x, y, front, height);
  lancet(b, 0, y, front + 0.011, 0.3, 0.56, 0, STONE_D);
  lancet(b, 0, y, front + 0.021, 0.22, 0.48, 0, team);
  for (let i = 0; i < 3; i++) lancet(b, halfLength + 0.011, y + 0.3, midZ - 0.2 + i * 0.2, 0.09, 0.32, Math.PI / 2);
  place(b, slateRoof(depth + 0.18, 0.5, 2 * halfLength + 0.06), 0, y + height, midZ, Math.PI / 2);
  for (const side of [-1, 1]) {
    gableEnd(b, depth + 0.08, 0.5 * (depth + 0.08) / (depth + 0.18), STONE, side * (halfLength + 0.042), y + height, midZ, true);
  }
  b.box(0.17, 0.66, 0.17, STONE_D, 0.72, y + height, midZ - 0.06);
  b.box(0.21, 0.05, 0.21, STONE, 0.72, y + height + 0.66, midZ - 0.06);
}

// The yard: the path from the gate to the hall, a quintain, pells and the weapon rack.
function drillYard(b, team, y, gateBack, hallFront) {
  b.box(0.38, 0.008, gateBack - hallFront, COBBLE, 0, y, (gateBack + hallFront) / 2);
  quintain(b, team, -0.6, y, 0.15);
  for (const [x, z] of [[-0.95, -0.15], [-0.75, 0.62], [-0.32, 0.6]]) {
    b.box(0.08, 0.42, 0.08, C.wood, x, y, z);
    b.box(0.1, 0.03, 0.1, C.woodD, x, y + 0.42, z);
  }
  weaponRack(b, team, 0.66, y, 0.05);
}

// A quintain at (x, z): a post with a pivoting arm, a team shield on one end and a sandbag hung from the other.
function quintain(b, team, x, y, z) {
  b.box(0.06, 0.56, 0.06, C.woodD, x, y, z);
  b.box(0.06, 0.04, 0.06, P.iron, x, y + 0.56, z);
  stick(b, 0.018, C.wood, [x - 0.24, y + 0.58, z + 0.06], [x + 0.22, y + 0.58, z - 0.06], unit.box);
  place(b, heaterShield(team), x - 0.25, y + 0.46, z + 0.08, 0.25, 1.1);
  stick(b, 0.006, ROPE, [x + 0.21, y + 0.57, z - 0.06], [x + 0.21, y + 0.4, z - 0.06], CYL6);
  b.add(BALL, C.cloth, x + 0.21, y + 0.35, z - 0.06, 0.06, 0.08, 0.06);
}

// A weapon rack at (x, z): two uprights and two rails, five spears leant on it and three team shields hung on it.
function weaponRack(b, team, x, y, z) {
  for (const dx of [-0.24, 0.24]) b.box(0.05, 0.5, 0.05, C.woodD, x + dx, y, z);
  b.box(0.54, 0.035, 0.05, C.wood, x, y + 0.46, z);
  b.box(0.54, 0.035, 0.05, C.wood, x, y + 0.12, z + 0.08);
  for (let i = 0; i < 5; i++) {
    const spearX = x - 0.18 + i * 0.09;
    stick(b, 0.009, C.wood, [spearX, y + 0.02, z + 0.12], [spearX - 0.01, y + 0.82, z - 0.02], CYL6);
    b.cone(0.016, 0.07, P.iron, spearX - 0.01, y + 0.82, z - 0.02, 4);
  }
  for (const dx of [-0.16, 0, 0.16]) place(b, heaterShield(team), x + dx, y + 0.26, z + 0.04, 0, 0.95);
}

// Archery Range: timber butts and targets on a green. Three butts at the back, each a turf bank faced with oak planks
// between posts and a straw boss painted with team and white rings round a gold heart, arrows in it; mown lanes with
// distance pegs run back to the shooting line, a team pavise and a quiver at each mark. At the front an open timber
// shooting shed under slate holds a bow rack and arrow barrels under the flag; a post-and-rail fence closes the right.
export function archery_range(ctx) {
  const { b, s: size, h: half, t: team } = ctx, y = 0.05, lanes = [-0.84, 0, 0.84], buttZ = -half + 0.3, line = 0.6;
  b.box(size, y, size, GRASS);
  for (const x of lanes) b.box(0.56, 0.008, 1.95, GRASS_L, x, y, -0.18);
  for (const [i, x] of lanes.entries()) {
    butt(b, x, y, buttZ);
    strawTarget(b, team, x, y + 0.28, buttZ + 0.15, 2 + (i % 2));
    shootingMark(b, team, x, y, line);
  }
  // The shooting line: a rope on low posts.
  for (const x of [-1.25, -0.42, 0.42, 1.25]) b.box(0.04, 0.2, 0.04, C.woodD, x, y, line);
  b.box(2.5, 0.015, 0.015, ROPE, 0, y + 0.18, line);
  const postHeight = shootingShed(ctx, y);
  // The fence down the right-hand side.
  const fenceX = half - 0.08;
  for (let z = -half + 0.12; z <= half - 0.1; z += 0.42) b.box(0.05, 0.34, 0.05, C.woodD, fenceX, y, z);
  for (const railY of [0.14, 0.28]) b.box(0.03, 0.03, 2 * half - 0.2, C.wood, fenceX, y + railY, 0);
  return y + postHeight + 0.4;
}

// A butt at the end of the lane at x: a turf bank faced with planks between two posts, under a beam.
function butt(b, x, y, z) {
  b.add(FRUSTUM, TURF, x, y + 0.25, z - 0.06, 0.36, 0.5, 0.17);
  for (let i = 0; i < 6; i++) b.box(0.105, 0.46, 0.03, i % 2 ? C.wood : 0x8a6238, x - 0.26 + i * 0.104, y, z + 0.13);
  for (const side of [-1, 1]) b.box(0.06, 0.54, 0.06, OAK, x + side * 0.33, y, z + 0.14);
  b.box(0.74, 0.05, 0.07, OAK, x, y + 0.49, z + 0.14);
}

// A straw target boss facing +z at (x, y, z), painted in rings round a gold heart, with `arrows` (2 or 3) in it.
function strawTarget(b, team, x, y, z, arrows) {
  const rings = [[STRAW, 0.18, 0.03], [team, 0.15, 0.06], [LIMEWASH, 0.105, 0.064], [team, 0.065, 0.068], [C.gold, 0.03, 0.072]];
  for (const [color, radius, dz] of rings) {
    b.add(DISC, color, x, y, z + dz, radius, color === STRAW ? 0.06 : 0.01, radius, Math.PI / 2, 0, 0);
  }
  for (const [dx, dy] of [[0.05, 0.04], [-0.08, -0.05], [0.02, -0.1]].slice(0, arrows)) {
    const head = [x + dx, y + dy, z + 0.075];
    stick(b, 0.007, C.wood, head, [head[0] + 0.015, head[1] + 0.02, head[2] + 0.26], CYL6);
    b.box(0.004, 0.03, 0.06, LIMEWASH, head[0] + 0.015, head[1] + 0.005, head[2] + 0.22);
  }
}

// The lane at x's mark on the shooting line: a team pavise and a quiver of arrows; distance pegs down the lane.
function shootingMark(b, team, x, y, line) {
  b.box(0.17, 0.3, 0.025, team, x + 0.16, y, line + 0.06, -0.2);
  b.box(0.03, 0.3, 0.03, C.gold, x + 0.16, y, line + 0.07, -0.2);
  b.cylT(0.04, 0.035, 0.18, C.leather, x - 0.14, y, line + 0.04, 6);
  for (const dx of [-0.015, 0.015]) b.box(0.006, 0.07, 0.006, LIMEWASH, x - 0.14 + dx, y + 0.18, line + 0.04);
  for (const z of [-0.45, 0.1]) {
    b.box(0.03, 0.12, 0.03, C.woodD, x + 0.3, y, z);
    b.box(0.035, 0.03, 0.035, LIMEWASH, x + 0.3, y + 0.12, z);
  }
}

// The shooting shed: posts, beams and a slate roof; a bow rack and arrow barrels under it; the flag. Returns its posts'
// height.
function shootingShed(ctx, y) {
  const { b } = ctx, postHeight = 0.6;
  const { left, right, back, front, midX, midZ, width, depth } = footprint(-1.28, 0.24, 0.88, 1.28);
  b.box(width + 0.08, 0.03, depth + 0.08, 0x7a6a4c, midX, y, midZ);
  for (const x of [left, (2 * left + right) / 3, (left + 2 * right) / 3, right]) {
    for (const z of [back, front]) b.box(0.06, postHeight, 0.06, OAK, x, y, z);
  }
  for (const z of [back, front]) b.box(width + 0.06, 0.05, 0.06, OAK, midX, y + postHeight, z);
  for (const x of [left, right]) b.box(0.06, 0.05, depth, OAK, x, y + postHeight, midZ);
  place(b, slateRoof(depth + 0.24, 0.34, width + 0.12), midX, y + postHeight + 0.05, midZ, Math.PI / 2);
  gableEnd(b, depth + 0.14, 0.34 * (depth + 0.14) / (depth + 0.24), BOARD, right + 0.072, y + postHeight + 0.05, midZ, true);
  flag(ctx, left + 0.1, y + postHeight + 0.36, midZ, 0.5);
  shedGear(b, left, y, midZ);
  return postHeight;
}

// Under the shed: the bow rack, a pole with three bows hung on it, and barrels of arrows, their fletchings showing.
function shedGear(b, left, y, midZ) {
  stick(b, 0.016, C.woodD, [left + 0.15, y + 0.42, midZ + 0.12], [left + 0.8, y + 0.42, midZ + 0.12], CYL6);
  for (const dx of [0.25, 0.45, 0.65]) {
    b.add(unit.tor, C.woodD, left + dx, y + 0.28, midZ + 0.12, 0.14, 0.14, 0.14, 0, 0, Math.PI / 2);
  }
  for (const [x, z] of [[-0.2, midZ], [-0.05, midZ + 0.08]]) {
    barrel(b, x, y + 0.03, z);
    for (const dx of [-0.02, 0.02]) b.box(0.006, 0.07, 0.006, LIMEWASH, x + dx, y + 0.2, z);
  }
}

// Stable: a timber stable with a hay loft, its gable to the front. Weatherboarded stalls on a stone plinth open on the
// +x side onto the paddock through dutch doors, their lower leaves team-painted, two horses looking out; above them the
// jettied, half-timbered hay loft under a steep slate roof, its loft door full of hay in the front wall and a hoist beam
// over it lifting a bale. The paddock's post-and-rail fence holds two horses in team saddle cloths, a water trough and a
// hay crib; the flag flies from the ridge.
export function stable(ctx) {
  const { b, s: size, h: half } = ctx, y = 0.05, stalls = footprint(-half + 0.08, -0.42, -half + 0.1, 0.62);
  const plinthTop = 0.13, stallHeight = 0.56, jetty = 0.07, loftHeight = 0.42, floorY = plinthTop + stallHeight;
  const loftY = floorY + 0.04;
  b.box(size, y, size, YARD);
  stableStalls(ctx, stalls, y, plinthTop, stallHeight);
  const loft = footprint(stalls.left, stalls.right + jetty, stalls.back, stalls.front);
  hayLoft(ctx, stalls, loft, jetty, floorY, loftY, loftHeight);
  const roofRise = 0.62, eaves = loftY + loftHeight;
  loftRoof(ctx, loft, eaves, roofRise, loftY);
  haystack(b, stalls.left + 0.22, half - 0.3, 0.16, 0.38, y);
  paddock(ctx, stalls, y);
  return eaves + roofRise + 0.03;
}

// The stalls: the plinth, the boarded walls and battens, four dutch doors, two horses looking out.
function stableStalls(ctx, { left, right, back, front, midX, midZ, width, depth }, y, plinthTop, height) {
  const { b, t: team } = ctx;
  b.box(width + 0.04, plinthTop - y, depth + 0.04, STONE, midX, y, midZ);
  b.box(width, height, depth, BOARD, midX, plinthTop, midZ);
  for (let z = back + 0.05; z < front - 0.02; z += 0.1) b.box(0.012, height, 0.028, BOARD_L, right + 0.006, plinthTop, z);
  for (let x = left + 0.05; x < right - 0.02; x += 0.1) b.box(0.028, height, 0.012, BOARD_L, x, plinthTop, front + 0.006);
  for (const [i, z] of [-1.0, -0.54, -0.08, 0.38].entries()) {
    dutchDoor(b, team, right, plinthTop, z);
    if (i % 2 === 0) stallHorse(b, right, plinthTop, z);
  }
}

// A dutch door in the +x wall at x, centred on z: its team lower leaf, the dark opening over it, the frame and the
// rail across.
function dutchDoor(b, team, x, plinthTop, z) {
  b.box(0.014, 0.27, 0.28, team, x + 0.014, plinthTop + 0.02, z);
  b.box(0.012, 0.22, 0.28, C.dark, x + 0.012, plinthTop + 0.29, z);
  for (const side of [-1, 1]) b.box(0.02, 0.53, 0.04, OAK, x + 0.018, plinthTop, z + side * 0.16);
  b.box(0.02, 0.04, 0.36, OAK, x + 0.018, plinthTop + 0.51, z);
  b.box(0.03, 0.03, 0.3, OAK, x + 0.024, plinthTop + 0.28, z);
}

// A horse's head and neck looking out over the dutch door in the wall at x, with its white blaze and mane.
function stallHorse(b, x, plinthTop, z) {
  b.box(0.1, 0.2, 0.08, HORSE_HEAD, x + 0.05, plinthTop + 0.26, z, 0, 0, -0.5);
  b.box(0.18, 0.08, 0.08, HORSE_HEAD, x + 0.13, plinthTop + 0.4, z, 0, 0, -0.3);
  b.box(0.02, 0.05, 0.03, LIMEWASH, x + 0.22, plinthTop + 0.41, z);
  b.box(0.04, 0.1, 0.02, OAK, x + 0.03, plinthTop + 0.38, z, 0, 0, -0.5);
}

// The jettied hay loft over the stalls: joists, plaster and oak framing, the loft door full of hay, its team leaf
// swung open.
function hayLoft(ctx, stalls, loft, jetty, floorY, loftY, height) {
  const { b, t: team } = ctx, { right, midX, midZ, width, depth } = loft, front = stalls.front;
  b.box(width, 0.04, depth, OAK, midX, floorY, midZ);
  for (let z = stalls.back + 0.06; z < front; z += 0.13) {
    b.box(jetty, 0.03, 0.03, OAK, stalls.right + jetty / 2, floorY - 0.03, z);
  }
  b.box(width, height, depth, PLASTER, midX, loftY, midZ);
  halfTimber(b, right, loftY, midZ, depth, height, Math.PI / 2);
  halfTimber(b, midX, loftY, front, width, height, 0);
  b.box(0.26, 0.3, 0.012, C.dark, midX, loftY + 0.05, front + 0.03);
  b.box(0.22, 0.12, 0.05, STRAW, midX, loftY + 0.05, front + 0.04);
  b.box(0.32, 0.035, 0.03, OAK, midX, loftY + 0.35, front + 0.036);
  b.box(0.13, 0.3, 0.02, team, midX + 0.21, loftY + 0.05, front + 0.042);
}

// The loft's roof, the plastered front gable (a king post and a tie beam), the hoist beam with a bale on its rope;
// the flag.
function loftRoof(ctx, { back, front, midX, midZ, width, depth }, eaves, rise, loftY) {
  const { b } = ctx, span = width + 0.22, gableWidth = span - 0.1, gableRise = rise * gableWidth / span;
  place(b, slateRoof(span, rise, depth + 0.06), midX, eaves, midZ);
  gableEnd(b, gableWidth, gableRise, PLASTER, midX, eaves, front + 0.042);
  b.box(0.035, gableRise * 0.85, 0.025, OAK, midX, eaves, front + 0.055);
  b.box(gableWidth - 0.06, 0.035, 0.025, OAK, midX, eaves, front + 0.055);
  const hoistY = eaves + gableRise * 0.5;
  b.box(0.06, 0.06, 0.44, OAK, midX, hoistY, front + 0.22);
  stick(b, 0.007, ROPE, [midX, hoistY, front + 0.4], [midX, loftY - 0.06, front + 0.4], CYL6);
  b.box(0.22, 0.14, 0.15, STRAW, midX, loftY - 0.2, front + 0.4);
  b.box(0.225, 0.02, 0.155, STRAW_D, midX, loftY - 0.16, front + 0.4);
  b.box(0.225, 0.02, 0.155, STRAW_D, midX, loftY - 0.1, front + 0.4);
  flag(ctx, midX, eaves + rise - 0.02, back + 0.15, 0.45);
}

// A post-and-rail fence standing on y from [x, z] point p to q: posts about 0.4 apart and two rails.
function fenceRun(b, y, p, q) {
  const gaps = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.4));
  for (let i = 0; i <= gaps; i++) {
    const [x, z] = lerp(p, q, i / gaps);
    b.box(0.05, 0.36, 0.05, C.woodD, x, y, z);
  }
  for (const railY of [0.14, 0.29]) stick(b, 0.016, C.wood, [p[0], y + railY, p[1]], [q[0], y + railY, q[1]], unit.box);
}

// The paddock beside the stalls: the fence with a gateway, two horses, a trough and a hay crib.
function paddock(ctx, stalls, y) {
  const { b, h: half, t: team } = ctx, left = stalls.right + 0.12, right = half - 0.08, back = stalls.back, front = half - 0.08;
  fenceRun(b, y, [left, back], [right, back]);
  fenceRun(b, y, [right, back], [right, front]);
  fenceRun(b, y, [right, front], [0.36, front]);
  fenceRun(b, y, [-0.02, front], [left, front]);
  fenceRun(b, y, [left, front], [left, stalls.front + 0.1]);
  place(b, horse(team), 0.4, y, -0.3, 0.5);
  place(b, horse(team, true), 0.84, y, 0.72, -2.4);
  b.box(0.2, 0.16, 0.62, C.wood, right - 0.18, y, -0.55);
  b.box(0.15, 0.02, 0.56, 0x3f7fa3, right - 0.18, y + 0.15, -0.55);
  b.box(0.42, 0.22, 0.2, C.woodD, 0.1, y, back + 0.18);
  b.box(0.38, 0.1, 0.17, STRAW, 0.1, y + 0.2, back + 0.18);
}

// A stone arcade `length` long built at the origin for place(), facing +z: bays + 1 piers `depth` deep and pointed
// arches springing at `spring` and rising `rise` between them, under a dark string course.
const arcade = (length, bays, spring, rise, depth, color = STONE_L) => {
  const wall = new B(), pierWidth = 0.13, bayWidth = (length - pierWidth) / bays, halfSpan = (bayWidth - pierWidth) / 2;
  const archAngle = Math.atan2(rise, halfSpan), archSlope = Math.hypot(halfSpan, rise), archThickness = 0.15;
  for (let i = 0; i <= bays; i++) {
    wall.box(pierWidth, spring + rise + 0.1, depth, color, -length / 2 + pierWidth / 2 + i * bayWidth, 0, 0);
  }
  // Each arch is two straight stones leant together from the piers to its point.
  for (let i = 0; i < bays; i++) {
    const archX = -length / 2 + pierWidth / 2 + (i + 0.5) * bayWidth;
    for (const side of [-1, 1]) {
      const x = archX + side * halfSpan / 2 + side * Math.sin(archAngle) * archThickness / 2;
      const y = spring + rise / 2 + Math.cos(archAngle) * archThickness / 2;
      wall.add(unit.box, color, x, y, 0, archSlope, archThickness, depth, 0, 0, -side * archAngle);
    }
  }
  return wall.box(length + 0.02, 0.1, depth + 0.03, STONE_D, 0, spring + rise, 0);
};
// A market stall: a trestle table of goods under an awning striped in team colour and white, built at the origin for
// place(), its front to +z; goods(stall) piles the table (top at y = 0.3).
const stall = (team, goods) => {
  const body = new B();
  for (const [x, z] of [[-0.22, -0.12], [0.22, -0.12], [-0.22, 0.12], [0.22, 0.12]]) body.box(0.03, 0.27, 0.03, C.woodD, x, 0, z);
  body.box(0.52, 0.03, 0.3, C.wood, 0, 0.27, 0);
  for (const x of [-0.25, 0.25]) {
    body.box(0.025, 0.66, 0.025, C.woodD, x, 0, -0.16);
    body.box(0.025, 0.52, 0.025, C.woodD, x, 0, 0.2);
  }
  for (let i = 0; i < 5; i++) body.box(0.11, 0.02, 0.44, i % 2 ? LIMEWASH : team, -0.22 + i * 0.11, 0.59, 0.02, 0.32);
  goods(body);
  return body;
};
// Market: an arcaded market hall. A stone arcade of pointed arches carries the jettied, half-timbered upper hall under a
// slate roof with a louvred bell turret flying the flag, team banners hung from the jetty; under the arches the stalls
// are laid with cloth, sacks and barrels. In the square before it a stepped market cross and two stalls under
// team-striped awnings, with barrels and crates.
export function market(ctx) {
  const { b, s: size } = ctx, y = 0.05, hall = footprint(-1.2, 0.86, -1.26, -0.3), jetty = 0.08;
  const floorY = y + 0.05, spring = 0.36, rise = 0.24, arcadeTop = floorY + spring + rise + 0.1;
  const upperY = arcadeTop + 0.05, upperHeight = 0.46;
  b.box(size, y, size, COBBLE);
  b.box(hall.width + 0.08, 0.05, hall.depth + 0.08, PAVE, hall.midX, y, hall.midZ);
  marketArcades(ctx, hall, floorY, spring, rise, arcadeTop);
  const upper = footprint(hall.left, hall.right + jetty, hall.back, hall.front + jetty);
  upperHall(ctx, upper, arcadeTop, upperY, upperHeight);
  const turretY = marketRoof(ctx, upper, upperY + upperHeight);
  marketSquare(ctx, y);
  return turretY + 0.58;
}

// The arcades on the +z and +x sides with plain walls behind; under the arches, tables of cloth bolts, sacks and
// barrels.
function marketArcades(ctx, { back, left, right, front, midX, midZ, width, depth }, floorY, spring, rise, arcadeTop) {
  const { b, t: team } = ctx;
  place(b, arcade(width, 4, spring, rise, 0.14), midX, floorY, front - 0.07);
  place(b, arcade(depth, 2, spring, rise, 0.14), right - 0.07, floorY, midZ, Math.PI / 2);
  b.box(width, arcadeTop - floorY, 0.12, 0x4d4a44, midX, floorY, back + 0.06);
  b.box(0.12, arcadeTop - floorY, depth, 0x4d4a44, left + 0.06, floorY, midZ);
  for (const [x, z] of [[-0.82, -0.82], [-0.32, -0.7], [0.2, -0.82]]) {
    b.box(0.36, 0.03, 0.22, C.wood, x, floorY + 0.2, z);
    b.box(0.03, 0.2, 0.2, C.woodD, x - 0.15, floorY, z);
    b.box(0.03, 0.2, 0.2, C.woodD, x + 0.15, floorY, z);
    for (const [i, color] of [0x6b3a1e, team, 0x4f6b2a].entries()) {
      b.add(CYL6, color, x - 0.11 + i * 0.11, floorY + 0.27, z, 0.04, 0.2, 0.04, Math.PI / 2, 0, 0);
    }
  }
  barrel(b, 0.6, floorY, -0.6);
  barrel(b, 0.58, floorY, -0.84, 0.065);
  sack(b, -0.58, floorY, -0.5, 0.08);
  sack(b, -0.48, floorY, -0.46, 0.07);
}

// The jettied upper hall, its windows, the team banners (with gold rods and crosses) hung from the jetty.
function upperHall(ctx, { right, front, midX, midZ, width, depth }, arcadeTop, upperY, height) {
  const { b, t: team } = ctx;
  b.box(width, 0.05, depth, OAK, midX, arcadeTop, midZ);
  b.box(width, height, depth, PLASTER, midX, upperY, midZ);
  halfTimber(b, midX, upperY, front, width, height, 0);
  halfTimber(b, right, upperY, midZ, depth, height, Math.PI / 2);
  for (const x of [-0.98, -0.5, 0.02, 0.5]) b.box(0.15, 0.13, 0.02, GLASS, x + 0.12, upperY + 0.18, front + 0.03);
  for (const z of [midZ - 0.24, midZ + 0.24]) b.box(0.02, 0.13, 0.15, GLASS, right + 0.03, upperY + 0.18, z);
  for (const x of [-0.72, 0.3]) {
    b.box(0.15, 0.24, 0.012, team, x, arcadeTop - 0.25, front + 0.01);
    b.box(0.19, 0.03, 0.025, C.gold, x, arcadeTop - 0.02, front + 0.01);
    b.box(0.03, 0.14, 0.014, C.gold, x, arcadeTop - 0.2, front + 0.012);
  }
}

// The hall's roof, its plastered +x gable, the louvred bell turret and the flag. Returns the turret's foot.
function marketRoof(ctx, { right, midX, midZ, width, depth }, eaves) {
  const { b } = ctx, span = depth + 0.2, rise = 0.55, gableWidth = span - 0.1, gableRise = rise * gableWidth / span;
  place(b, slateRoof(span, rise, width + 0.08), midX, eaves, midZ, Math.PI / 2);
  gableEnd(b, gableWidth, gableRise, PLASTER, right + 0.052, eaves, midZ, true);
  b.box(0.025, gableRise * 0.85, 0.035, OAK, right + 0.064, eaves, midZ);
  b.box(0.025, 0.035, gableWidth - 0.06, OAK, right + 0.064, eaves, midZ);
  const turretY = eaves + rise - 0.08, turretX = midX + 0.1;
  b.box(0.26, 0.24, 0.26, OAK, turretX, turretY, midZ);
  b.box(0.18, 0.15, 0.27, C.dark, turretX, turretY + 0.05, midZ);
  b.box(0.27, 0.15, 0.18, C.dark, turretX, turretY + 0.05, midZ);
  b.cone(0.25, 0.34, SLATE, turretX, turretY + 0.24, midZ, 4, Math.PI / 4);
  flag(ctx, turretX, turretY + 0.56, midZ, 0.42);
  return turretY;
}

// The market cross at (x, z): three steps, the shaft and the cross on top.
function marketCross(b, x, y, z) {
  for (const [i, width] of [0.5, 0.36, 0.22].entries()) b.box(width, 0.07, width, i % 2 ? STONE : STONE_L, x, y + i * 0.07, z);
  b.add(CYL8, STONE_L, x, y + 0.21 + 0.32, z, 0.045, 0.64, 0.045);
  b.box(0.06, 0.18, 0.06, STONE_L, x, y + 0.83, z);
  b.box(0.2, 0.05, 0.06, STONE_L, x, y + 0.9, z);
}

// The square: the stepped market cross, two stalls (of fruit, and of baskets), barrels and crates.
function marketSquare(ctx, y) {
  const { b, t: team } = ctx;
  marketCross(b, 0.66, y, 0.66);
  const fruit = table => {
    for (const [i, color] of [C.red, 0xd9a441, 0x6f8f3a, 0xd9a441].entries()) {
      table.add(BALL, color, -0.18 + i * 0.12, 0.34, 0.02, 0.05, 0.04, 0.05);
    }
  };
  const baskets = table => {
    for (let i = 0; i < 3; i++) table.cylT(0.05, 0.04, 0.08, P.wattle, -0.14 + i * 0.14, 0.3, 0, 6);
  };
  place(b, stall(team, fruit), -0.72, y, 0.5, 0.15);
  place(b, stall(team, baskets), -0.08, y, 0.98, -0.1);
  barrel(b, 0.28, y, 0.36);
  barrel(b, 0.4, y, 0.5, 0.065);
  b.box(0.18, 0.16, 0.18, C.wood, 1.04, y, 0.22);
  b.box(0.15, 0.13, 0.15, C.woodD, 1.02, y + 0.16, 0.24, 0, 0.4);
  b.box(0.2, 0.15, 0.18, C.wood, 1.05, y, 0.0, 0, 0.2);
}

// Government Center: a cathedral-like hall. A tall aisled hall of grey stone with its gable to the front: a great rose
// window in team colour and gold over a pointed portal with team doors, team banners either side, octagonal stair turrets
// with slate spirelets at its corners and a stone cross on the gable. Buttresses with pinnacles and lancet windows
// along the aisles, clerestory windows above, a slate roof with a slender flèche (its spire in the mast) and the flag.
export function government_center(ctx) {
  const { b, s: size } = ctx, back = -1.22, front = 0.7;
  const hall = {
    y: 0.06, width: 1.1, back, front, length: front - back, midZ: (back + front) / 2, wallHeight: 1.22, roofRise: 0.78,
    aisleWidth: 0.34, aisleHeight: 0.62,
  };
  const { y, width, length, midZ, wallHeight, roofRise } = hall;
  b.box(size, y, size, PAVE);
  // The nave and its roof.
  b.box(width, wallHeight, length, STONE, 0, y, midZ);
  place(b, slateRoof(width + 0.16, roofRise, length + 0.02), 0, y + wallHeight, midZ - 0.01);
  for (const side of [-1, 1]) hallAisle(b, hall, side);
  const frontZ = front + 0.05, frontWidth = width + 0.06;
  hallFront(ctx, hall, frontZ, frontWidth);
  for (const side of [-1, 1]) stairTurret(ctx, side * (frontWidth / 2 + 0.02), y, frontZ, wallHeight + 0.48);
  fleche(ctx, midZ - 0.25, y + wallHeight + roofRise);
  return y + wallHeight + 0.56 + 0.5;
}

// The aisle on the `side` of the hall: its lean-to roof, buttresses with pinnacles, lancets, and the clerestory over
// them.
function hallAisle(b, { y, width, back, length, midZ, aisleWidth, aisleHeight }, side) {
  const ry = side * Math.PI / 2, outerX = width / 2 + aisleWidth, bays = 4, step = (length - 0.3) / bays;
  b.box(aisleWidth, aisleHeight, length - 0.12, STONE, side * (width / 2 + aisleWidth / 2), y, midZ - 0.06);
  const leanTo = slateLeanTo(length - 0.1, aisleWidth + 0.06, 0.3);
  place(b, leanTo, side * (width / 2 + aisleWidth / 2 + 0.02), y + aisleHeight, midZ - 0.06, ry);
  for (let i = 0; i <= bays; i++) {
    const z = back + 0.12 + i * step;
    buttress(b, side * outerX, y, z, aisleHeight + 0.1, ry);
    b.cone(0.045, 0.16, STONE_D, side * (outerX + 0.045), y + aisleHeight + 0.1, z, 4);
    if (i === bays) continue;
    lancet(b, side * (outerX + 0.011), y + 0.16, z + step / 2, 0.1, 0.34, ry, GLASS);
    lancet(b, side * (width / 2 + 0.011), y + aisleHeight + 0.36, z + step / 2, 0.09, 0.2, ry, GLASS);
  }
}

// The hall's front wall at frontZ: its wall and gable, the cross, the rose window, the portal with team doors, banners
// and steps.
function hallFront(ctx, { y, width, wallHeight, roofRise }, frontZ, frontWidth) {
  const { b, t: team } = ctx, gableRise = roofRise * frontWidth / (width + 0.16) + 0.07, face = frontZ + 0.05;
  b.box(frontWidth, wallHeight, 0.1, STONE, 0, y, frontZ);
  b.roof(frontWidth, gableRise, 0.1, STONE, 0, y + wallHeight, frontZ);
  b.box(0.045, 0.22, 0.045, STONE_L, 0, y + wallHeight + gableRise - 0.04, frontZ);
  b.box(0.15, 0.045, 0.045, STONE_L, 0, y + wallHeight + gableRise + 0.08, frontZ);
  place(b, roseWindow(team, 0.3), 0, y + wallHeight + 0.06, face + 0.002);
  lancet(b, 0, y, face + 0.001, 0.44, 0.78, 0, STONE_D);
  lancet(b, 0, y, face + 0.011, 0.34, 0.68, 0, team);
  b.box(0.014, 0.5, 0.02, OAK, 0, y, face + 0.02);
  for (const side of [-1, 1]) {
    b.box(0.15, 0.42, 0.012, team, side * 0.37, y + 0.3, face + 0.006);
    b.box(0.19, 0.025, 0.02, C.gold, side * 0.37, y + 0.72, face + 0.008);
    b.box(0.03, 0.22, 0.014, C.gold, side * 0.37, y + 0.4, face + 0.01);
  }
  for (let i = 0; i < 2; i++) b.box(0.62 - i * 0.12, 0.035, 0.12, STONE_L, 0, y - 0.035 + i * 0.035, face + 0.12 - i * 0.06);
}

// An octagonal stair turret `height` tall at a front corner (x, z): its slit windows, slate spirelet and gold finial.
function stairTurret(ctx, x, y, z, height) {
  const { b, mast } = ctx;
  b.add(CYL8, STONE, x, y + height / 2, z, 0.13, height, 0.13);
  b.cylT(0.155, 0.155, 0.06, STONE_D, x, y + height, z, 8);
  b.cone(0.155, 0.5, SLATE, x, y + height + 0.06, z, 8);
  for (const slitY of [0.4, 0.9, 1.35]) b.box(0.035, 0.14, 0.02, C.dark, x, y + slitY, z + 0.13);
  mast.cylT(0.006, 0.014, 0.2, C.gold, x, y + height + 0.52, z, 4);
}

// The flèche on the ridge at z, its spire in the mast, and the flag on it.
function fleche(ctx, z, ridge) {
  const { b, mast } = ctx;
  b.box(0.14, 0.16, 0.14, OAK, 0, ridge - 0.1, z);
  b.box(0.16, 0.03, 0.16, SLATE_D, 0, ridge + 0.06, z);
  mast.cone(0.07, 0.48, SLATE_D, 0, ridge + 0.09, z, 6);
  flag(ctx, 0, ridge + 0.54, z, 0.4, C.gold, [0.22, 0.4]);
}

// Wonder: a gothic cathedral, its west front toward +z. Twin west towers with belfries, pinnacles and tall slate spires
// frame a gabled front with a great rose window over the team-doored portal, long team banners hanging from the towers;
// the aisled nave with flying buttresses on pinnacled piers, transepts with a second rose window in the +x end, an apse
// and a crossing tower carrying the tallest spire, whose tip and the flag are in the mast.
export function wonder(ctx) {
  const { b, s: size } = ctx;
  const towerZ = 1.1, towerSize = 0.62, front = towerZ + towerSize / 2, back = -1.15, naveFront = front - 0.12;
  const plan = {
    y: 0.12, naveWidth: 1.0, wallHeight: 1.5, roofRise: 0.72, aisleWidth: 0.36, aisleHeight: 0.78,
    towerZ, towerSize, towerX: 0.62, towerHeight: 2.72, front, back,
    naveMidZ: (back + naveFront) / 2, naveLength: naveFront - back,
    transeptZ: -0.4, transeptDepth: 0.7, transeptReach: 1.42,
  };
  b.box(size, 0.06, size, PAVE);
  b.box(3.2, 0.06, 3.3, STONE_L, 0, 0.06, -0.08);
  naveAndAisles(b, plan);
  transepts(b, ctx.t, plan);
  // The apse.
  b.cylT(0.5, 0.5, plan.wallHeight, STONE, 0, plan.y, back, 8);
  b.cone(0.56, 0.6, SLATE, 0, plan.y + plan.wallHeight, back, 8);
  flyingButtresses(b, plan);
  const crossingTop = crossingTower(ctx, plan);
  for (const side of [-1, 1]) westTower(ctx, plan, side);
  westFront(b, ctx.t, plan);
  flag(ctx, 0, crossingTop + 2.56, plan.transeptZ, 0.5, C.gold);
  return crossingTop + 2.05;
}

// The nave, its aisles (ending at the towers) and their roofs.
function naveAndAisles(b, plan) {
  const { y, naveWidth, wallHeight, roofRise, aisleWidth, aisleHeight, towerZ, towerSize, back, naveMidZ, naveLength } = plan;
  b.box(naveWidth, wallHeight, naveLength, STONE, 0, y, naveMidZ);
  place(b, slateRoof(naveWidth + 0.14, roofRise, naveLength), 0, y + wallHeight, naveMidZ);
  const aisleFront = towerZ - towerSize / 2, aisleMidZ = (back + aisleFront) / 2;
  for (const side of [-1, 1]) {
    b.box(aisleWidth, aisleHeight, aisleFront - back, STONE, side * (naveWidth / 2 + aisleWidth / 2), y, aisleMidZ);
    const leanTo = slateLeanTo(aisleFront - back, aisleWidth + 0.06, 0.34);
    place(b, leanTo, side * (naveWidth / 2 + aisleWidth / 2 + 0.02), y + aisleHeight, aisleMidZ, side * Math.PI / 2);
  }
}

// The transepts, their stone gables with corner pinnacles, the rose window in the +x end and lancets.
function transepts(b, team, { y, wallHeight, roofRise, transeptZ: z, transeptDepth: depth, transeptReach: reach }) {
  b.box(2 * reach, wallHeight, depth, STONE, 0, y, z);
  place(b, slateRoof(depth + 0.14, roofRise, 2 * reach), 0, y + wallHeight, z, Math.PI / 2);
  for (const side of [-1, 1]) {
    gableEnd(b, depth + 0.06, roofRise * (depth + 0.06) / (depth + 0.14), STONE, side * (reach + 0.012), y + wallHeight, z, true);
    for (const corner of [-1, 1]) {
      const cornerZ = z + corner * (depth / 2 + 0.02);
      b.box(0.12, wallHeight + 0.1, 0.12, STONE_D, side * (reach - 0.02), y, cornerZ);
      b.cone(0.07, 0.3, STONE_D, side * (reach - 0.02), y + wallHeight + 0.1, cornerZ, 4);
    }
    for (const x of [0.75, 1.12]) lancet(b, side * x, y + 0.35, z + depth / 2 + 0.011, 0.12, 0.7, 0, GLASS);
  }
  place(b, roseWindow(team, 0.24), reach + 0.024, y + wallHeight - 0.3, z, Math.PI / 2);
  for (const dz of [-0.14, 0.14]) lancet(b, reach + 0.011, y + 0.22, z + dz, 0.1, 0.62, Math.PI / 2, GLASS);
}

// Flying buttresses on pinnacled piers out past the aisles, lancets in the aisles, the clerestory.
function flyingButtresses(b, { y, naveWidth, wallHeight, aisleWidth, aisleHeight }) {
  for (const side of [-1, 1]) for (const z of [-0.98, 0.16, 0.52]) {
    const pierX = side * (naveWidth / 2 + aisleWidth + 0.14), ry = side * Math.PI / 2;
    b.box(0.14, aisleHeight + 0.42, 0.18, STONE_D, pierX, y, z);
    b.cone(0.075, 0.3, STONE_D, pierX, y + aisleHeight + 0.42, z, 4);
    // The flyer, from the pier's top to the clerestory wall.
    const flyerFoot = [pierX - side * 0.04, y + aisleHeight + 0.32, z];
    stick(b, 0.03, STONE_D, flyerFoot, [side * (naveWidth / 2 + 0.02), y + wallHeight - 0.1, z], unit.box);
    lancet(b, side * (naveWidth / 2 + aisleWidth + 0.011), y + 0.2, z - 0.18, 0.11, 0.42, ry, GLASS);
    lancet(b, side * (naveWidth / 2 + 0.011), y + aisleHeight + 0.42, z - 0.18, 0.1, 0.26, ry, GLASS);
  }
}

// The crossing tower, battlemented and pinnacled, and its spire, whose tip and gold cross are in the mast. Returns the
// tower's top.
function crossingTower(ctx, { y, wallHeight, transeptZ: z }) {
  const { b, mast } = ctx, foot = y + wallHeight + 0.1, height = 1.05, top = foot + height;
  b.box(0.7, height, 0.7, STONE, 0, foot, z);
  battlements(b, 0, top, z, 0.7, 0.7);
  for (const d of [-0.15, 0.15]) {
    lancet(b, d, foot + 0.42, z + 0.361, 0.1, 0.46);
    lancet(b, 0.361, foot + 0.42, z + d, 0.1, 0.46, Math.PI / 2);
  }
  for (const [dx, dz] of CORNERS) b.cone(0.06, 0.32, STONE_D, dx * 0.31, top, z + dz * 0.31, 4);
  b.cone(0.34, 2.05, SLATE, 0, top, z, 8, Math.PI / 8);
  mast.cylT(0.006, 0.03, 0.5, SLATE_D, 0, top + 1.95, z, 6);
  mast.box(0.03, 0.16, 0.03, C.gold, 0, top + 2.42, z);
  mast.box(0.12, 0.03, 0.03, C.gold, 0, top + 2.5, z);
  return top;
}

// The west tower on the `side`: buttressed, belfried, battlemented, pinnacled and spired, a team banner down its front
// and a door at its foot.
function westTower(ctx, { y, towerX, towerZ: z, towerSize: width, towerHeight: height, front }, side) {
  const { b, mast, t: team } = ctx, x = side * towerX;
  b.box(width, height, width, STONE, x, y, z);
  for (const [dx, dz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    b.box(0.08, height * 0.82, 0.08, STONE_D, x + dx * (width / 2 + 0.02), y, z + dz * (width / 2 + 0.02));
  }
  for (const courseY of [0.95, 1.85]) b.box(width + 0.04, 0.04, width + 0.04, STONE_D, x, y + courseY, z);
  // The belfry's louvred lancets, on the front and the outer side.
  for (const d of [-0.13, 0.13]) {
    lancet(b, x + d, y + 1.98, front + 0.011, 0.1, 0.5);
    lancet(b, x + side * (width / 2 + 0.011), y + 1.98, z + d, 0.1, 0.5, side * Math.PI / 2);
  }
  battlements(b, x, y + height, z, width, width);
  for (const [dx, dz] of CORNERS) b.cone(0.055, 0.3, STONE_D, x + dx * 0.27, y + height, z + dz * 0.27, 4);
  b.cone(0.29, 1.45, SLATE, x, y + height, z, 8, Math.PI / 8);
  mast.cylT(0.005, 0.02, 0.32, SLATE_D, x, y + height + 1.38, z, 6);
  towerBannerAndDoor(b, team, x, y, front);
}

// The team banner down a west tower's front at x, on its gold rod and with a gold cross on it; the door at its foot.
function towerBannerAndDoor(b, team, x, y, front) {
  b.box(0.2, 0.76, 0.014, team, x, y + 1.0, front + 0.008);
  b.box(0.24, 0.03, 0.03, C.gold, x, y + 1.76, front + 0.012);
  b.box(0.035, 0.34, 0.016, C.gold, x, y + 1.24, front + 0.016);
  b.box(0.13, 0.035, 0.016, C.gold, x, y + 1.46, front + 0.016);
  lancet(b, x, y, front + 0.001, 0.3, 0.62, 0, STONE_D);
  lancet(b, x, y, front + 0.011, 0.22, 0.54, 0, C.dark);
}

// The west front between the towers: wall and gable, the cross, the rose, a row of niches, the great portal and steps.
function westFront(b, team, { y, naveWidth, wallHeight, roofRise, front }) {
  const wallZ = front - 0.06;
  b.box(naveWidth + 0.06, wallHeight + 0.05, 0.12, STONE, 0, y, wallZ);
  b.roof(naveWidth + 0.16, roofRise + 0.1, 0.12, STONE, 0, y + wallHeight, wallZ);
  b.box(0.045, 0.22, 0.045, STONE_L, 0, y + wallHeight + roofRise + 0.06, wallZ);
  b.box(0.15, 0.045, 0.045, STONE_L, 0, y + wallHeight + roofRise + 0.19, wallZ);
  place(b, roseWindow(team, 0.25), 0, y + wallHeight + 0.12, front + 0.003);
  for (const x of [-0.21, -0.07, 0.07, 0.21]) lancet(b, x, y + 0.92, front + 0.001, 0.07, 0.24);
  lancet(b, 0, y, front + 0.001, 0.4, 0.82, 0, STONE_D);
  lancet(b, 0, y, front + 0.011, 0.3, 0.72, 0, team);
  b.box(0.014, 0.52, 0.02, OAK, 0, y, front + 0.02);
  for (let i = 0; i < 3; i++) {
    b.box(1.5 - i * 0.2, 0.04, 0.12, STONE_L, 0, 0.12 - (i + 1) * 0.04 + 0.04, front + 0.06 + (2 - i) * 0.06);
  }
}

// ---------- Medieval defences ----------
// A cross-shaped arrow loop on a wall face at (x, z) facing ry, its foot at y.
const arrowLoop = (b, x, y, z, ry, height = 0.32) => {
  b.box(0.045, height, 0.03, C.dark, x, y, z, 0, ry);
  b.box(0.15, 0.045, 0.03, C.dark, x, y + height * 0.55, z, 0, ry);
};

// Tower: a stone castle tower. A round drum on a battered plinth, a string course and arrow loops up its camera side,
// the parapet carried out on a ring of corbels (machicolations) and crowned with merlons; a pointed gate up two steps
// at its foot with a team banner hung above it, a team shield on the side, and a corbelled bartizan turret with a slate
// cone flying the flag. Its shot is a flight of crossbow quarrels from the battlements (extra.fire).
export function tower(ctx) {
  const { b, t: team, extra } = ctx, radius = 0.71, plinthTop = 0.34, drumTop = 2.26, sides = 16;
  b.box(1.76, 0.04, 1.76, COBBLE);
  b.cylT(0.73, 0.83, plinthTop - 0.04, STONE_D, 0, 0.04, 0, sides);
  b.cylT(radius - 0.01, radius + 0.01, drumTop - plinthTop, STONE, 0, plinthTop, 0, sides);
  for (const y of [1.2, 1.9]) b.cylT(radius + 0.025, radius + 0.025, 0.05, STONE_D, 0, y, 0, sides);
  const parapetY = drumTop + 0.16, parapetTop = parapetY + 0.3;
  towerParapet(b, drumTop, parapetY, parapetTop, sides);
  // Arrow loops on the camera side and the parapet.
  for (const [a, y] of [[Math.PI / 4, 0.75], [Math.PI / 2, 1.4], [Math.PI / 4, 1.42], [Math.PI / 2, 0.62]]) {
    arrowLoop(b, Math.sin(a) * (radius + 0.005), y, Math.cos(a) * (radius + 0.005), a);
  }
  for (const a of [0, Math.PI / 4, Math.PI / 2]) arrowLoop(b, Math.sin(a) * 0.835, parapetY + 0.04, Math.cos(a) * 0.835, a, 0.2);
  towerGate(b, team, radius, plinthTop);
  bartizan(ctx, parapetTop);
  extra.fire = { geo: quarrels(), at: [0, parapetTop, 0] };
  return parapetTop + 0.68;
}

// The tower's shot: the quarrels, loosed between the merlons toward the camera sides.
function quarrels() {
  const fire = new B();
  for (const a of [0.12, Math.PI / 4, Math.PI / 2 - 0.12]) {
    const from = [Math.sin(a) * 0.86, 0.06, Math.cos(a) * 0.86], to = [Math.sin(a) * 1.6, -0.16, Math.cos(a) * 1.6];
    streak(fire, from, to, 0.032, undefined, P.ember, 0.08);
  }
  return fire.geometry();
}

// The machicolations, the parapet and its merlons with their copings. The parapet stops under its coping, so the two
// never share a top face (coplanar, they z-fight and the roof flickers as the camera pans).
function towerParapet(b, drumTop, parapetY, parapetTop, sides) {
  for (let i = 0; i < sides; i++) {
    const a = i * 2 * Math.PI / sides;
    b.box(0.09, 0.16, 0.13, STONE_D, Math.sin(a) * 0.76, drumTop, Math.cos(a) * 0.76, 0, a);
  }
  b.cylT(0.83, 0.83, 0.26, STONE, 0, parapetY, 0, sides);
  b.cylT(0.84, 0.84, 0.04, STONE_D, 0, parapetTop - 0.04, 0, sides);
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * Math.PI / 4, x = Math.sin(a) * 0.77, z = Math.cos(a) * 0.77;
    b.box(0.26, 0.22, 0.13, STONE, x, parapetTop, z, 0, a);
    b.box(0.28, 0.03, 0.15, STONE_D, x, parapetTop + 0.22, z, 0, a);
  }
}

// The gate up two steps on the drum's front, the team banner (with a gold cross) over it, a shield on the side.
function towerGate(b, team, radius, plinthTop) {
  lancet(b, 0, plinthTop, radius + 0.004, 0.36, 0.66, 0, STONE_D);
  lancet(b, 0, plinthTop, radius + 0.012, 0.28, 0.58, 0, OAK);
  b.box(0.012, 0.42, 0.02, C.dark, 0, plinthTop, radius + 0.022);
  for (let i = 0; i < 2; i++) b.box(0.5 - i * 0.1, plinthTop - 0.04 - i * 0.14, 0.14, STONE_L, 0, 0.04, radius + 0.18 - i * 0.12);
  b.box(0.4, 0.04, 0.05, OAK, 0, 2.08, radius + 0.03);
  b.box(0.34, 0.8, 0.014, team, 0, 1.28, radius + 0.025);
  b.box(0.04, 0.4, 0.016, C.gold, 0, 1.52, radius + 0.034);
  b.box(0.2, 0.04, 0.016, C.gold, 0, 1.78, radius + 0.034);
  place(b, heaterShield(team), radius + 0.012, 1.42, 0, Math.PI / 2, 1.4);
}

// The bartizan: a corbelled turret at the back right, its slate cone flying the flag.
function bartizan(ctx, parapetTop) {
  const { b } = ctx, x = Math.sin(3 * Math.PI / 4) * 0.8, z = Math.cos(3 * Math.PI / 4) * 0.8;
  b.cylT(0.21, 0.06, 0.34, STONE_D, x, 1.78, z, 10);
  b.cylT(0.21, 0.21, parapetTop + 0.14 - 2.12, STONE, x, 2.12, z, 10);
  b.cylT(0.225, 0.225, 0.04, STONE_D, x, parapetTop + 0.14, z, 10);
  b.cone(0.27, 0.5, SLATE, x, parapetTop + 0.18, z, 10);
  arrowLoop(b, x + 0.15, parapetTop - 0.22, z + 0.15, Math.PI / 4, 0.2);
  flag(ctx, x, parapetTop + 0.62, z, 0.5);
}

// Wall: a castle wall with battlements. A grey stone wall on a darker plinth, a string course under the wall-walk and
// square merlons round its top, an arrow slit in each merlon on the camera sides and team shields hung on them; it fills
// its tile edge to edge, so segments in a line close up into one curtain wall.
export function wall(ctx) {
  const { b, t: team } = ctx, plinthHeight = 0.12, wallHeight = 0.7, walkY = plinthHeight + wallHeight;
  b.box(1, plinthHeight, 1, STONE_D);
  b.box(1, wallHeight / 2, 1, STONE, 0, plinthHeight, 0);
  b.box(0.986, wallHeight / 2, 0.986, STONE, 0, plinthHeight + wallHeight / 2, 0);
  b.box(1, 0.05, 1, STONE_D, 0, walkY, 0);
  const merlonY = walkY + 0.05;
  for (const [x, z] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
    b.box(0.24, 0.26, 0.24, STONE, x * 0.38, merlonY, z * 0.38);
  }
  // Slits and shields sit a hair into the faces, so nothing pokes past the tile's edge.
  for (const along of [-0.38, 0.38]) {
    b.box(0.04, 0.15, 0.012, C.dark, along, merlonY + 0.06, 0.494);
    b.box(0.012, 0.15, 0.04, C.dark, 0.494, merlonY + 0.06, along);
  }
  place(b, heaterShield(team), 0, 0.2, 0.484, 0, 1.3);
  place(b, heaterShield(team), 0.484, 0.2, 0, Math.PI / 2, 1.3);
  return merlonY + 0.26;
}
