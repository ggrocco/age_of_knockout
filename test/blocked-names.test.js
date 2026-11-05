import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Ad blockers' "badware" lists (uBlock Origin's Badware risks, mirrored by others) block these file names on
// every github.io site, because tech-support scam pages use them to lock the browser. The game is published on
// github.io, so a module with one of these names fails to load for anyone running such a blocker: the page shows
// "could not load its files" and the console says net::ERR_BLOCKED_BY_CLIENT, while a private window (no
// extensions) works. src/ui/fullscreen.js was renamed to screen-mode.js for exactly this.
const BLOCKED = new Set(['fullscreen.js', 'fulls.js', 'flscn.js', 'esc.js', 'before.js', 'nvidia.js', 'beep.mp3',
  'alert.mp3', 'customone.js', 'customtwo.js', 'text_tel.js']);

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : [e.name]);
}

test('no published file has a name ad blockers block on github.io', () => {
  const root = new URL('..', import.meta.url).pathname;
  const names = [...files(join(root, 'src')), ...files(join(root, 'icons')), ...readdirSync(root)];
  assert.deepEqual(names.filter(n => BLOCKED.has(n.toLowerCase())), []);
});
