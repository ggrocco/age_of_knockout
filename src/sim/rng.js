// Seeded mulberry32. All sim randomness must come from here.
export function makeRng(seed) {
  let state = seed >>> 0;
  // A float in [0, 1).
  const next = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  // An integer in [0, count).
  return { next, int: count => Math.floor(next() * count) };
}
