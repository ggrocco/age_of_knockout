import { makeRng } from '../sim/rng.js';
import { ROUNDS } from '../rounds/index.js';
import { simulateMatch } from './sim.js';
import { DEFAULT_TIME_LIMIT } from '../time-limit.js';

export const NAMES = ['You', 'Ramses', 'Hammurabi', 'Sargon', 'Nebuchadnezzar', 'Darius', 'Xerxes', 'Cyrus', 'Leonidas', 'Pericles', 'Alexander', 'Ptolemy',
  'Hannibal', 'Scipio', 'Caesar', 'Augustus', 'Attila', 'Boudica', 'Shalmaneser', 'Tiglath', 'Ashurbanipal', 'Thutmose', 'Akhenaten', 'Minos',
  'Agamemnon', 'Themistocles', 'Philip', 'Seleucus', 'Antiochus', 'Mithridates', 'Vercingetorix', 'Arminius'];
// Difficulty of the opponent the human faces in each round, per chosen level. 'normal' is the original ramp.
export const LEVELS = {
  relaxed: ['relaxed', 'relaxed', 'relaxed', 'relaxed', 'relaxed'],
  normal: ['easy', 'easy', 'medium', 'medium', 'hard'],
  hard: ['medium', 'medium', 'hard', 'hard', 'hard'],
};
export const LEVEL_NAME = { relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' };

export function createTournament(seed = 1, level = 'normal', { noTimeLimit = false, timeLimit = noTimeLimit ? 0 : DEFAULT_TIME_LIMIT } = {}) {
  const ramp = LEVELS[level] || LEVELS.normal;
  const rng = makeRng(seed);
  const players = NAMES.map((name, id) => ({ id, name, difficulty: id === 0 ? 'human' : ['easy', 'medium', 'hard'][rng.int(3)] }));
  let resolving = false;
  const t = {
    seed, level, timeLimit, noTimeLimit: timeLimit === 0, roundIndex: 0, alive: [...players], history: [], over: false, champion: null,
    get round() { return ROUNDS[this.roundIndex]; },
    get human() { return this.alive[0]; },
    get opponent() { const o = this.alive[1]; return { ...o, difficulty: ramp[this.roundIndex] }; },
    // Supports either a synchronous headless runner or an asynchronous Worker runner. Nothing changes until every
    // match has an outcome, so after a failure the same round can simply be resolved again.
    async resolveAsync(humanWon, { onProgress, simulate = simulateMatch } = {}) {
      if (resolving) throw new Error('round is already being resolved');
      if (!humanWon) return this.resolve(false);
      if (this.over) throw new Error('tournament is over');
      resolving = true;
      try {
        const ri = this.roundIndex, round = ROUNDS[ri], cache = new Map(), total = (this.alive.length - 2) / 2; let done = 0;
        for (let i = 2; i < this.alive.length; i += 2) {
          await new Promise(r => setTimeout(r, 0));
          const s = this.seed * 1000 + ri * 50 + i; cache.set(s, await simulate(round.id, s, [this.alive[i].difficulty, this.alive[i + 1].difficulty]));
          try { onProgress?.(++done, total); } catch { /* a progress display must not lose the round */ }
        }
        return this.resolve(humanWon, (id, s) => cache.get(s));
      } finally { resolving = false; }
    },
    // Record the outcome of the human's match, simulate every other match of the round, advance.
    resolve(humanWon, simulate = simulateMatch) {
      if (this.over) throw new Error('tournament is over');
      const ri = this.roundIndex, round = ROUNDS[ri], next = [], results = [];
      results.push({ a: this.alive[0].name, b: this.alive[1].name, winner: humanWon ? this.alive[0].name : this.alive[1].name, human: true });
      if (!humanWon) { this.history.push({ round: round.id, results }); this.over = true; this.lostIn = ri; return this; }
      next.push(this.alive[0]);
      for (let i = 2; i < this.alive.length; i += 2) {
        const a = this.alive[i], b = this.alive[i + 1];
        const m = simulate(round.id, seed * 1000 + ri * 50 + i, [a.difficulty, b.difficulty]);
        if (!m) throw new Error(`no result for ${a.name} vs ${b.name} in ${round.id}`); // checked before anything changes
        const w = m.winner === 1 ? b : a; next.push(w); results.push({ a: a.name, b: b.name, winner: w.name, reason: m.reason });
      }
      this.history.push({ round: round.id, results });
      this.alive = next; this.roundIndex++;
      if (this.alive.length === 1) { this.over = true; this.champion = this.alive[0]; }
      return this;
    },
  };
  return t;
}
