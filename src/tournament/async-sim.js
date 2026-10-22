import { simulateMatch } from './sim.js';

// One worker is reused for a bracket round. No live sim state crosses threads.
export function createAsyncSimulator(WorkerClass = globalThis.Worker) {
  let worker, nextId = 0, disposed = false;
  const pending = new Map();
  const fail = error => { for (const request of pending.values()) request.reject(error); pending.clear(); };
  return {
    simulate(roundId, seed, diffs) {
      if (disposed) return Promise.reject(new Error('Simulator disposed'));
      if (!WorkerClass) return Promise.resolve().then(() => simulateMatch(roundId, seed, diffs));
      if (!worker) {
        try { worker = new WorkerClass(new URL('./worker.js', import.meta.url), { type: 'module' }); }
        catch { return Promise.resolve().then(() => simulateMatch(roundId, seed, diffs)); }
        worker.onmessage = ({ data }) => {
          const request = pending.get(data.id); if (!request) return;
          pending.delete(data.id);
          if (data.error) request.reject(new Error(data.error)); else request.resolve(data.result);
        };
        worker.onerror = event => { event.preventDefault?.(); fail(new Error(event.message || 'Match worker failed')); worker?.terminate(); worker = null; };
        worker.onmessageerror = () => { fail(new Error('Invalid match worker response')); worker?.terminate(); worker = null; };
      }
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        try { worker.postMessage({ id, roundId, seed, diffs }); }
        catch (error) { pending.delete(id); reject(error); }
      });
    },
    dispose() { disposed = true; worker?.terminate(); worker = null; fail(new Error('Simulator disposed')); },
  };
}
