// Admin Game Stats Management - Live game updates

const STAT_COLUMNS = [
  ['points', 'PTS'],
  ['field_goals_made', 'FGM'],
  ['field_goals_attempted', 'FGA'],
  ['two_points_made', '2PM'],
  ['two_points_attempted', '2PA'],
  ['three_points_made', '3PM'],
  ['three_points_attempted', '3PA'],
  ['free_throws_made', 'FTM'],
  ['free_throws_attempted', 'FTA'],
  ['assists', 'AST'],
  ['steals', 'STL'],
  ['offensive_rebounds', 'OREB'],
  ['defensive_rebounds', 'DREB'],
  ['blocks', 'BLK'],
  ['turnovers', 'TO'],
  ['fouls', 'PF']
];

export function renderGameStatsManager(game = null, players = []) {
  if (!game) {
    return `
      <div class="empty-state" style="padding: 60px; text-align: center;">
        <i data-lucide="alert-circle" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
        <p>No game selected</p>
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
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return dateStr;
  };

  const gameDate = formatDate(game.game_date);

  return `
    <div class="admin-game-stats">
      <div class="section-header" style="margin-bottom: 24px; justify-content: space-between;">
        <button class="back-button" id="back-to-schedules">← Back to Schedules</button>
        <div>
          <h2 class="section-title">Live Game Stats: ${game.opponent}</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">
            ${gameDate} • ${game.game_time || 'TBD'} • ${game.venue || ''}
          </p>
        </div>
      </div>

      <div class="scoreboard-container" style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; align-items: center;">
        <div class="glass" style="padding: 20px; border-radius: 12px; text-align: center;">
          <div style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 8px;">Bravehearts</div>
          <input type="number" id="our-score-input" value="${game.our_score || 0}" style="width: 100px; font-size: 48px; font-weight: 700; text-align: center; border: none; background: transparent; color: var(--color-accent);" min="0" />
        </div>
        <div style="text-align: center; font-size: 2rem; color: var(--color-text-secondary);">vs</div>
        <div class="glass" style="padding: 20px; border-radius: 12px; text-align: center;">
          <div style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 8px;">${game.opponent}</div>
          <input type="number" id="opponent-score-input" value="${game.opponent_score || 0}" style="width: 100px; font-size: 48px; font-weight: 700; text-align: center; border: none; background: transparent; color: #ff6464;" min="0" />
        </div>
      </div>

      <div class="analytics-card glass" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px;">
          <h3 class="section-title" style="margin: 0;">Player Statistics</h3>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <a class="btn btn-secondary btn-sm" href="/templates/game-stats-template.csv" download>CSV Template</a>
            <a class="btn btn-secondary btn-sm" href="/templates/game-stats-template.xlsx" download>XLSX Template</a>
            <input id="game-stats-import-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none;" />
            <button id="game-stats-import-btn" type="button" class="btn btn-secondary btn-sm">Import CSV/XLSX</button>
            <button id="add-player-btn" class="btn btn-primary btn-sm">
              <i data-lucide="user-plus" style="width: 16px; height: 16px; margin-right: 6px; display: inline;"></i> Add Player
            </button>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table class="stats-table" style="min-width: 1800px;">
            <thead>
              <tr>
                <th style="text-align: left; position: sticky; left: 0; z-index: 2; background: var(--bg-obsidian-light);">#</th>
                <th style="text-align: left; position: sticky; left: 48px; z-index: 2; background: var(--bg-obsidian-light); min-width: 170px;">Player</th>
                ${STAT_COLUMNS.map(([, label]) => `<th>${label}</th>`).join('')}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${players.length > 0 ? players
                .sort((a, b) => Number(a.player_number || 0) - Number(b.player_number || 0))
                .map(player => `
                <tr class="player-stat-row" data-player-id="${player.id}" style="${!player.is_active ? 'opacity: 0.5;' : ''}">
                  <td style="text-align: left; font-weight: 600; color: var(--color-accent); position: sticky; left: 0; background: var(--bg-obsidian-light);">${player.player_number}</td>
                  <td style="position: sticky; left: 48px; background: var(--bg-obsidian-light);">
                    <div class="stats-player-cell">
                      ${player.image_url ? `
                        <img class="stats-player-avatar" src="${player.image_url}" alt="${player.player_name}" />
                      ` : `
                        <div class="stats-player-avatar stats-player-avatar-placeholder">${String(player.player_name || '?').trim().charAt(0).toUpperCase()}</div>
                      `}
                      <input type="text" class="player-name-input" value="${player.player_name}" data-player-id="${player.id}" readonly />
                    </div>
                  </td>
                  ${STAT_COLUMNS.map(([field]) => {
                    const twoPointsMade = Number(player.two_points_made || 0);
                    const threePointsMade = Number(player.three_points_made || 0);
                    const twoPointsAttempted = Number(player.two_points_attempted || 0);
                    const threePointsAttempted = Number(player.three_points_attempted || 0);
                    const derivedValues = {
                      points: (twoPointsMade * 2) + (threePointsMade * 3),
                      field_goals_made: twoPointsMade + threePointsMade,
                      field_goals_attempted: twoPointsAttempted + threePointsAttempted
                    };
                    const value = derivedValues[field] ?? player[field] ?? 0;
                    const isDerived = ['points', 'field_goals_made', 'field_goals_attempted'].includes(field);
                    return `
                    <td>
                      <input type="number" class="stat-input ${field}" value="${value}" data-player-id="${player.id}" min="0" ${field === 'fouls' ? 'max="6"' : ''} ${isDerived ? 'readonly title="Auto-calculated"' : ''} />
                    </td>
                  `;
                  }).join('')}
                  <td style="text-align: center;">
                    <button class="delete-player-btn" data-player-id="${player.id}" title="Remove">
                      <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="${STAT_COLUMNS.length + 3}" style="text-align: center; padding: 30px; color: var(--color-text-secondary);">
                  No players added yet. Click "Add Player" to start tracking stats.
                </td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
        <button id="save-game-stats-btn" class="btn btn-primary">
          <i data-lucide="save" style="width: 18px; height: 18px; margin-right: 6px; display: inline;"></i> Save Stats & Finish Game
        </button>
        <button id="auto-save-stats-btn" class="btn btn-secondary" style="opacity: 0.7;">
          <i data-lucide="check" style="width: 18px; height: 18px; margin-right: 6px; display: inline;"></i> Auto-saving...
        </button>
      </div>
    </div>
  `;
}

export function renderAddPlayerModal(availablePlayers = []) {
  return `
    <div class="modal-overlay" id="add-player-modal">
      <div class="modal-content glass" style="width: 90%; max-width: 400px; padding: 24px; border-radius: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 class="section-title" style="margin: 0;">Add Player</h3>
          <button class="close-modal-btn" style="background: none; border: none; cursor: pointer; font-size: 24px; color: var(--color-text-secondary);">×</button>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label">Select Player *</label>
          <select id="modal-player-select" class="form-input" required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); color: white;">
            <option value="" disabled selected>-- Select a Player --</option>
            ${availablePlayers.map(p => `<option value="${p.number}|${p.name}">#${p.number} - ${p.name}</option>`).join('')}
          </select>
        </div>

        <div style="display: flex; gap: 12px;">
          <button id="modal-cancel-btn" class="btn btn-secondary" style="flex: 1;">Cancel</button>
          <button id="modal-add-player-btn" class="btn btn-primary" style="flex: 1;">Add Player</button>
        </div>
      </div>
    </div>
  `;
}
