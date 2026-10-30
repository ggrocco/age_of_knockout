import { TEAMS, teamHex } from '../data/teams.js';
import { scoreOf } from '../rounds/index.js';

export function kingdomRows(game) {
  const territory = game.roundState.territory;
  return game.players.map(player => {
    const king = game.units.get(game.roundState.kings[player.id]);
    return { id: player.id, name: TEAMS[player.id].name, defeated: player.defeated,
      tiles: territory.counts[player.id], percent: territory.total ? territory.counts[player.id] * 100 / territory.total : 0,
      score: scoreOf(game, player.id), king,
      status: player.defeated ? (player.defeatedBy == null ? 'Eliminated' : 'Conquered')
        : king?.garrisonedIn ? 'In castle' : king?.aboard ? 'Aboard ship' : 'Exposed' };
  }).sort((a, b) => Number(a.defeated) - Number(b.defeated) || b.tiles - a.tiles || b.score - a.score || a.id - b.id);
}

export function kingdomStandingsHtml(game, final = false) {
  return `<div class="kingdom-heading">${final ? 'Final standings' : 'Territory · Kings'}</div>`
    + kingdomRows(game).map(row => `<div class="kingdom-row${row.defeated ? ' fallen' : ''}" data-team-id="${row.id}">`
      + `<span><i style="background:${teamHex(row.id)}"></i><b>${row.name}${row.id === 0 ? ' (you)' : ''}</b></span>`
      + `<span>${row.tiles} tiles <small>${row.percent.toFixed(1)}%</small></span>`
      + `<small>${row.status}${row.king ? ` · ${Math.ceil(row.king.hp)} HP` : ''}${final ? ` · score ${row.score.toFixed(0)}` : ''}</small></div>`).join('');
}
