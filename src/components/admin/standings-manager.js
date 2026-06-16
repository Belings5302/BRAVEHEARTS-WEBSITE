// Standings & Tournament Manager (Admin)

const CENTRAL_ZONE_LEAGUE = 'CENTRAL ZONE BASKETBALL LEAGUE';
const TEAM_CATEGORIES = ['men', 'boys', 'ladies', 'girls'];
const STANDINGS_SEASONS = Array.from({ length: 11 }, (_, index) => {
  const startYear = 2015 + index;
  return `${startYear}/${startYear + 1}`;
}).reverse();

export function renderStandingsManager(standings = [], editingStanding = null, isSuperAdmin = false, selectedCategory = 'men', selectedSeason = '2025/2026') {
  const activeCategory = selectedCategory || 'men';
  const activeSeason = selectedSeason || '2025/2026';
  const editingInScope = editingStanding &&
    String(editingStanding.team_category || '').toLowerCase() === activeCategory &&
    String(editingStanding.season || '2025/2026') === activeSeason;
  const isLeagueStanding = editingInScope ? editingStanding.tournament === CENTRAL_ZONE_LEAGUE : true;
  const visibleStandings = standings;
  const standingsHTML = visibleStandings.length === 0
    ? `<tr><td colspan="10" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No ${activeCategory} standings records found for ${activeSeason}. Add records below.</td></tr>`
    : visibleStandings.map(s => `
      <tr data-standing-id="${s.id}">
        <td style="padding: 12px; font-weight: 600;">${s.team_name}</td>
        <td style="padding: 12px; text-align: center;">${s.played}</td>
        <td style="padding: 12px; text-align: center; color: var(--color-accent); font-weight: 700;">${s.won}</td>
        <td style="padding: 12px; text-align: center; color: #ef4444;">${s.lost}</td>
        <td style="padding: 12px; text-align: center;">${s.forfeit || 0}</td>
        <td style="padding: 12px; text-align: center;">${s.points_for || 0}</td>
        <td style="padding: 12px; text-align: center;">${s.points_against || 0}</td>
        <td style="padding: 12px; text-align: center;">${s.point_difference || 0}</td>
        <td style="padding: 12px; text-align: center; font-weight: 800; font-size: 1.1rem; color: var(--color-text-primary);">${s.points}</td>
        <td style="padding: 12px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm edit-standing-btn" data-id="${s.id}">Edit</button>
          <button class="btn btn-primary btn-sm delete-standing-btn" data-id="${s.id}" ${isSuperAdmin ? '' : 'disabled style="opacity: 0.5;"'} title="${isSuperAdmin ? 'Delete' : 'Super Admin Only'}">Delete</button>
        </td>
      </tr>
    `).join('');

  const formTitle = editingInScope ? 'Update Standing' : 'Create New Standing';

  return `
    <div class="standings-manager-container admin-manager-page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 12px;">
        <h2 style="font-family: var(--font-headings); font-size: 2rem; color: var(--color-text-primary); margin:0;">Tournament Standings Manager</h2>
        <span style="font-size: 0.85rem; color: var(--color-text-primary); background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 4px;">Role: ${isSuperAdmin ? 'Super Admin' : 'Editor (Restricted)'}</span>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; align-items:center;">
        ${TEAM_CATEGORIES.map(cat => `<button type="button" class="filter-btn admin-standing-category-btn ${activeCategory === cat ? 'active' : ''}" data-category="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>`).join('')}
        <select id="admin-standing-season-filter" class="login-input" style="max-width: 180px;">
          ${STANDINGS_SEASONS.map(season => `<option value="${season}" ${activeSeason === season ? 'selected' : ''}>${season}</option>`).join('')}
        </select>
        <a class="btn btn-secondary btn-sm admin-file-action-btn template-csv-btn" href="/templates/standings-template.csv" download><i data-lucide="file-text"></i> CSV Template</a>
        <a class="btn btn-secondary btn-sm admin-file-action-btn template-xlsx-btn" href="/templates/standings-template.xlsx" download><i data-lucide="file-spreadsheet"></i> XLSX Template</a>
        <input id="standings-import-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none;" />
        <button type="button" id="standings-import-btn" class="btn btn-primary btn-sm admin-file-action-btn import-sheet-btn"><i data-lucide="upload"></i> Import CSV/XLSX</button>
        <button type="button" id="clear-standings-table-btn" class="btn btn-secondary btn-sm admin-file-action-btn clear-table-btn" ${isSuperAdmin ? '' : 'disabled title="Super Admin Only"'}><i data-lucide="trash-2"></i> Clear Current Table</button>
      </div>

      <div class="standings-admin-grid">
        <div class="login-card glass standings-form-card">
        <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: var(--color-text-primary); margin-bottom: 20px;">${formTitle} - ${activeCategory.toUpperCase()} (${activeSeason})</h3>
        <form id="standing-entry-form">
          <input type="hidden" id="standing-category" value="${activeCategory}" />
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div>
              <label class="login-label" for="standing-competition-type" style="margin-bottom: 6px;">Competition Type</label>
              <select id="standing-competition-type" class="login-input" required style="width:100%; background: var(--bg-card); color: var(--color-text-primary); border: 1px solid var(--border-glass);">
                <option value="league" ${isLeagueStanding ? 'selected' : ''}>League</option>
                <option value="tournament" ${!isLeagueStanding ? 'selected' : ''}>Tournament</option>
              </select>
            </div>
            <div id="standing-league-name-wrap" style="display: ${isLeagueStanding ? 'block' : 'none'};">
              <label class="login-label" style="margin-bottom: 6px;">League Name</label>
              <input class="login-input" type="text" value="${CENTRAL_ZONE_LEAGUE}" readonly style="width: 100%; opacity: 0.75;" />
            </div>
            <div id="standing-tournament-wrap" style="display: ${isLeagueStanding ? 'none' : 'block'};">
              <label class="login-label" for="standing-tournament" style="margin-bottom: 6px;">Tournament Name</label>
              <input class="login-input" type="text" id="standing-tournament" placeholder="e.g. FIBA Africa Champions Clubs ROAD TO B.A.L" value="${editingInScope && !isLeagueStanding ? editingStanding.tournament : ''}" style="width: 100%;" />
            </div>

            <div>
              <label class="login-label" for="standing-team" style="margin-bottom: 6px;">Team Name</label>
              <input class="login-input" type="text" id="standing-team" placeholder="e.g. BH MEN" value="${editingInScope ? editingStanding.team_name : ''}" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="standing-played" style="margin-bottom: 6px;">GP</label>
              <input class="login-input" type="number" id="standing-played" min="0" value="${editingInScope ? editingStanding.played : '0'}" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="standing-won" style="margin-bottom: 6px;">Won</label>
              <input class="login-input" type="number" id="standing-won" min="0" value="${editingInScope ? editingStanding.won : '0'}" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="standing-lost" style="margin-bottom: 6px;">Lost</label>
              <input class="login-input" type="number" id="standing-lost" min="0" value="${editingInScope ? editingStanding.lost : '0'}" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="standing-forfeit" style="margin-bottom: 6px;">Forfeit</label>
              <input class="login-input" type="number" id="standing-forfeit" min="0" value="${editingInScope ? (editingStanding.forfeit || 0) : '0'}" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="standing-points-for" style="margin-bottom: 6px;">PF</label>
              <input class="login-input" type="number" id="standing-points-for" min="0" value="${editingInScope ? (editingStanding.points_for || 0) : '0'}" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="standing-points-against" style="margin-bottom: 6px;">PA</label>
              <input class="login-input" type="number" id="standing-points-against" min="0" value="${editingInScope ? (editingStanding.points_against || 0) : '0'}" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="standing-diff" style="margin-bottom: 6px;">DIFF</label>
              <input class="login-input" type="number" id="standing-diff" value="${editingInScope ? (editingStanding.point_difference || 0) : '0'}" readonly style="width: 100%; opacity: 0.75;" />
            </div>
            <div>
              <label class="login-label" for="standing-points" style="margin-bottom: 6px;">Pts (auto)</label>
              <input class="login-input" type="number" id="standing-points" min="0" value="${editingInScope ? editingStanding.points : '0'}" readonly style="width: 100%; opacity: 0.75;" />
            </div>
            <div style="display: flex; align-items: flex-end;">
              <button class="btn btn-primary" type="submit" style="width: 100%; height: 44px;">${editingInScope ? 'Update Standing' : 'Create Standing'}</button>
            </div>
          </div>
          ${editingInScope ? `<button class="btn btn-secondary" type="button" id="cancel-standing-edit" style="width: 100%;">Cancel Editing</button>` : ''}
        </form>
      </div>

        <div class="login-card glass standings-table-card" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; margin: 0 !important; width: 100% !important; max-width: none !important; min-width: 0;">
        <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: var(--color-text-primary); margin-bottom: 20px; border-left: 4px solid var(--color-accent); padding-left: 12px;">Current ${activeCategory.toUpperCase()} Records - ${activeSeason}</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted);">
                <th style="padding: 12px;">Team</th>
                <th style="padding: 12px; text-align: center; color: var(--color-text-secondary);">GP</th>
                <th style="padding: 12px; text-align: center; color: var(--color-text-secondary);">W</th>
                <th style="padding: 12px; text-align: center; color: var(--color-text-secondary);">L</th>
                <th style="padding: 12px; text-align: center; color: var(--color-text-secondary);">FF</th>
                <th style="padding: 12px; text-align: center; color: var(--color-text-secondary);">PF</th>
                <th style="padding: 12px; text-align: center; color: var(--color-text-secondary);">PA</th>
                <th style="padding: 12px; text-align: center; color: var(--color-text-secondary);">DIFF</th>
                <th style="padding: 12px; text-align: center; color: var(--color-text-secondary);">Pts</th>
                <th style="padding: 12px; text-align: right; color: var(--color-text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${standingsHTML}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  `;
}
