/* global document, window -- used inside page.evaluate / waitForFunction */
// Browser smoke test of the site exactly as GitHub Pages serves it: the folder scripts/build-site.sh assembles,
// served under the /age_of_knockout/ sub-path, in Chromium, Firefox and WebKit (Safari's engine).
//   bash scripts/build-site.sh _site
//   node test/tools/browser-smoke.js [siteDir=_site] [browsers=chromium,firefox,webkit]
// Each browser opens the menu and plays into a tournament round, resigns it so the bracket is simulated (the module
// Worker) to the Eliminated screen, starts a quick match, Kingdom Conquest, an islands map and the touch layout, and
// opens buildings.html and ages.html. A check fails on any uncaught error, console error, failed request or HTTP
// error, or a match whose sim or render loop does not move. Chromium also starts a match with WebGL disabled and
// expects the "3D graphics are unavailable" message. Exits non-zero if anything failed.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve, sep } from 'node:path';

const playwright = createRequire(import.meta.url)('playwright');
const siteDir = resolve(process.argv[2] || '_site');
const browsers = (process.argv[3] || 'chromium,firefox,webkit').split(',');
const PREFIX = '/age_of_knockout/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// A static server that, like Pages, serves the site only under its sub-path.
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (!path.startsWith(PREFIX)) { res.writeHead(404).end(); return; }
  let file = normalize(join(siteDir, path.slice(PREFIX.length)));
  if (file !== siteDir && !file.startsWith(siteDir + sep)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    await stat(file);
  } catch { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}${PREFIX}`;

// Waits until the live match's sim clock and render loop have both moved on.
async function matchRuns(page) {
  await page.waitForFunction(() => window.__app?.match?.game, null, { timeout: 60000 });
  const before = await page.evaluate(() => ({ time: window.__app.match.game.time, frames: window.__app.match.frames }));
  await page.waitForFunction(b => {
    const m = window.__app.match;
    return m && m.game.time > b.time && m.frames > b.frames + 5;
  }, before, { timeout: 60000 });
}

const clickText = (page, text) => page.locator('#screen button', { hasText: text }).first().click({ timeout: 30000 });

const CHECKS = [
  ['tournament round won, bracket simulated in the Worker', 'index.html', async page => {
    await clickText(page, 'Begin Tournament');
    await clickText(page, 'Begin Round');
    await matchRuns(page);
    // The opponent resigns (the command the HUD's Resign button sends), so the round is won and the other 15
    // round-one matches are simulated before the Round 2 screen.
    await page.evaluate(() => window.__app.match.game.command(1, { type: 'resign' }));
    await clickText(page, 'Continue');
    await page.waitForFunction(() => {
      const text = document.getElementById('screen').textContent;
      if (/Unable to finish the bracket/.test(text)) throw new Error('bracket simulation failed');
      return /Round 2 of 5/.test(text);
    }, null, { timeout: 240000, polling: 500 });
    // The game quietly falls back to the main thread when the Worker fails, so check the Worker did the work.
    const worker = await page.evaluate(() => window.__smokeWorker);
    if (worker.errors.length || worker.replies < 15) {
      throw new Error(`bracket Worker: ${worker.replies} replies, errors: ${worker.errors.join('; ') || 'none'}`);
    }
  }],
  ['quick match', '?round=1&seed=1&speed=4', matchRuns],
  ['Kingdom Conquest', '?mode=kingdoms&seed=2', matchRuns],
  ['islands map (ships, fish)', '?round=4&map=islands&seed=3', matchRuns],
  ['touch layout', '?round=2&seed=4&touch=1', matchRuns, { viewport: { width: 402, height: 874 }, hasTouch: true }],
  ['buildings.html', 'buildings.html', page => page.waitForTimeout(4000)],
  ['ages.html', 'ages.html', page => page.waitForTimeout(4000)],
];

// Counts what each page's Workers answer: results, and errors (thrown in the Worker or replied as an error).
const WATCH_WORKERS = `(() => {
  const log = window.__smokeWorker = { replies: 0, errors: [] }, Base = window.Worker;
  if (!Base) return;
  window.Worker = class extends Base {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', e => { if (e.data?.error) log.errors.push(String(e.data.error)); else log.replies++; });
      this.addEventListener('error', e => log.errors.push(e.message || 'error event'));
      this.addEventListener('messageerror', () => log.errors.push('messageerror'));
    }
  };
})();`;

let failures = 0;
async function check(browser, label, path, run, contextOptions = {}) {
  const context = await browser.newContext(contextOptions);
  await context.addInitScript(WATCH_WORKERS);
  const page = await context.newPage();
  const problems = [];
  // The first problem ends the check at once instead of letting it wait out its timeouts.
  let stop;
  const stopped = new Promise((_, reject) => { stop = reject; });
  stopped.catch(() => {});
  const problem = text => { problems.push(text); stop(new Error('stopped at the first problem')); };
  page.on('pageerror', error => problem(`uncaught: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problem(`console: ${message.text().slice(0, 500)}`); });
  page.on('requestfailed', request => {
    // a navigation away (or the page closing) aborts requests still in flight; that is not a missing file
    if (!/abort|cancel/i.test(request.failure()?.errorText ?? '')) problem(`request failed: ${request.url()} ${request.failure()?.errorText}`);
  });
  page.on('response', response => { if (response.status() >= 400) problem(`HTTP ${response.status()}: ${response.url()}`); });
  const started = Date.now();
  try {
    await Promise.race([stopped, (async () => {
      await page.goto(base + (path === 'index.html' ? '' : path), { waitUntil: 'load' });
      await run(page);
    })()]);
  } catch (error) {
    if (!problems.length) problems.push(String(error.message ?? error).split('\n')[0]);
  }
  await context.close();
  const time = `${((Date.now() - started) / 1000).toFixed(1)}s`;
  if (problems.length) {
    failures++;
    console.log(`FAIL ${browser.browserType().name()} ${label} (${time})`);
    for (const problem of problems) console.log(`     ${problem}`);
  } else console.log(`ok   ${browser.browserType().name()} ${label} (${time})`);
}

for (const name of browsers) {
  // Headless Firefox on a GPU-less Linux runner finds no GL driver at all, so with an X display (CI runs this under
  // xvfb-run) it opens a real window and draws through Mesa's software OpenGL; webgl.force-enabled gets it past the
  // blocklist, which refuses WebGL2 on such a driver. Chromium and WebKit bring their own software renderers.
  const firefox = name === 'firefox';
  const browser = await playwright[name].launch(firefox
    ? { headless: !process.env.DISPLAY, firefoxUserPrefs: { 'webgl.force-enabled': true } } : {});
  console.log(`${name} ${browser.version()}`);
  for (const [label, path, run, options] of CHECKS) await check(browser, label, path, run, options);
  await browser.close();
}

// Without WebGL a match must explain itself rather than do nothing (Chromium can switch WebGL off).
if (browsers.includes('chromium')) {
  const browser = await playwright.chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  let ok = true;
  try {
    await page.goto(`${base}?round=1&seed=1`);
    await page.locator('#screen', { hasText: '3D graphics are unavailable' }).waitFor({ timeout: 30000 });
  } catch (error) {
    ok = false;
    failures++;
    console.log(`FAIL chromium without WebGL: no explanation shown (${String(error.message).split('\n')[0]})`);
  }
  if (ok) console.log('ok   chromium without WebGL: explains that 3D graphics are unavailable');
  await browser.close();
}

server.close();
if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll browser checks passed');
