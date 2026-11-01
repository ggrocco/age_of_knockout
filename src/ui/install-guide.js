// The "Install as an app" guide: how to put the game on the Home Screen, step by step, for each phone browser.
// DOM-free (tested): every step is a caption plus a schematic phone drawn in SVG with the control to tap ringed in gold.
// The drawings are generic sketches of each browser's layout, not copies of their screens.

const GOLD = '#ffd257', INK = '#f3e7c6', DIM = '#9a917f', PANEL = '#2b2a2e', ROW = '#3a383d';
const text = (x, y, s, { size = 6.4, fill = INK, anchor = 'start', weight = 400 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${s}</text>`;
// A pulsing ring (CSS animates .tap) around the thing to tap.
const ringCircle = (cx, cy, r) => `<circle class="tap" cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="${GOLD}" stroke-opacity=".35" stroke-width="2"/>`
  + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="2.2"/>`;
const ringRect = (x, y, w, h) => `<rect class="tap" x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="7" fill="none" stroke="${GOLD}" stroke-opacity=".35" stroke-width="2"/>`
  + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${GOLD}" fill-opacity=".14" stroke="${GOLD}" stroke-width="2"/>`;

// Glyphs, centred on (x, y).
const shareGlyph = (x, y, c = INK) => `<path d="M${x - 4.5} ${y - 1}v6.5h9V${y - 1}M${x} ${y + 2}V${y - 7.5}M${x - 3} ${y - 4.5}l3-3 3 3" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`;
const dotsGlyph = (x, y, c = INK) => [-4, 0, 4].map(d => `<circle cx="${x}" cy="${y + d}" r="1.2" fill="${c}"/>`).join('');
const addGlyph = (x, y, c = INK) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="2" fill="none" stroke="${c}" stroke-width="1.1"/><path d="M${x} ${y - 2}v4M${x - 2} ${y}h4" stroke="${c}" stroke-width="1.1" stroke-linecap="round"/>`;
// The game's own icon (favicon.svg) at size s.
const gameIcon = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 64})"><rect width="64" height="64" rx="14" fill="#231a11"/>`
  + '<path d="M12 10h40v24c0 12-12 19-20 23-8-4-20-11-20-23Z" fill="#3b2e20" stroke="#c8a052" stroke-width="3"/>'
  + '<path d="m20 25 7 6 5-12 5 12 7-6-2 16H22Z" fill="#c8a052"/><path d="M23 46h18" stroke="#e8d9b0" stroke-width="3" stroke-linecap="round"/></g>';

// A phone outline; `body` draws on its screen (x 13..107, y 10..200).
const phone = body => '<svg class="guide-art" viewBox="0 0 120 210" font-family="system-ui, -apple-system, sans-serif" aria-hidden="true" focusable="false">'
  + '<rect x="6" y="3" width="108" height="204" rx="17" fill="#0d0b08" stroke="#c8a052" stroke-width="2"/>'
  + '<rect x="12" y="9" width="96" height="192" rx="12" fill="#26331f"/>'
  + '<path d="M12 120 60 92l48 28-48 28z" fill="#3c4f2b" opacity=".8"/>' // a hint of the game's map
  + body + '</svg>';
const dim = '<rect x="12" y="9" width="96" height="192" rx="12" fill="#000" opacity=".45"/>';
const urlBar = (y, right = '') => `<rect x="18" y="${y}" width="84" height="15" rx="7.5" fill="${PANEL}"/>`
  + text(52, y + 10, 'ggrocco.github.io', { size: 6, fill: DIM, anchor: 'middle' }) + right;

// The share sheet both iPhone browsers open, with "Add to Home Screen" ringed.
const iosSheet = phone(dim + `<rect x="12" y="76" width="96" height="125" rx="12" fill="${PANEL}"/>`
  + `<rect x="50" y="81" width="20" height="2.4" rx="1.2" fill="${DIM}"/>`
  + ['Copy', 'Add to Reading List', 'Add to Home Screen', 'Find on Page'].map((label, i) => {
    const y = 96 + i * 22;
    return `<rect x="18" y="${y}" width="84" height="17" rx="5" fill="${ROW}"/>` + text(23, y + 11, label)
      + (i === 2 ? addGlyph(94, y + 8.5) : '');
  }).join('') + ringRect(18, 140, 84, 17));
const iosAdd = phone(`<rect x="12" y="9" width="96" height="192" rx="12" fill="${PANEL}"/>`
  + text(19, 27, 'Cancel', { fill: '#7fb2ff', size: 6 })
  + text(100, 27, 'Add', { fill: '#7fb2ff', anchor: 'end', weight: 600 }) + ringRect(85, 19, 17, 11)
  + gameIcon(20, 42, 22) + `<rect x="48" y="46" width="54" height="14" rx="4" fill="${ROW}"/>` + text(52, 55.5, 'Knockout')
  + text(48, 72, 'ggrocco.github.io', { size: 5.4, fill: DIM }));
const homeScreen = phone('<rect x="12" y="9" width="96" height="192" rx="12" fill="#3a4a6a"/>'
  + Array.from({ length: 16 }, (_, i) => {
    const x = 21 + (i % 4) * 22, y = 32 + Math.floor(i / 4) * 30;
    return i === 9 ? '' : `<rect x="${x}" y="${y}" width="16" height="16" rx="4" fill="#fff" opacity="${0.18 + (i * 37 % 5) / 20}"/>`;
  }).join('')
  + gameIcon(43, 92, 16) + text(51, 124, 'Knockout', { size: 5.6, anchor: 'middle' }) + ringCircle(51, 100, 12)
  + '<rect x="18" y="176" width="84" height="20" rx="8" fill="#fff" opacity=".15"/>');

export const INSTALL_GUIDES = {
  safari: {
    name: 'iPhone · Safari',
    steps: [
      { text: 'Tap the <b>Share</b> button in the toolbar (on iOS 26 tap <b>&middot;&middot;&middot;</b> first, then Share).', art: phone(
        urlBar(160) + `<rect x="12" y="178" width="96" height="23" rx="0" fill="${PANEL}"/><path d="M12 178h96" stroke="#000" opacity=".4"/>`
        + `<path d="M24 186l-3 3 3 3M38 186l3 3-3 3" fill="none" stroke="${DIM}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`
        + shareGlyph(60, 190) + `<rect x="75" y="185" width="8" height="9" rx="1" fill="none" stroke="${DIM}" stroke-width="1.1"/>`
        + `<rect x="92" y="185" width="8" height="8" rx="1.5" fill="none" stroke="${DIM}" stroke-width="1.1"/>` + ringCircle(60, 189, 8)) },
      { text: 'Scroll the list and tap <b>Add to Home Screen</b>.', art: iosSheet },
      { text: 'Tap <b>Add</b>.', art: iosAdd },
      { text: 'Open <b>Knockout</b> from your Home Screen: it plays full screen, without the browser bars.', art: homeScreen },
    ],
  },
  chrome_ios: {
    name: 'iPhone · Chrome',
    steps: [
      { text: 'Tap the <b>Share</b> button at the right of the address bar.', art: phone(urlBar(16, shareGlyph(95, 24.5)) + ringCircle(95, 23.5, 8)) },
      { text: 'Scroll the list and tap <b>Add to Home Screen</b>.', art: iosSheet },
      { text: 'Tap <b>Add</b>.', art: iosAdd },
      { text: 'Open <b>Knockout</b> from your Home Screen: it plays full screen, without the browser bars.', art: homeScreen },
    ],
  },
  android: {
    name: 'Android · Chrome',
    steps: [
      { text: 'Tap the <b>&#8942;</b> menu at the right of the address bar (or use the game\'s <b>Install app</b> button when it shows).',
        art: phone(urlBar(16, dotsGlyph(97, 23.5)) + ringCircle(97, 23.5, 7.5)) },
      { text: 'Tap <b>Add to Home screen</b> (some versions say <b>Install app</b>).', art: phone(
        `<rect x="38" y="14" width="68" height="104" rx="6" fill="${PANEL}"/>`
        + ['New tab', 'History', 'Downloads', 'Add to Home screen', 'Settings'].map((label, i) =>
          text(44, 30 + i * 19, label, { size: 5.6 })).join('') + ringRect(40, 79, 64, 14)) },
      { text: 'Tap <b>Install</b> (or <b>Add</b>).', art: phone(dim + `<rect x="18" y="72" width="84" height="66" rx="9" fill="${PANEL}"/>`
        + text(24, 86, 'Install app', { weight: 600 }) + gameIcon(24, 94, 16) + text(45, 105, 'Age of Knockout', { size: 6 })
        + text(66, 129, 'Cancel', { fill: '#8ab4f8', anchor: 'end' }) + text(96, 129, 'Install', { fill: '#8ab4f8', anchor: 'end', weight: 600 })
        + ringRect(73, 121, 26, 11)) },
      { text: 'Open <b>Knockout</b> from your home screen: it plays full screen, like an app.', art: homeScreen },
    ],
  },
};

// Which guide to open first, from the user agent: Chrome on iOS says CriOS; other iPhone browsers follow Safari's steps.
export function guideFor(userAgent = '') {
  if (/CriOS/.test(userAgent)) return 'chrome_ios';
  if (/iPhone|iPad|iPod|Macintosh/.test(userAgent)) return 'safari';
  return 'android';
}

// The guide card: a tab per browser and the chosen one's steps.
export function installGuideHtml(chosen) {
  const tabs = Object.entries(INSTALL_GUIDES).map(([id, guide]) =>
    `<button class="btn ${id === chosen ? 'on' : ''}" data-guide="${id}" aria-pressed="${id === chosen}">${guide.name}</button>`).join('');
  const steps = INSTALL_GUIDES[chosen].steps.map((step, i) =>
    `<li><figure>${step.art}<figcaption><b class="step-n">${i + 1}</b> ${step.text}</figcaption></figure></li>`).join('');
  return '<h2 id="install-title">Install as an app</h2>'
    + '<p class="guide-lead">Add the game to your Home Screen and it opens full screen, with no browser bars.</p>'
    + `<div class="seg guide-tabs" role="group" aria-label="Browser">${tabs}</div>`
    + `<ol class="guide-steps">${steps}</ol>`
    + '<button class="btn primary guide-close" data-guide-close="1">Done</button>';
}
