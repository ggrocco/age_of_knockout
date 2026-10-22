import { simulateMatch } from './sim.js';

self.onmessage = ({ data: { id, roundId, seed, diffs } }) => {
  try {
    const result = simulateMatch(roundId, seed, diffs);
    self.postMessage({ id, result });
  } catch (error) { self.postMessage({ id, error: String(error.stack || error) }); }
};
