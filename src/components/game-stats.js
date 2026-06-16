// Public Game Stats Display - Users view live game updates

import { getPlayerImageUrl } from './roster.js';

const statPercent = (made, attempted) => {
  const m = Number(made || 0);
  const a = Number(attempted || 0);
  if (!a) return '0.0';
  return ((m / a) * 100).toFixed(1);
};

export function renderGameStats(game = null, players = []) {
  if (!game) {
    return `
      <div class="empty-state" style="padding: 60px; text-align: center;">
        <i data-lucide="alert-circle" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
        <p>Game not found</p>
      </div>
    `;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  };

  const gameDate = formatDate(game.game_date);
  const gameDateTime = game.game_time ? `${gameDate} at ${game.game_time}` : gameDate;
  const normalizedStatus = String(game.status || '').toLowerCase();
  const isLive = normalizedStatus === 'live';
  const isFinal = ['result', 'completed', 'final'].includes(normalizedStatus);
  const activePlayers = players
    .filter(p => p.is_active)
    .sort((a, b) => Number(a.player_number || 0) - Number(b.player_number || 0));

  return `
    <div class="game-stats-container" style="max-width: 1200px; margin: 0 auto; padding: 20px;">
      <button class="back-button" data-smart-back data-back-fallback="#/fixtures" style="margin-bottom: 16px; background: none; border: none; color: var(--color-accent); cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
        <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
        Back to Schedule
      </button>
      <div class="glass" style="padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <h1 style="margin: 0; font-size: 28px; margin-bottom: 8px;">
              ${game.opponent}
              <span style="font-size: 20px; color: var(--color-text-secondary); font-weight: 400;">(${game.is_home ? 'Home' : 'Away'})</span>
            </h1>
            <p style="margin: 0; color: var(--color-text-secondary); font-size: 0.95rem;">${game.tournament}</p>
          </div>
          ${isLive ? `<div style="background: #ff4444; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; animation: pulse 1.5s infinite;">🔴 LIVE</div>` : isFinal ? `<div style="background: rgba(255,255,255,0.08); color: var(--color-text-secondary); padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 0.85rem;">FINAL</div>` : ''}
        </div>

        <p style="margin: 0; color: var(--color-text-secondary); font-size: 0.9rem;">
          <i data-lucide="calendar" style="width: 16px; height: 16px; display: inline; margin-right: 6px; vertical-align: middle;"></i>
          ${gameDateTime}
        </p>
        ${game.venue ? `<p style="margin: 8px 0 0 0; color: var(--color-text-secondary); font-size: 0.9rem;"><i data-lucide="map-pin" style="width: 16px; height: 16px; display: inline; margin-right: 6px; vertical-align: middle;"></i>${game.venue}</p>` : ''}
      </div>

      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; margin-bottom: 32px; align-items: center;">
        <div class="glass" style="padding: 24px; border-radius: 12px; text-align: center;">
          <div style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 12px; font-weight: 500;">BRAVEHEARTS</div>
          <div style="font-size: 64px; font-weight: 700; color: var(--color-accent); line-height: 1;">${game.our_score !== null ? game.our_score : '—'}</div>
          <div style="margin-top: 12px; font-size: 0.85rem; color: var(--color-text-secondary);">${game.team === 'men' ? 'Men' : game.team === 'ladies' ? 'Ladies' : game.team === 'boys' ? 'Boys' : 'Girls'}</div>
        </div>

        <div style="text-align: center;">
          <div style="font-size: 2rem; color: var(--color-text-secondary);">vs</div>
          ${isFinal ? `<div style="margin-top: 12px; font-size: 0.85rem; font-weight: 600; padding: 6px 12px; border-radius: 20px; background: ${game.outcome === 'win' ? 'rgba(15, 168, 88, 0.2)' : 'rgba(255, 100, 100, 0.2)'}; color: ${game.outcome === 'win' ? 'var(--color-accent)' : '#ff6464'}; display: inline-block; text-transform: uppercase;">${game.outcome === 'win' ? '✓ WIN' : game.outcome === 'loss' ? '✗ LOSS' : 'DRAW'}</div>` : ''}
        </div>

        <div class="glass" style="padding: 24px; border-radius: 12px; text-align: center;">
          <div style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 12px; font-weight: 500;">${game.opponent}</div>
          <div style="font-size: 64px; font-weight: 700; color: #ff6464; line-height: 1;">${game.opponent_score !== null ? game.opponent_score : '—'}</div>
          <div style="margin-top: 12px; font-size: 0.85rem; color: var(--color-text-secondary);">${game.opponent_origin}</div>
        </div>
      </div>

      ${activePlayers.length > 0 ? `
        <div class="glass" style="padding: 24px; border-radius: 12px;">
          <h2 style="margin: 0 0 20px 0; font-size: 20px;">Player Performance</h2>
          <div class="game-stats-table-scroll" style="overflow-x: auto;">
            <table style="width: 100%; min-width: 1700px; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid rgba(255,255,255,0.1);">
                  <th style="text-align: left; padding: 12px; color: var(--color-text-secondary);">#</th>
                  <th style="text-align: left; padding: 12px; color: var(--color-text-secondary); min-width: 150px;">Player</th>
                  ${['PTS','FGM','FGA','FG%','2PM','2PA','2P%','3PM','3PA','3P%','FTM','FTA','FT%','AST','STL','OREB','DREB','TOTREB','BLK','TO','PF'].map(h => `<th style="text-align: center; padding: 12px; color: var(--color-accent);">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${activePlayers.map(player => {
                  const oreb = Number(player.offensive_rebounds || 0);
                  const dreb = Number(player.defensive_rebounds || 0);
                  const totalRebounds = oreb + dreb || Number(player.rebounds || 0);
                  const twoPointsMade = Number(player.two_points_made || 0);
                  const twoPointsAttempted = Number(player.two_points_attempted || 0);
                  const threePointsMade = Number(player.three_points_made || 0);
                  const threePointsAttempted = Number(player.three_points_attempted || 0);
                  const freeThrowsMade = Number(player.free_throws_made || 0);
                  const calculatedPoints = (twoPointsMade * 2) + (threePointsMade * 3) + freeThrowsMade;
                  const playerImage = getPlayerImageUrl({
                    ...player,
                    name: player.player_name,
                    number: player.player_number,
                    team: game.team || 'men'
                  });
                  const calculatedFieldGoalAttempts = twoPointsAttempted + threePointsAttempted;
                  const fieldGoalsMade = Number(player.field_goals_made || 0) || twoPointsMade + threePointsMade;
                  const values = [
                    calculatedPoints,
                    fieldGoalsMade,
                    calculatedFieldGoalAttempts,
                    statPercent(fieldGoalsMade, calculatedFieldGoalAttempts),
                    twoPointsMade,
                    twoPointsAttempted,
                    statPercent(twoPointsMade, twoPointsAttempted),
                    threePointsMade,
                    threePointsAttempted,
                    statPercent(threePointsMade, threePointsAttempted),
                    freeThrowsMade,
                    player.free_throws_attempted || 0,
                    statPercent(player.free_throws_made, player.free_throws_attempted),
                    player.assists || 0,
                    player.steals || 0,
                    oreb,
                    dreb,
                    totalRebounds,
                    player.blocks || 0,
                    player.turnovers || 0,
                    player.fouls || 0
                  ];
                  return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <td style="padding: 14px 12px; font-weight: 600; color: var(--color-accent);">${player.player_number}</td>
                      <td style="padding: 14px 12px; font-weight: 500;">
                        <div class="public-stats-player-cell">
                          ${playerImage ? `
                            <img class="public-stats-player-avatar" src="${playerImage}" alt="${player.player_name}" loading="lazy" />
                          ` : `
                            <span class="public-stats-player-avatar public-stats-player-avatar-placeholder">${String(player.player_name || '?').trim().charAt(0).toUpperCase()}</span>
                          `}
                          <span>${player.player_name}</span>
                        </div>
                      </td>
                      ${values.map(value => `<td style="padding: 14px 12px; text-align: center; color: var(--color-text-secondary); font-weight: 600;">${value}</td>`).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : game.status === 'upcoming' ? `
        <div class="glass" style="padding: 40px; border-radius: 12px; text-align: center;">
          <i data-lucide="clock" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px; display: block;"></i>
          <p style="margin: 0; color: var(--color-text-secondary); font-size: 0.95rem;">Game hasn't started yet. Player stats will appear once the game begins.</p>
        </div>
      ` : ''}

      ${game.notes ? `<div class="glass" style="padding: 16px; border-radius: 12px; margin-top: 24px; border-left: 4px solid var(--color-accent);"><div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 6px; font-weight: 500;">NOTES</div><p style="margin: 0; color: var(--color-text-primary); font-size: 0.95rem;">${game.notes}</p></div>` : ''}
    </div>
  `;
}
