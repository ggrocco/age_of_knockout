// Four-bot termination and resource/position invariant checks on both map settings.
import { simulateMatch } from '../src/tournament/sim.js';
const seeds = Number(process.argv[2] || 12);
let failed = false;
for (const mapType of (process.argv[3] || 'rivers,islands').split(',')) {
  const reasons = {}, winners = [0, 0, 0, 0];
  let captures = 0, rejects = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const out = simulateMatch('kingdoms', seed, ['medium', 'medium', 'medium', 'medium'], { mapType, keepGame: true });
    const ok = out.ended && out.errors.length === 0 && out.maxRejects < 20;
    if (!ok) { failed = true; console.error({ mapType, seed, ...out, game: undefined }); }
    if (out.winner !== null) winners[out.winner]++;
    captures += out.game.roundState.events.filter(e => e.winner !== null).length;
    reasons[out.reason] = (reasons[out.reason] || 0) + 1;
    rejects = Math.max(rejects, out.maxRejects);
    console.log(`${mapType} seed ${seed}: ${out.reason}, winner ${out.winner}, captures ${out.game.roundState.events.length}, ${out.ticks} ticks`);
  }
  console.log(JSON.stringify({ mapType, seeds, winners, reasons, captures, maxRejects: rejects }));
}
if (failed) process.exitCode = 1;
