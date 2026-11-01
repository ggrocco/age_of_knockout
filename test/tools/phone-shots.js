/* global document, window, dispatchEvent, getComputedStyle, innerHeight, innerWidth -- used inside page.evaluate */
// Screenshots of the phone layout at iPhone 17 Pro sizes, for the browser check every change needs.
//   npm start                                   (in another terminal)
//   node test/tools/phone-shots.js [outDir] [url]
// outDir defaults to phone-shots/ (git-ignored); url to http://localhost:8000/?round=1&opp=easy&seed=1.
// Chromium has no notch, so each shot fakes the safe-area insets the real phone reports (the --sat/--sar/--sab/--sal
// variables in styles.css). The shots, with a villager selected so the build strip is up:
//   portrait-safari     402x874, insets 62/34: Safari tab or a Home Screen app drawn under the status bar
//   portrait-homescreen 402x812, insets 0/34: Home Screen app with the opaque status bar (index.html)
//   portrait-short      402x812, the iOS 26 bug of an old black-translucent install (body.short-viewport)
//   landscape           874x402, insets 62 left and right, 21 bottom
// Exits non-zero when the page logs an error or a bottom control leaves the screen. Look at every PNG it writes.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const outDir = process.argv[2] || 'phone-shots';
const base = process.argv[3] || 'http://localhost:8000/?round=1&opp=easy&seed=1';
const url = `${base}${base.includes('?') ? '&' : '?'}touch=1&quality=balanced`;
const SHOTS = [
  { name: 'portrait-safari', width: 402, height: 874, insets: [62, 0, 34, 0] },
  { name: 'portrait-homescreen', width: 402, height: 812, insets: [0, 0, 34, 0] },
  { name: 'portrait-short', width: 402, height: 812, insets: [62, 0, 34, 0], short: true },
  { name: 'landscape', width: 874, height: 402, insets: [0, 62, 21, 62] },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
let failed = false;
for (const shot of SHOTS) {
  const context = await browser.newContext({ viewport: { width: shot.width, height: shot.height }, screen: { width: 402, height: 874 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(({ insets: [top, right, bottom, left], short }) => {
    if (short) Object.defineProperty(navigator, 'standalone', { value: true });
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = `:root { --sat:${top}px !important; --sar:${right}px !important; --sab:${bottom}px !important; --sal:${left}px !important; }`
        + (short ? 'div[style*="safe-area-inset-top"] { padding-top:62px !important; }' : '');
      document.head.append(style);
      dispatchEvent(new Event('resize'));
    });
  }, shot);
  await page.goto(url);
  await page.waitForFunction(() => window.__app?.match?.game, null, { timeout: 30000 });
  await page.evaluate(() => {
    const { match, ui } = window.__app;
    const villager = [...match.game.units.values()].find(u => u.owner === 0 && u.type === 'villager');
    if (villager) ui.sel.add(villager.id);
  });
  await page.waitForTimeout(1500);
  const offscreen = await page.evaluate(() => {
    const shown = el => el.offsetParent && getComputedStyle(el).display !== 'none';
    const cut = [...document.querySelectorAll('#cmds, #touchbar button, #info, #topbar, #minimap-wrap')].filter(shown)
      .filter(el => { const r = el.getBoundingClientRect(); return r.top < -0.5 || r.bottom > innerHeight + 0.5 || r.left < -0.5 || r.right > innerWidth + 0.5; })
      .map(el => el.id || el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20));
    // The portrait build strip scrolls sideways only, so its tiles must fit its height (the landscape grid scrolls).
    const strip = document.getElementById('cmds');
    if (shown(strip) && getComputedStyle(strip).overflowY === 'hidden') {
      const box = strip.getBoundingClientRect();
      for (const tile of strip.querySelectorAll('.tile')) {
        const r = tile.getBoundingClientRect();
        if (r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5) cut.push(`tile ${tile.textContent.trim().slice(0, 20)}`);
      }
    }
    return cut;
  });
  const file = join(outDir, `${shot.name}.png`);
  await page.screenshot({ path: file });
  const problems = [...errors, ...offscreen.map(name => `cut off: ${name}`)];
  console.log(`${file}${problems.length ? `\n  ${problems.join('\n  ')}` : ''}`);
  if (problems.length) failed = true;
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
