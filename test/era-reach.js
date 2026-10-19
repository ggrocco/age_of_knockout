// Usage: node test/era-reach.js [seeds=12] [round=deathmatch]
// Measurement, not a test: how far bots climb the eras by the end of a match (2 player-games per match).
import { simulateMatch } from '../src/tournament/sim.js';
import { AGES, ageIndex } from '../src/data/ages.js';
const seeds = +(process.argv[2] || 12), round = process.argv[3] || 'deathmatch';
for (const diffs of [['medium', 'medium'], ['hard', 'hard']]) {
  const eras = [], ticks = [];
  for (let s = 1; s <= seeds; s++) { const m = simulateMatch(round, s, diffs); ticks.push(m.ticks); for (const p of m.final) eras.push(ageIndex(p.age)); }
  eras.sort((a, b) => a - b); ticks.sort((a, b) => a - b);
  const tally = {}; for (const i of eras) tally[AGES[i]] = (tally[AGES[i]] || 0) + 1;
  const modern = Math.round(100 * eras.filter(i => i >= ageIndex('modern')).length / eras.length);
  console.log(`${round}  ${diffs.join(',')}  eras=${JSON.stringify(tally)}  median=${AGES[eras[eras.length >> 1]]}  modern+=${modern}%  median ticks=${ticks[ticks.length >> 1]}`);
}
