// The map type for quick matches and tournaments: 'rivers' (a river with land crossings) or 'islands' (no way across but
// by ship). ?map= wins, else the saved menu pick, else Rivers. DOM-free so it is unit-testable.
import { MAP_TYPES } from './sim/map.js';

export { MAP_TYPES };
export const DEFAULT_MAP_TYPE = 'rivers';
export const MAP_NAME = { rivers: 'Rivers', islands: 'Islands' };
export const MAP_DESC = {
  rivers: 'A river between the bases with shallows and fords: soldiers can always walk across, ships sail the whole river.',
  islands: 'Each side on its own island, the relics and rich gold on a third: everything goes across by Transport Ship.',
};

export const parseMapType = value => MAP_TYPES.includes(value) ? value : null;

export function readMapType(search = '', storage) {
  const requested = parseMapType(new URLSearchParams(search).get('map'));
  if (requested) return requested;
  try { return parseMapType(storage?.getItem('mapType')) ?? DEFAULT_MAP_TYPE; } catch { return DEFAULT_MAP_TYPE; } // storage may be unavailable
}
