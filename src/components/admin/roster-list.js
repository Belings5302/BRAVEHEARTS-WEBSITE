// Admin Team Rosters Management Component

const bhMenImageMap = {
  'kirk smith jr': 'smith.jpg',
  'kirk smith': 'smith.jpg',
  'faad billy': 'faad billy.jpg',
  'ian owen limbe': 'ian limbe.jpg',
  'ian limbe': 'ian limbe.jpg',
  'kelvin masiyano': 'kelvin masiyano.jpg',
  'madalitso kadiwa': 'madalitso kadiwa.jpg',
  'patrick chirwa': 'patrick chirwa.jpg',
  'tinotenda nhira': 'tinotenda.jpg',
  'vincent masiyano': 'vincent masiyano.jpg',
  'dylan ngompe lele': 'bravehearts_player_11.jpg',
  'maxwell ngonga': 'bravehearts_player_5.jpg'
};

const bhMenAvailableImages = new Set([
  'smith.jpg',
  'faad billy.jpg',
  'ian limbe.jpg',
  'kelvin masiyano.jpg',
  'madalitso kadiwa.jpg',
  'patrick chirwa.jpg',
  'tinotenda.jpg',
  'vincent masiyano.jpg',
  'bravehearts_player_11.jpg',
  'bravehearts_player_5.jpg',
  'bravehearts_player_9.jpg'
]);

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');
}

function getPlayerImageUrl(player) {
  if (!player) return '';
  if (player.image_url) return player.image_url;
  if (player.imageUrl) return player.imageUrl;

  if (player.team !== 'men') return '';

  const mappedFile = bhMenImageMap[normalizeName(player.name)];
  if (mappedFile) {
    return encodeURI(`./src/assets/bh men/${mappedFile}`);
  }

  if (!player.number) return '';
  const numberFile = `bravehearts_player_${player.number}.jpg`;
  if (bhMenAvailableImages.has(numberFile)) {
    return encodeURI(`./src/assets/bh men/${numberFile}`);
  }

  return '';
}

function renderPlayerPhoto(player) {
  const imageUrl = getPlayerImageUrl(player);
  if (imageUrl) {
    return `<img src="${imageUrl}" alt="${player.name}" style="width: 100%; height: 100%; object-fit: cover;" />`;
  }

  return `<i data-lucide="user" style="width: 20px; height: 20px; color: var(--color-text-muted);"></i>`;
}

export function renderRosterList(players = [], currentFilter = 'all', isSuperAdmin = false) {
  const men = players.filter(p => p.team === 'men').length;
  const ladies = players.filter(p => p.team === 'ladies').length;
  const boys = players.filter(p => p.team === 'boys').length;
  const girls = players.filter(p => p.team === 'girls').length;

  const filteredPlayers = currentFilter === 'all'
    ? players
    : players.filter(p => p.team === currentFilter);

  return `
    <div class="admin-roster">
      <div class="section-header" style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 class="section-title">Team Rosters</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">Manage players across all Bravehearts squads</p>
        </div>
        <button id="add-player-btn" class="btn btn-primary">
          <i data-lucide="user-plus" style="width: 18px; height: 18px; margin-right: 6px; display: inline;"></i> Add Player
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-bar" style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="filter-btn ${currentFilter === 'all' ? 'filter-btn-active' : ''}" data-filter="all">All (${players.length})</button>
        <button class="filter-btn ${currentFilter === 'men' ? 'filter-btn-active' : ''}" data-filter="men">BH Men (${men})</button>
        <button class="filter-btn ${currentFilter === 'ladies' ? 'filter-btn-active' : ''}" data-filter="ladies">BH Ladies (${ladies})</button>
        <button class="filter-btn ${currentFilter === 'boys' ? 'filter-btn-active' : ''}" data-filter="boys">BH Boys (${boys})</button>
        <button class="filter-btn ${currentFilter === 'girls' ? 'filter-btn-active' : ''}" data-filter="girls">BH Girls (${girls})</button>
      </div>

      <!-- Players Grid -->
      <div class="admin-roster-grid-wrap">
        ${filteredPlayers.length > 0 ? `
          <div class="admin-roster-grid">
            ${filteredPlayers.map(player => `
              <article class="admin-player-card" data-player-id="${player.id}">
                <div class="admin-player-photo">
                  ${renderPlayerPhoto(player)}
                </div>
                <div class="admin-player-info">
                  <div class="admin-player-topline">
                    <strong class="admin-player-name">${player.name}</strong>
                    <span class="admin-player-number">#${player.number}</span>
                  </div>
                  <div class="admin-player-meta">
                    <span>${player.position || '—'}</span>
                    <span>${player.height || '—'}</span>
                    <span>${player.age || '—'} yrs</span>
                  </div>
                  <div class="admin-player-bottomline">
                    <span class="admin-player-team">${player.team.toUpperCase()}</span>
                    ${player.nationality ? `<span class="admin-player-nationality">${player.nationality}</span>` : ''}
                  </div>
                </div>
                <div class="admin-player-actions">
                  <button class="btn btn-outline edit-player-btn" data-id="${player.id}">Edit</button>
                  <button class="btn btn-outline delete-player-btn" data-id="${player.id}" ${isSuperAdmin ? '' : 'disabled'} title="${isSuperAdmin ? 'Delete' : 'Super Admin Only'}">Delete</button>
                </div>
              </article>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 40px; color: var(--color-text-muted);">
            No players found for this category.
          </div>
        `}
      </div>
    </div>
  `;
}

export function renderPlayerForm(player = null) {
  const isEditing = !!player;
  return `
    <div class="modal-backdrop" id="player-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="modal-content glass" style="max-width: 600px; width: 100%; border: 1px solid var(--border-glass); border-radius: 16px; padding: 24px; max-height: 90vh; overflow-y: auto; text-align: left;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-glass); padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-family: var(--font-headings); font-size: 1.5rem; color: #fff;">${isEditing ? 'Edit Player' : 'Add New Player'}</h2>
          <button class="modal-close" id="close-player-modal" style="background: none; border: none; color: #fff; cursor: pointer;"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <form id="player-form" style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label class="login-label" style="display: block; margin-bottom: 6px;">Full Name *</label>
                <input type="text" id="player-name" value="${player?.name || ''}" class="login-input" required style="width: 100%;">
              </div>
              <div>
                <label class="login-label" style="display: block; margin-bottom: 6px;">Jersey Number *</label>
                <input type="text" id="player-number" value="${player?.number || ''}" class="login-input" required style="width: 100%;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label class="login-label" style="display: block; margin-bottom: 6px;">Team *</label>
                <select id="player-team" class="login-input" required style="width: 100%; background: var(--bg-obsidian-light); color: white; border: 1px solid var(--border-glass);">
                  <option value="men" ${player?.team === 'men' ? 'selected' : ''}>BH Men</option>
                  <option value="ladies" ${player?.team === 'ladies' ? 'selected' : ''}>BH Ladies</option>
                  <option value="boys" ${player?.team === 'boys' ? 'selected' : ''}>BH Boys (U18)</option>
                  <option value="girls" ${player?.team === 'girls' ? 'selected' : ''}>BH Girls (U18)</option>
                </select>
              </div>
              <div>
                <label class="login-label" style="display: block; margin-bottom: 6px;">Position *</label>
                <select id="player-position" class="login-input" required style="width: 100%; background: var(--bg-obsidian-light); color: white; border: 1px solid var(--border-glass);">
                  <option value="Guard" ${player?.position === 'Guard' ? 'selected' : ''}>Guard</option>
                  <option value="Forward" ${player?.position === 'Forward' ? 'selected' : ''}>Forward</option>
                  <option value="Center" ${player?.position === 'Center' ? 'selected' : ''}>Center</option>
                  <option value="Swingman" ${player?.position === 'Swingman' ? 'selected' : ''}>Swingman</option>
                  <option value="Forward/Center" ${player?.position === 'Forward/Center' ? 'selected' : ''}>Forward/Center</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label class="login-label" style="display: block; margin-bottom: 6px;">Nationality</label>
                <input type="text" id="player-nationality" value="${player?.nationality || 'Malawi'}" class="login-input" style="width: 100%;">
              </div>
              <div>
                <label class="login-label" style="display: block; margin-bottom: 6px;">Age</label>
                <input type="number" id="player-age" value="${player?.age || ''}" class="login-input" style="width: 100%;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label class="login-label" style="display: block; margin-bottom: 6px;">Height (e.g. 6'2")</label>
                <input type="text" id="player-height" value="${player?.height || ''}" class="login-input" style="width: 100%;">
              </div>
              <div>
                <label class="login-label" style="display: block; margin-bottom: 6px;">Est. Points Per Game</label>
                <input type="number" step="0.1" id="player-ppg" value="${player?.points_per_game || '0'}" class="login-input" style="width: 100%;">
              </div>
            </div>

            <!-- Player Image URL and upload -->
            <div>
              <label class="login-label" style="display: block; margin-bottom: 6px;">Player Photo URL</label>
              <div style="display: flex; gap: 10px;">
                <input type="text" id="player-image-url" value="${player?.image_url || ''}" class="login-input" style="flex-grow: 1;" placeholder="e.g. /uploads/player.jpg">
                <div style="position: relative;">
                  <button type="button" class="btn btn-secondary" id="upload-player-photo-btn" style="height: 44px;">Upload</button>
                  <input type="file" id="player-photo-file" accept="image/*" style="display: none;" />
                </div>
              </div>
            </div>

            <!-- Player Bio -->
            <div>
              <label class="login-label" style="display: block; margin-bottom: 6px;">Bio</label>
              <textarea id="player-bio" class="login-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Player brief biography...">${player?.bio || ''}</textarea>
            </div>

            <!-- Player Highlights -->
            <div>
              <label class="login-label" style="display: block; margin-bottom: 6px;">Career Highlights</label>
              <textarea id="player-highlights" class="login-input" style="width: 100%; min-height: 60px; resize: vertical;" placeholder="Highlights (e.g. 2x CZBL MVP)...">${player?.career_highlights || ''}</textarea>
            </div>

            <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn btn-outline" id="cancel-player-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEditing ? 'Save Changes' : 'Add Player'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}
