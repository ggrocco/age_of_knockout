import { simulateMatch } from './sim.js';

// A worker reply slower than this counts as a dead worker (phones can suspend or kill it). A bracket match takes a
// few seconds even on a slow device, so this only fires when nothing is coming back.
export const WORKER_TIMEOUT_MS = 120000;

// One worker is reused for a bracket round. No live sim state crosses threads. Matches are deterministic, so when
// the worker fails (it cannot start, crashes, stops replying, or a match throws in it) the unanswered requests run
// again on the main thread with the same result instead of failing the bracket.
export function createAsyncSimulator(
  WorkerClass = globalThis.Worker, { fallback = simulateMatch, timeoutMs = WORKER_TIMEOUT_MS } = {},
) {
  let worker, broken = !WorkerClass, nextId = 0, disposed = false, timer = null;
  const pending = new Map(); // request id -> { args, resolve, reject }, for requests the worker has not answered
  const runLocally = request => Promise.resolve().then(() => fallback(...request.args)).then(request.resolve, request.reject);
  const stopWorker = () => {
    clearTimeout(timer);
    timer = null;
    worker?.terminate();
    worker = null;
  };
  // Give up on the worker for good and run everything it still owed on the main thread.
  const abandon = () => {
    broken = true;
    stopWorker();
    const requests = [...pending.values()];
    pending.clear();
    for (const request of requests) runLocally(request);
  };
  // (Re)start the reply deadline while requests are outstanding.
  const watch = () => {
    clearTimeout(timer);
    timer = pending.size ? setTimeout(abandon, timeoutMs) : null;
  };
  const onReply = ({ data }) => {
    const request = pending.get(data?.id);
    if (!request) return;
    pending.delete(data.id);
    watch();
    if (data.error) runLocally(request);
    else request.resolve(data.result);
  };
  const start = () => {
    try { worker = new WorkerClass(new URL('./worker.js', import.meta.url), { type: 'module' }); }
    catch { broken = true; return false; }
    worker.onmessage = onReply;
    worker.onerror = event => { event?.preventDefault?.(); abandon(); };
    worker.onmessageerror = abandon;
    return true;
  };
  return {
    simulate(roundId, seed, diffs, opts = {}) {
      if (disposed) return Promise.reject(new Error('Simulator disposed'));
      return new Promise((resolve, reject) => {
        const request = { args: [roundId, seed, diffs, opts], resolve, reject };
        if (broken || (!worker && !start())) return runLocally(request);
        const id = ++nextId;
        pending.set(id, request);
        if (!timer) watch();
        try { worker.postMessage({ id, roundId, seed, diffs, opts }); } catch { abandon(); }
      });
    },
    dispose() {
      disposed = true;
      stopWorker();
      for (const request of pending.values()) request.reject(new Error('Simulator disposed'));
      pending.clear();
    },
  };
}
