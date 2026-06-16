// Admin Game Schedules Management Component

function formatScheduleDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return dateStr;
}

export function renderSchedulesList(games = [], currentFilter = 'all') {
  const upcoming = games.filter(g => g.status === 'upcoming').length;
  const live = games.filter(g => g.status === 'live').length;
  const results = games.filter(g => g.status === 'result').length;

  return `
    <div class="admin-schedules">
      <div class="section-header" style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 class="section-title">Game Schedules</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">Create, edit, and manage game fixtures and results</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn btn-secondary btn-sm export-report-btn" data-type="games" style="display: flex; align-items: center; gap: 6px; cursor: pointer; height: 44px;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export Schedule CSV
          </button>
          <button id="add-game-btn" class="btn btn-primary" style="height: 44px;">
            <i data-lucide="plus" style="width: 18px; height: 18px; margin-right: 6px; display: inline;"></i> Add Game
          </button>
        </div>
      </div>


      <!-- Filters -->
      <div class="filters-bar" style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="filter-btn ${currentFilter === 'all' ? 'filter-btn-active' : ''}" data-filter="all">All Games (${games.length})</button>
        <button class="filter-btn ${currentFilter === 'upcoming' ? 'filter-btn-active' : ''}" data-filter="upcoming">Upcoming (${upcoming})</button>
        ${live > 0 ? `<button class="filter-btn ${currentFilter === 'live' ? 'filter-btn-active' : ''}" data-filter="live" style="border-color: #ff4444; color: #ff4444;">🔴 Live (${live})</button>` : ''}
        <button class="filter-btn ${currentFilter === 'result' ? 'filter-btn-active' : ''}" data-filter="result">Results (${results})</button>
      </div>

      <!-- Games Grid -->
      <div class="admin-games-grid-wrap">
        ${games.length > 0 ? `
          <div class="admin-games-grid">
            ${games.map(game => `
              <article class="admin-game-card" data-game-id="${game.id}">
                <div class="admin-game-date">
                  <strong>${formatScheduleDate(game.game_date)}</strong>
                  ${game.game_time ? `<span>${game.game_time}</span>` : ''}
                </div>
                <div class="admin-game-main">
                  <div class="admin-game-topline">
                    <strong class="admin-game-opponent">vs ${game.opponent}</strong>
                    ${game.status === 'live'
                      ? `<span class="admin-game-status live">LIVE</span>`
                      : `<span class="admin-game-status ${game.status}">${game.status === 'upcoming' ? 'UPCOMING' : 'PLAYED'}</span>`}
                  </div>
                  <div class="admin-game-meta">
                    <span>${game.team ? game.team.charAt(0).toUpperCase() + game.team.slice(1) : 'Team'}</span>
                    <span>${game.is_home ? '🏠 Home' : '✈️ Away'}</span>
                    <span>${game.venue || (game.is_home ? 'Home' : 'Away')}</span>
                  </div>
                  <div class="admin-game-bottomline">
                    <span class="admin-game-tournament">${game.tournament || 'Tournament'}</span>
                    ${game.opponent_origin ? `<span class="admin-game-origin">${game.opponent_origin}</span>` : ''}
                  </div>
                </div>
                <div class="admin-game-score">
                  ${['live', 'result'].includes(game.status) ? `
                    <strong>${game.our_score || 0} - ${game.opponent_score || 0}</strong>
                    <span>${game.status === 'live' ? 'Live' : (game.outcome || 'Result')}</span>
                  ` : `
                    <strong>—</strong>
                    <span>Score</span>
                  `}
                </div>
                <div class="admin-game-actions">
                  <button class="btn-action live-stats-btn" data-game-id="${game.id}" title="Live Stats">
                    <i data-lucide="activity"></i>
                  </button>
                  <button class="btn-action edit-game-btn" data-game-id="${game.id}" title="Edit">
                    <i data-lucide="edit-2"></i>
                  </button>
                  <button class="btn-action delete-game-btn" data-game-id="${game.id}" title="Delete">
                    <i data-lucide="trash-2"></i>
                  </button>
                </div>
              </article>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <i data-lucide="calendar" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
            <p>No games found</p>
          </div>
        `}
      </div>
    </div>
  `;
}

export function renderScheduleForm(game = null) {
  const isEdit = !!game;
  const title = isEdit ? `Edit Game: vs ${game.opponent}` : 'Schedule New Game';

  return `
    <div class="admin-schedules">
      <div class="section-header" style="margin-bottom: 30px;">
        <button class="back-button" id="back-to-schedules">← Back to Schedules</button>
        <h2 class="section-title">${title}</h2>
      </div>

      <form id="game-form" class="product-form" style="max-width: 700px;">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="game-tournament">Tournament / League *</label>
            <input class="form-input" type="text" id="game-tournament" name="tournament" placeholder="e.g., Central Zone Basketball League" required value="${game?.tournament || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="game-team">Team *</label>
            <select class="form-input" id="game-team" name="team" required>
              <option value="men" ${(!game || game?.team === 'men') ? 'selected' : ''}>Men</option>
              <option value="ladies" ${game?.team === 'ladies' ? 'selected' : ''}>Ladies</option>
              <option value="boys" ${game?.team === 'boys' ? 'selected' : ''}>Boys</option>
              <option value="girls" ${game?.team === 'girls' ? 'selected' : ''}>Girls</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="game-opponent">Opponent *</label>
            <input class="form-input" type="text" id="game-opponent" name="opponent" placeholder="e.g., Lilongwe Wolves" required value="${game?.opponent || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="game-opponent-origin">Opponent Origin *</label>
            <input class="form-input" type="text" id="game-opponent-origin" name="opponent_origin" placeholder="e.g., Malawi" required value="${game?.opponent_origin || ''}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="game-date">Game Date *</label>
            <input class="form-input" type="date" id="game-date" name="game_date" required value="${game?.game_date || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="game-time">Game Time</label>
            <input class="form-input" type="time" id="game-time" name="game_time" value="${game?.game_time || ''}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="game-venue">Venue</label>
            <input class="form-input" type="text" id="game-venue" name="venue" placeholder="e.g., ABC Blue Gym, Lilongwe" value="${game?.venue || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="game-status">Status *</label>
            <select class="form-input" id="game-status" name="status" required>
              <option value="upcoming" ${(!game || game?.status === 'upcoming') ? 'selected' : ''}>Upcoming</option>
              <option value="live" ${game?.status === 'live' ? 'selected' : ''}>Live</option>
              <option value="result" ${game?.status === 'result' ? 'selected' : ''}>Result (Played)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: var(--color-text-primary);">
            <input type="checkbox" id="game-is-home" name="is_home" ${(!game || game?.is_home) ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" />
            Home Game
          </label>
        </div>

        <!-- Score Section (visible when status = result or live) -->
        <div id="score-section" style="display: ${['live', 'result'].includes(game?.status) ? 'block' : 'none'}; padding: 20px; border: 1px solid rgba(30, 255, 0, 0.15); border-radius: 12px; margin-bottom: 20px;">
          <h4 style="margin-bottom: 16px; color: var(--color-text-primary);">Score / Live Score</h4>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="game-our-score">Bravehearts Score</label>
              <input class="form-input" type="number" id="game-our-score" name="our_score" placeholder="0" value="${game?.our_score ?? ''}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="game-opponent-score">Opponent Score</label>
              <input class="form-input" type="number" id="game-opponent-score" name="opponent_score" placeholder="0" value="${game?.opponent_score ?? ''}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="game-outcome">Outcome</label>
            <select class="form-input" id="game-outcome" name="outcome">
              <option value="" ${!game?.outcome ? 'selected' : ''}>Select outcome</option>
              <option value="win" ${game?.outcome === 'win' ? 'selected' : ''}>Win</option>
              <option value="loss" ${game?.outcome === 'loss' ? 'selected' : ''}>Loss</option>
              <option value="draw" ${game?.outcome === 'draw' ? 'selected' : ''}>Draw</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="game-opponent-logo-url">Opponent Team Logo</label>
          <div style="display: flex; gap: 10px;">
            <input class="form-input" type="text" id="game-opponent-logo-url" name="opponent_logo_url" placeholder="Upload or paste logo URL" value="${game?.opponent_logo_url || ''}" style="flex-grow: 1;" />
            <div style="position: relative;">
              <button type="button" class="btn btn-secondary" id="upload-opponent-logo-btn" style="height: 44px;">Upload</button>
              <input type="file" id="opponent-logo-file" accept="image/*" style="display: none;" />
            </div>
          </div>
          <p style="margin: 6px 0 0; font-size: 0.8rem; color: var(--color-text-muted);">Bravehearts uses the club logo automatically. Upload a logo only for the opponent.</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="game-notes">Notes</label>
          <textarea class="form-input" id="game-notes" name="notes" rows="3" placeholder="Optional game notes...">${game?.notes || ''}</textarea>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button type="submit" class="btn btn-primary">
            ${isEdit ? 'Save Changes' : 'Create Game'}
          </button>
          <button type="button" id="cancel-game-btn" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;
}
