export const DEFAULT_TIME_LIMIT = 25;
export const MAX_TIME_LIMIT = 120;

// Minutes of game time; zero disables only the score deadline.
export function parseTimeLimit(value) {
  if (value == null || String(value).trim() === '') return null;
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= MAX_TIME_LIMIT ? minutes : null;
}

export function readTimeLimit(search = '', storage) {
  const params = new URLSearchParams(search), requested = parseTimeLimit(params.get('timeLimit'));
  if (requested !== null) return requested;
  // Keep old bookmarks and the former checkbox preference working.
  if (params.has('noTimeLimit')) return params.get('noTimeLimit') === '1' ? 0 : DEFAULT_TIME_LIMIT;
  try {
    const saved = parseTimeLimit(storage?.getItem('timeLimit'));
    if (saved !== null) return saved;
    if (storage?.getItem('noTimeLimit') === 'true') return 0;
  } catch { /* Storage may be unavailable; the menu still works. */ }
  return DEFAULT_TIME_LIMIT;
}
