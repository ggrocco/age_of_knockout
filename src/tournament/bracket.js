import { makeRng } from '../sim/rng.js';
import { ROUNDS } from '../rounds/index.js';
import { simulateMatch } from './sim.js';
import { DEFAULT_TIME_LIMIT } from '../time-limit.js';

export const NAMES = ['You', 'Ramses', 'Hammurabi', 'Sargon', 'Nebuchadnezzar', 'Darius', 'Xerxes', 'Cyrus',
  'Leonidas', 'Pericles', 'Alexander', 'Ptolemy', 'Hannibal', 'Scipio', 'Caesar', 'Augustus',
  'Attila', 'Boudica', 'Shalmaneser', 'Tiglath', 'Ashurbanipal', 'Thutmose', 'Akhenaten', 'Minos',
  'Agamemnon', 'Themistocles', 'Philip', 'Seleucus', 'Antiochus', 'Mithridates', 'Vercingetorix', 'Arminius'];
const BOT_DIFFICULTIES = ['easy', 'medium', 'hard'];
// Difficulty of the opponent the human faces in each round, per chosen level. 'normal' is the original ramp.
export const LEVELS = {
  relaxed: ['relaxed', 'relaxed', 'relaxed', 'relaxed', 'relaxed'],
  normal: ['easy', 'easy', 'medium', 'medium', 'hard'],
  hard: ['medium', 'medium', 'hard', 'hard', 'hard'],
};
export const LEVEL_NAME = { relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' };

// The seed of the bracket match between alive[i] and alive[i + 1] in a round: the same in either runner.
const matchSeed = (tournamentSeed, roundIndex, i) => tournamentSeed * 1000 + roundIndex * 50 + i;

// mapType: every match of the tournament, the player's and the simulated ones, is played on this kind of map.
export function createTournament(seed = 1, level = 'normal', {
  noTimeLimit = false, timeLimit = noTimeLimit ? 0 : DEFAULT_TIME_LIMIT, mapType = 'rivers',
} = {}) {
  const ramp = LEVELS[level] || LEVELS.normal;
  const rng = makeRng(seed);
  // Every bot entrant gets a random difficulty of its own; the opponent the human meets takes the level's ramp instead.
  const players = NAMES.map((name, id) => ({ id, name, difficulty: id === 0 ? 'human' : BOT_DIFFICULTIES[rng.int(3)] }));
  let resolving = false;
  const tournament = {
    seed, level, timeLimit, noTimeLimit: timeLimit === 0, mapType,
    roundIndex: 0, alive: [...players], history: [], over: false, champion: null,
    get round() { return ROUNDS[this.roundIndex]; },
    get human() { return this.alive[0]; },
    get opponent() { return { ...this.alive[1], difficulty: ramp[this.roundIndex] }; },
    // Supports either a synchronous headless runner or an asynchronous Worker runner. Nothing changes until every
    // match has an outcome, so after a failure the same round can simply be resolved again.
    async resolveAsync(humanWon, { onProgress, simulate = simulateMatch } = {}) {
      if (resolving) throw new Error('round is already being resolved');
      if (!humanWon) return this.resolve(false);
      if (this.over) throw new Error('tournament is over');
      resolving = true;
      try {
        const outcomes = await simulateRoundAsync(this, simulate, onProgress, mapType);
        return this.resolve(humanWon, (roundId, seedOfMatch) => outcomes.get(seedOfMatch));
      } finally { resolving = false; }
    },
    // Record the outcome of the human's match, simulate every other match of the round, advance.
    resolve(humanWon, simulate = simulateMatch) {
      if (this.over) throw new Error('tournament is over');
      const roundIndex = this.roundIndex, round = ROUNDS[roundIndex], [human, opponent] = this.alive;
      const results = [{ a: human.name, b: opponent.name, winner: humanWon ? human.name : opponent.name, human: true }];
      if (!humanWon) return eliminate(this, round, roundIndex, results);
      // Checked before anything changes: a missing result throws with the tournament as it was.
      const winners = playOtherMatches(this.alive, round.id, i => matchSeed(seed, roundIndex, i), simulate, mapType, results);
      this.history.push({ round: round.id, results });
      this.alive = [human, ...winners];
      this.roundIndex++;
      if (this.alive.length === 1) {
        this.over = true;
        this.champion = this.alive[0];
      }
      return this;
    },
  };
  return tournament;
}

// The human lost their match in this round: the tournament ends there.
function eliminate(tournament, round, roundIndex, results) {
  tournament.history.push({ round: round.id, results });
  tournament.over = true;
  tournament.lostIn = roundIndex;
  return tournament;
}

// Every match of the round but the human's (alive[2] v alive[3], alive[4] v alive[5], ...), off-screen; their results
// are appended to `results`. Returns the winners, in bracket order.
function playOtherMatches(alive, roundId, seedOf, simulate, mapType, results) {
  const winners = [];
  for (let i = 2; i < alive.length; i += 2) {
    const a = alive[i], b = alive[i + 1];
    const match = simulate(roundId, seedOf(i), [a.difficulty, b.difficulty], { mapType });
    if (!match) throw new Error(`no result for ${a.name} vs ${b.name} in ${roundId}`);
    const winner = match.winner === 1 ? b : a;
    winners.push(winner);
    results.push({ a: a.name, b: b.name, winner: winner.name, reason: match.reason });
  }
  return winners;
}

// Simulates the round's off-screen matches one after another, yielding between them; returns the outcomes by match seed.
async function simulateRoundAsync(tournament, simulate, onProgress, mapType) {
  const roundIndex = tournament.roundIndex, round = ROUNDS[roundIndex], outcomes = new Map();
  const total = (tournament.alive.length - 2) / 2;
  let done = 0;
  for (let i = 2; i < tournament.alive.length; i += 2) {
    await new Promise(resolve => setTimeout(resolve, 0));
    const seedOfMatch = matchSeed(tournament.seed, roundIndex, i);
    const difficulties = [tournament.alive[i].difficulty, tournament.alive[i + 1].difficulty];
    outcomes.set(seedOfMatch, await simulate(round.id, seedOfMatch, difficulties, { mapType }));
    try { onProgress?.(++done, total); } catch { /* a progress display must not lose the round */ }
  }
  return outcomes;
}
