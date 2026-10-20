// Hand-drawn 24x24 glyphs for the command tiles. DOM-free: each icon is an SVG string.
// Line work uses currentColor; D = soft duotone fill, S = solid accent. The tile CSS sets `color` and glow.
const D = 'fill="currentColor" fill-opacity=".3"', S = 'fill="currentColor" stroke="none"';
const svg = body => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const horse = extra => svg(`<path d="M5 20.5c.2-3 1.4-5 3.4-7.4L5.2 14 3.6 12.3 8.8 6.5 8.4 3.6l2.6 1.7c4.6-.9 9.4 2 9.9 8.2l.3 7z" ${D}/><circle cx="10.6" cy="8.9" r=".9" ${S}/>${extra || ''}`);

export const ICONS = {
  // buildings
  town_center: svg(`<path d="M9.5 20V7.5h5V20" ${D}/><path d="M3.5 20v-6h6M20.5 20v-6h-6"/><path d="M12 7.5v-4"/><path d="M12 3.5l3.6 1.4L12 6.3z" ${S}/><path d="M10.6 20v-3a1.4 1.4 0 0 1 2.8 0v3"/><path d="M2.5 20h19"/>`),
  house: svg(`<path d="M5.5 10.5 12 5l6.5 5.5V20h-13z" ${D}/><path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M10 20v-5h4v5"/>`),
  granary: svg(`<path d="M12 21V8.6"/><path d="M12 8.2c-1.6-1.3-1.6-3.9 0-5.4 1.6 1.5 1.6 4.1 0 5.4z" ${D}/><path d="M12 12.6c-2.8 0-4-2.1-4-4.3 2.4 0 4 1.7 4 4.3zM12 12.6c2.8 0 4-2.1 4-4.3-2.4 0-4 1.7-4 4.3z" ${D}/><path d="M12 17c-2.8 0-4-2.1-4-4.3 2.4 0 4 1.7 4 4.3zM12 17c2.8 0 4-2.1 4-4.3-2.4 0-4 1.7-4 4.3z" ${D}/>`),
  storage_pit: svg(`<path d="M4 11v-.6a8 5.4 0 0 1 16 0v.6z" ${D}/><rect x="4" y="11" width="16" height="8.5" rx="1"/><rect x="10.6" y="9.8" width="2.8" height="4" rx=".8" ${S}/>`),
  farm: svg(`<path d="M3 20.5 6 12.8h12l3 7.7z" ${D}/><path d="M12 12.8v7.7M8.6 12.8 6.6 20.5M15.4 12.8l2 7.7"/><path d="M12 12.8V8.4"/><path d="M12 9.6c0-2.2 1.6-3.6 4.2-3.6 0 2.2-1.6 3.6-4.2 3.6zM12 10.8c0-1.7-1.2-3-3.3-3 0 1.7 1.2 3 3.3 3z" ${D}/>`),
  barracks: svg(`<path d="M4.5 3.5 15 14M19.5 3.5 9 14" stroke-width="2"/><path d="M12.9 16.1l4.2-4.2M11.1 16.1 6.9 11.9" stroke-width="2.2"/><path d="M15 14l4 4M9 14l-4 4"/><circle cx="20.2" cy="19" r="1.1" ${S}/><circle cx="3.8" cy="19" r="1.1" ${S}/>`),
  archery_range: svg(`<circle cx="11" cy="13" r="7.6" ${D}/><circle cx="11" cy="13" r="3.9"/><circle cx="11" cy="13" r="1" ${S}/><path d="M11.6 12.4 20.5 3.5M20.5 3.5l-3 .2M20.5 3.5l-.2 3"/>`),
  stable: svg(`<path d="M4 21V11.5a8 8 0 0 1 16 0V21h-4.5V11.5a3.5 3.5 0 0 0-7 0V21z" ${D}/><circle cx="6.1" cy="12.4" r=".85" ${S}/><circle cx="6.1" cy="16.2" r=".85" ${S}/><circle cx="17.9" cy="12.4" r=".85" ${S}/><circle cx="17.9" cy="16.2" r=".85" ${S}/>`),
  market: svg(`<path d="M5 5h14l1.5 5h-17z" ${D}/><path d="M3.5 10a2.125 2.125 0 0 0 4.25 0 2.125 2.125 0 0 0 4.25 0 2.125 2.125 0 0 0 4.25 0 2.125 2.125 0 0 0 4.25 0"/><path d="M8.6 5l-.85 5M12 5v5M15.4 5l.85 5"/><path d="M5.5 12.6V20M18.5 12.6V20M4 20h16"/><circle cx="12" cy="16" r="2"/>`),
  government_center: svg(`<path d="M3.5 9 12 4l8.5 5z" ${D}/><path d="M6.5 10.5v7M10 10.5v7M14 10.5v7M17.5 10.5v7"/><path d="M4.5 18.6h15M3.5 21h17"/>`),
  wonder: svg(`<path d="M5 20.5 12 7l7 13.5z" ${D}/><path d="M8.4 14h7.2M10.2 10.4h3.6"/><path d="M2.5 20.5h19"/><path d="M12 1.4v3.2M10.4 3h3.2"/>`),
  castle: svg(`<path d="M4 21V7.5h2.5v2h2v-2h2.5v2h2v-2h2.5v2h2v-2H20V21z" ${D}/><path d="M9.6 21v-4.2a2.4 2.4 0 0 1 4.8 0V21"/><path d="M2.5 21h19"/><path d="M12 9.5V3"/><path d="M12 3l3.4 1.3L12 5.6z" ${S}/>`),
  factory: svg(`<path d="M3 21v-9l4.5-3v3l4.5-3v3l4.5-3v12z" ${D}/><path d="M17.2 21V5.5h2.6V21"/><path d="M2 21h20"/><path d="M18.4 3.6c-.4-1.5 1.2-2.1 2.4-1.2"/><path d="M5.6 16.4h2M10.1 16.4h2M14.6 16.4h2"/>`),
  tower: svg(`<path d="M8.5 21V10.5H7V4.5h2.4v2H11v-2h2v2h1.6v-2H17v6h-1.5V21z" ${D}/><rect x="11.3" y="12.4" width="1.4" height="3.2" rx=".5" ${S}/><path d="M10.8 21v-2.6a1.2 1.2 0 0 1 2.4 0V21"/><path d="M5.5 21h13"/>`),
  wall: svg(`<path d="M2.6 20.5V6.5h3.2v2.4h2v-2.4H11v2.4h2V6.5h3.2v2.4h2V6.5h3.2v14z" ${D}/><path d="M2.6 12.7h18.8M2.6 16.6h18.8M9.4 8.9v3.8M15.6 8.9v3.8M6 12.7v3.9M12.4 12.7v3.9M18.6 12.7v3.9M9.4 16.6v3.9M15.6 16.6v3.9"/><path d="M1.5 20.5h21"/>`),
  // units
  villager: svg(`<circle cx="12" cy="9.3" r="3" ${D}/><path d="M8 8.4a4 4 0 0 1 8 0zM6.6 8.6h10.8"/><path d="M5.5 20.5c0-3.9 2.9-6.2 6.5-6.2s6.5 2.3 6.5 6.2z" ${D}/>`),
  clubman: svg(`<path d="M11.8 12.2c-1-2.8.6-6.6 4.2-8.4 3.2-.4 4.6 2.4 3.8 5.2-.8 2.8-4.4 4.6-8 3.2z" ${D}/><path d="M11.6 12.4 4.6 19.4"/><circle cx="15.6" cy="7.4" r=".75" ${S}/><circle cx="17.8" cy="10" r=".75" ${S}/><circle cx="18.2" cy="6" r=".75" ${S}/>`),
  axeman: svg(`<path d="M5.2 20.3 15.6 8.9"/><path d="M13.6 4.6c3-1.5 6.4-.9 7.9 2-1.2 2.5-3.7 3.9-6.3 3.7z" ${D}/>`),
  slinger: svg(`<path d="M14.2 3.8 18.6 4.6 20.6 8.4 18.8 12.4 14.6 13 12.4 9.2z" ${D}/><path d="M12.4 9.2l3.2.6 3-1.4"/><path d="M10.6 14.6 4 20M8.8 11.4 3.4 14.6M14.4 17.6 9.4 21.2"/>`),
  bowman: svg(`<path d="M7.5 3.5c6.2 3.2 6.2 13.8 0 17" ${D}/><path d="M7.5 3.5v17"/><path d="M3.5 12h17M17.6 9.4 20.5 12l-2.9 2.6M3.5 12l-1.2-1.6M3.5 12l-1.2 1.6"/>`),
  spearman: svg(`<path d="M4.4 20 14.3 9.9"/><path d="M14.3 9.9 15.4 6.1l5.1-2.6-2.6 5.2z" ${D}/>`),
  hoplite: svg(`<path d="M5.2 20.2v-7.4a6.8 6.8 0 0 1 13.6 0v7.4h-4.2l-.9-3.8H10.3l-.9 3.8z" ${D}/><path d="M8.6 12.4h6.8M12 12.4v4"/><path d="M12 6V3.4M7.4 4.4c3-1.9 6.2-1.9 9.2 0" stroke-width="2"/>`),
  swordsman: svg(`<path d="M20 4 9.4 14.6" stroke-width="2.3"/><path d="M7.2 11.6 12.4 16.8"/><path d="M10.4 15.6 5.6 20.4"/><circle cx="4.6" cy="21" r="1.1" ${S}/>`),
  scout: svg(`<g transform="rotate(-30 12 12)"><rect x="2.5" y="9.6" width="7.5" height="4.8" rx="1.2" ${D}/><rect x="10" y="10.5" width="6" height="3" rx=".8"/><rect x="16" y="11.2" width="5" height="1.6" rx=".6" ${D}/></g><path d="M8.5 17.5 6.6 21M12 16l1.4 5"/>`),
  horse_archer: horse(`<path d="M13 13.5 21.5 5M21.5 5l-3 .2M21.5 5l-.3 3"/>`),
  catapult: svg(`<path d="M3 18.2h15"/><path d="M8.6 18.2 11.6 11.4M6.4 15.6 17 6.6"/><path d="M15.2 8.6c.9-2 3.7-3 5.1-1.3" ${D}/><circle cx="19.2" cy="4.6" r="1.5" ${S}/><circle cx="6" cy="19.6" r="2" ${D}/><circle cx="15" cy="19.6" r="2" ${D}/>`),
  knight: horse(`<path d="M10.5 15.5 20.8 2.6" stroke-width="2"/><path d="M20.8 2.6l.4 2.8-2.2-1.2z" ${S}/><path d="M18.4 5.6l-3.4-.4 1.6 2.6z" ${D}/>`),
  crossbowman: svg(`<rect x="10.6" y="8" width="2.8" height="12.5" rx="1" ${D}/><path d="M3.5 10.2c3-3.6 14-3.6 17 0"/><path d="M3.5 10.2 12 13.2l8.5-3"/><path d="M12 13.2V2.8M10.6 4.4 12 2.8l1.4 1.6"/>`),
  trebuchet: svg(`<path d="M4 20.5h16"/><path d="M7.5 20.5 12 11l4.5 9.5" ${D}/><path d="M20.5 4.5 7 15.8"/><rect x="5" y="14.4" width="4" height="4" rx=".8" ${S}/><path d="M20.5 4.5v4.2"/><circle cx="20.5" cy="9.6" r="1.1" ${S}/>`),
  musketeer: svg(`<path d="M3 19.5 19.6 5.4" stroke-width="1.9"/><path d="M3 19.5l2.6 1.4 2.2-2.4-1.6-2.3z" ${D}/><path d="M19.6 5.4 21.4 3.6"/><path d="M13.5 15.5c2.6 1.6 5.6.8 6.6-1.8l-2.2-.9c-.6 1.4-2.2 1.9-3.6 1.1z" ${D}/>`),
  cannon: svg(`<path d="M3.6 15.4 18.8 8.2a2 2 0 0 1 1.7 3.6L5.3 19z" ${D}/><circle cx="8.4" cy="17.4" r="3.3"/><circle cx="8.4" cy="17.4" r=".9" ${S}/><path d="M2.5 20.8h11"/>`),
  rifleman: svg(`<path d="M2.8 16.4 6.4 13.2H18" stroke-width="1.8"/><path d="M2.8 16.4 2.4 19l4.2-.8 2-2.6z" ${D}/><path d="M18 12.2 22 13.2 18 14.2z" ${S}/><path d="M10.6 13.2v2.6M13.2 13.2l.6 2.4"/>`),
  field_artillery: svg(`<path d="M9.5 9.6H21" stroke-width="2.2"/><path d="M5 6.5h5.4v8.4H5z" ${D}/><circle cx="8" cy="17.6" r="3"/><path d="M8 14.6v6M5 17.6h6"/><path d="M10.4 13.6 17.6 20.5"/>`),
  machine_gunner: svg(`<path d="M4 9.6h12.8" stroke-width="2.4"/><path d="M16.8 9.6h4.4"/><rect x="7" y="10.6" width="3.6" height="3.4" rx=".6" ${D}/><path d="M12 10.4 7.4 20.5M12 10.4l4.6 10.1M12 10.4v10.1"/><path d="M5 6.4h3.6v3.2"/>`),
  tank: svg(`<rect x="2.5" y="14.4" width="19" height="5.4" rx="2.7" ${D}/><circle cx="6.2" cy="17.1" r="1" ${S}/><circle cx="10.1" cy="17.1" r="1" ${S}/><circle cx="14" cy="17.1" r="1" ${S}/><circle cx="17.8" cy="17.1" r="1" ${S}/><path d="M5 14.4 6.6 11h10.8l1.6 3.4"/><path d="M8.6 11V8.6h5.6V11" ${D}/><path d="M14.2 9.6h7.4"/>`),
  drone: svg(`<rect x="9.4" y="9.8" width="5.2" height="4.4" rx="1.6" ${D}/><path d="M9.6 10.8 6.6 7.8M14.4 10.8l3-3M9.6 13.2l-3 3M14.4 13.2l3 3"/><circle cx="5.2" cy="6.4" r="2.4" ${D}/><circle cx="18.8" cy="6.4" r="2.4" ${D}/><circle cx="5.2" cy="17.6" r="2.4" ${D}/><circle cx="18.8" cy="17.6" r="2.4" ${D}/><circle cx="12" cy="12" r="1.1" ${S}/>`),
  mech: svg(`<rect x="9" y="2.8" width="6" height="4.6" rx="1.2" ${D}/><path d="M10.4 5.2h3.2"/><rect x="7" y="8.6" width="10" height="6.2" rx="1.6" ${D}/><path d="M7 10.2H4.4v5.2M17 10.2h2.6v5.2"/><path d="M9.6 14.8 8.2 20.6H5.4M14.4 14.8l1.4 5.8h2.8"/>`),
  railgun: svg(`<rect x="2.5" y="11.2" width="15" height="3.6" rx="1" ${D}/><path d="M4 13h13"/><path d="M8 14.8 6 20.4M12.6 14.8l2 5.6M4.4 20.4h12"/><path d="M21 8.2l-1.7 3.3h2.7L20.3 15"/>`),
  king: svg(`<path d="M4.2 18.6 3.6 8.2l4.9 4.3L12 5.8l3.5 6.7 4.9-4.3-.6 10.4z" ${D}/><path d="M4.4 20.8h15.2"/><circle cx="3.6" cy="7.6" r="1.1" ${S}/><circle cx="12" cy="5" r="1.1" ${S}/><circle cx="20.4" cy="7.6" r="1.1" ${S}/>`),
  // ui
  age: svg(`<path d="M5.8 12.8 12 6.6l6.2 6.2" /><path d="M5.8 19 12 12.8l6.2 6.2" ${D}/><path d="M19.4 2.4v4M17.4 4.4h4"/>`),
  lock: svg(`<path d="M7.6 11V8.4a4.4 4.4 0 0 1 8.8 0V11"/><rect x="5.5" y="11" width="13" height="9.5" rx="2" ${D}/><circle cx="12" cy="15.2" r="1.3" ${S}/>`),
  unknown: svg(`<circle cx="12" cy="12" r="8.2" ${D}/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9"/><circle cx="12" cy="17" r=".9" ${S}/>`),
};
// Class fallbacks so a future unit never renders a blank tile.
const BY_CLASS = { civ: ICONS.villager, inf: ICONS.swordsman, archer: ICONS.bowman, cav: ICONS.horse_archer, siege: ICONS.catapult, armor: ICONS.tank };
// Tech tiles reuse a representative existing icon (weapon/shield/arrow/economy) instead of the "?" glyph.
const TECH_ICON = { bronze_weapons: ICONS.swordsman, iron_weapons: ICONS.swordsman, bronze_shields: ICONS.hoplite, ballistics: ICONS.bowman, woodworking: ICONS.storage_pit, gold_mining: ICONS.market };

export const icon = (id, cls) => ICONS[id] || TECH_ICON[id] || BY_CLASS[cls] || ICONS.unknown;
