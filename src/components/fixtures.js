// Fixtures & Standings Component

function formatDate(dateStr) {
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

const BRAVEHEARTS_LOGO = './src/assets/logo1.png';

function getBraveheartsTeamName(team) {
  const normalized = String(team || 'men').toLowerCase();
  if (normalized === 'boys') return 'Bravehearts Boys';
  if (normalized === 'girls') return 'Bravehearts Girls';
  if (normalized === 'ladies' || normalized === 'women') return 'Bravehearts Ladies';
  return 'Bravehearts Men';
}

function getInitials(name) {
  return String(name || 'OP')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'OP';
}

function renderTeamLogo(isBravehearts, altText, logoUrl = '') {
  if (isBravehearts) {
    return `<img src="${BRAVEHEARTS_LOGO}" alt="${altText} logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;">`;
  }
  if (logoUrl) {
    return `<img src="${logoUrl}" alt="${altText} logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;">`;
  }
  return getInitials(altText);
}

export function renderFixtures(gamesList = [], standingsList = [], activeSubTab = 'schedule', searchTerm = '', resultFilters = {}, scheduleStatusFilter = 'all') {
  const games = gamesList;

  const normalizedGames = games.map(game => {
    return {
      id: game.id,
      tournament: game.tournament,
      opponent: game.opponent,
      opponentOrigin: game.opponent_origin ?? game.opponentOrigin,
      ourScore: game.our_score ?? game.ourScore,
      opponentScore: game.opponent_score ?? game.opponentScore,
      isHome: game.is_home !== undefined ? (game.is_home === 1 || game.is_home === true) : game.isHome,
      status: game.status,
      outcome: game.outcome,
      date: game.game_date ? formatDate(game.game_date) : game.date,
      time: game.game_time ? `${game.game_time} CAT` : game.time,
      team: game.team || 'men',
      braveheartsTeamName: getBraveheartsTeamName(game.team),
      opponentLogoUrl: game.opponent_logo_url ?? game.opponentLogoUrl
    };
  });

  const resultTeamFilter = resultFilters.team || 'all';
  const resultCompetitionFilter = resultFilters.competition || 'all';

  const getCompetitionType = (tournamentName = '') => {
    const tournament = String(tournamentName || '').toLowerCase();
    const isCzbl = tournament.includes('czbl') || tournament.includes('central zone');
    const isFriendly = tournament.includes('friendly') || tournament.includes('friendlies');
    const isFiba = !isCzbl && (tournament.includes('fiba') || tournament.includes('road to bal') || tournament.includes('basketball africa league'));

    if (isFiba) return 'fiba';
    if (isCzbl) return 'czbl';
    if (isFriendly) return 'friendlies';
    return 'other';
  };

  const pastGames = normalizedGames
    .filter(f => ['result', 'completed', 'final'].includes(String(f.status || '').toLowerCase()))
    .filter(f => resultTeamFilter === 'all' || String(f.team || 'men').toLowerCase() === resultTeamFilter)
    .filter(f => resultCompetitionFilter === 'all' || getCompetitionType(f.tournament) === resultCompetitionFilter);
  const upcomingGames = normalizedGames
    .filter(f => ['upcoming', 'live'].includes(String(f.status || '').toLowerCase()))
    .filter(f => scheduleStatusFilter === 'all' || String(f.status || '').toLowerCase() === scheduleStatusFilter);
  
  
  const groupedResults = pastGames.reduce((groups, game) => {
    const tournament = game.tournament || 'Other Results';
    if (!groups[tournament]) groups[tournament] = [];
    groups[tournament].push(game);
    return groups;
  }, {});

  const pastHTML = Object.entries(groupedResults).map(([tournamentName, tournamentGames]) => {
    const cards = tournamentGames.map(game => {
      const isWin = game.outcome === 'win';
      const isDraw = game.outcome === 'draw';
      const resultClass = isDraw ? 'draw' : isWin ? 'win' : 'loss';
      const braveheartsScore = game.ourScore ?? '—';
      const opponentScore = game.opponentScore ?? '—';

      return `
        <article class="epl-card-container result-${resultClass}">
          <div class="epl-card">
            <div class="epl-half bh-side">
              <div class="epl-logo">
                ${renderTeamLogo(true, game.braveheartsTeamName)}
              </div>
              <div class="epl-name">${game.braveheartsTeamName}</div>
            </div>

            <div class="epl-half opp-side">
              <div class="epl-logo">
                ${renderTeamLogo(false, game.opponent, game.opponentLogoUrl)}
              </div>
              <div class="epl-name">${game.opponent}</div>
            </div>

            <div class="epl-center-pill">
              <div class="epl-score">${braveheartsScore} - ${opponentScore}</div>
              <div class="epl-status">FINAL</div>
              <div class="epl-date">${game.date}</div>
            </div>
            
            ${game.id ? `
            <a class="epl-boxscore-link" href="#/game/${game.id}">
              <span>Box Score</span>
              <i data-lucide="arrow-right" style="width: 12px; height: 12px; margin-left: 4px;"></i>
            </a>` : ''}
          </div>
        </article>
      `;
    }).join('');

    return `
      <section class="results-tournament-group" style="margin-bottom: 40px;">
        <h3 class="results-tournament-title" style="margin-bottom: 20px; font-family: var(--font-headings); font-size: 1.5rem; border-left: 4px solid var(--color-accent); padding-left: 12px;">${tournamentName}</h3>
        <div class="epl-grid">
          ${cards}
        </div>
      </section>
    `;
  }).join('');

  const upcomingHTML = upcomingGames.map(game => {
    const isLive = game.status === 'live';
    const link = game.id ? `href="#/game/${game.id}"` : '';
    
    return `
      <a ${link} class="epl-card-link" data-game-status="${isLive ? 'live' : 'upcoming'}">
        <div class="epl-card ${isLive ? 'live' : ''}">
          <div class="epl-half ${game.isHome ? 'bh-side' : 'opp-side'}">
            <div class="epl-logo">
              ${renderTeamLogo(game.isHome, game.isHome ? game.braveheartsTeamName : game.opponent, game.opponentLogoUrl)}
            </div>
            <div class="epl-name">${game.isHome ? game.braveheartsTeamName : game.opponent}</div>
          </div>
          
          <div class="epl-half ${!game.isHome ? 'bh-side' : 'opp-side'}">
            <div class="epl-logo">
              ${renderTeamLogo(!game.isHome, !game.isHome ? game.braveheartsTeamName : game.opponent, game.opponentLogoUrl)}
            </div>
            <div class="epl-name">${!game.isHome ? game.braveheartsTeamName : game.opponent}</div>
          </div>

          <div class="epl-time-tag ${isLive ? 'live' : ''}">
            ${isLive ? `
              <span class="epl-score">${game.ourScore || 0} - ${game.opponentScore || 0}</span>
              <span class="epl-status">LIVE</span>
            ` : `
              <span class="epl-time">${game.time || 'TBD'}</span>
              <span class="epl-date">${game.date}</span>
            `}
          </div>
          
          <div class="epl-tournament-tag">${game.tournament}</div>
        </div>
      </a>
    `;
  }).join('');

  // Standings rendering logic
  let standingsHTML = '';
  if (activeSubTab === 'standings') {
    if (standingsList.length === 0) {
      standingsHTML = `
        <div style="text-align: center; padding: 60px; color: var(--color-text-muted);">
          <i data-lucide="award" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px; display: block; margin: 0 auto 16px;"></i>
          <p>No standings data available yet.</p>
        </div>
      `;
    } else {
      const tournaments = {};
      standingsList.forEach(s => {
        if (!tournaments[s.tournament]) tournaments[s.tournament] = [];
        tournaments[s.tournament].push(s);
      });

      standingsHTML = Object.entries(tournaments).map(([tournamentName, teams]) => {
        const sortedTeams = [...teams].sort((a, b) => b.points - a.points || b.won - a.won);
        
        const rowsHTML = sortedTeams.map((team, idx) => {
          const isBravehearts = team.team_name.toLowerCase().includes('bravehearts');
          return `
            <tr class="standings-row ${isBravehearts ? 'highlight' : ''}" style="${isBravehearts ? 'background: rgba(212, 32, 39, 0.1); font-weight: 700;' : ''}">
              <td style="padding: 12px; text-align: center; font-weight: 700; width: 50px;">${idx + 1}</td>
              <td class="standings-team-name-cell" style="padding: 12px; font-weight: 600;">${team.team_name}</td>
              <td style="padding: 12px; text-align: center;">${team.played}</td>
              <td style="padding: 12px; text-align: center; color: var(--color-accent); font-weight: 700;">${team.won}</td>
              <td style="padding: 12px; text-align: center; color: #ef4444;">${team.lost}</td>
              <td style="padding: 12px; text-align: center;">${team.forfeit || 0}</td>
              <td style="padding: 12px; text-align: center; font-weight: 800; font-size: 1.1rem; color: #fff;">${team.points}</td>
            </tr>
          `;
        }).join('');

        return `
          <div class="standings-table-container glass" style="margin-bottom: 40px; padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass);">
            <h3 class="tournament-title">${tournamentName}</h3>
            <div style="overflow-x: auto;">
              <table class="standings-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">
                    <th style="padding: 12px; text-align: center;">Pos</th>
                    <th class="standings-team-name-cell" style="padding: 12px;">Team</th>
                    <th style="padding: 12px; text-align: center;">GP</th>
                    <th style="padding: 12px; text-align: center;">W</th>
                    <th style="padding: 12px; text-align: center;">L</th>
                    <th style="padding: 12px; text-align: center;">FF</th>
                    <th style="padding: 12px; text-align: center;">Pts</th>
                  </tr>
                </thead>
                <tbody style="font-size: 0.95rem; color: var(--color-text-secondary);">
                  ${rowsHTML}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Team selector markup (public teams)
  const teamSelectorHTML = `
    <div id="team-selector" style="display:flex; gap:8px; justify-content:center; margin-bottom:20px;">
      <button class="team-filter-btn filter-btn" data-team="men">Men</button>
      <button class="team-filter-btn filter-btn" data-team="boys">Boys</button>
      <button class="team-filter-btn filter-btn" data-team="ladies">Ladies</button>
      <button class="team-filter-btn filter-btn" data-team="girls">Girls</button>
    </div>
    <div id="standings-results">
      <div style="text-align: center; padding: 40px; color: var(--color-text-muted);">Select a team to view standings.</div>
    </div>
  `;

  return `
    <section class="fixtures-sec" id="fixtures">
      <div class="section-container">
        <div class="section-header" style="margin-bottom: 30px;">
          <span class="section-tagline">${activeSubTab === 'results' ? 'Match Archive' : activeSubTab === 'standings' ? 'League Tables' : 'Campaign Schedule'}</span>
          <h2 class="section-title text-gradient">${activeSubTab === 'results' ? 'Results' : activeSubTab === 'standings' ? 'Standings' : 'Game Schedule'}</h2>
          <p class="section-desc">
            ${activeSubTab === 'results' ? 'Review completed games, scores, and player box scores.' : activeSubTab === 'standings' ? 'Explore Central Zone Basketball League standings by team and season.' : 'Keep track of upcoming Bravehearts fixtures across our teams.'}
          </p>
        </div>

        <div style="max-width: 620px; margin: 0 auto 28px;">
          <label for="games-search-input" style="display: block; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 8px; font-weight: 600;">Search games</label>
          <input id="games-search-input" type="search" value="${searchTerm}" placeholder="Search opponent, tournament, venue, team, status..." class="login-input" style="width: 100%;">
        </div>


        <!-- Contents -->
        ${activeSubTab === 'schedule' ? `
          <div style="max-width: 900px; margin: 0 auto;">
            <div class="schedule-filter-bar">
              <button class="filter-btn schedule-type-filter ${scheduleStatusFilter === 'all' ? 'active' : ''}" data-schedule-status="all">All Games</button>
              <button class="filter-btn schedule-type-filter ${scheduleStatusFilter === 'live' ? 'active' : ''}" data-schedule-status="live">
                <span class="live-dot"></span> Live
              </button>
              <button class="filter-btn schedule-type-filter ${scheduleStatusFilter === 'upcoming' ? 'active' : ''}" data-schedule-status="upcoming">Upcoming</button>
            </div>

            <div id="schedule-games-container">
              <div class="fixtures-grid">
                ${upcomingHTML || `<div style="text-align: center; padding: 40px; color: var(--color-text-muted);">No upcoming games scheduled.</div>`}
              </div>
            </div>
          </div>
        ` : activeSubTab === 'results' ? `
          <div style="display: grid; grid-template-columns: 1fr; gap: 28px; max-width: 980px; margin: 0 auto;">
            <div class="results-filter-panel glass">
              <div class="results-filter-group">
                <span class="results-filter-label">Teams</span>
                <button class="filter-btn results-team-filter ${resultTeamFilter === 'all' ? 'active' : ''}" data-results-team="all">All Teams</button>
                <button class="filter-btn results-team-filter ${resultTeamFilter === 'men' ? 'active' : ''}" data-results-team="men">Men</button>
                <button class="filter-btn results-team-filter ${resultTeamFilter === 'ladies' ? 'active' : ''}" data-results-team="ladies">Ladies</button>
                <button class="filter-btn results-team-filter ${resultTeamFilter === 'boys' ? 'active' : ''}" data-results-team="boys">Boys</button>
                <button class="filter-btn results-team-filter ${resultTeamFilter === 'girls' ? 'active' : ''}" data-results-team="girls">Girls</button>
              </div>
              <div class="results-filter-group">
                <span class="results-filter-label">Competitions</span>
                <button class="filter-btn results-competition-filter ${resultCompetitionFilter === 'all' ? 'active' : ''}" data-results-competition="all">All Competitions</button>
                <button class="filter-btn results-competition-filter ${resultCompetitionFilter === 'fiba' ? 'active' : ''}" data-results-competition="fiba">FIBA</button>
                <button class="filter-btn results-competition-filter ${resultCompetitionFilter === 'czbl' ? 'active' : ''}" data-results-competition="czbl">CZBL</button>
                <button class="filter-btn results-competition-filter ${resultCompetitionFilter === 'friendlies' ? 'active' : ''}" data-results-competition="friendlies">Friendlies</button>
              </div>
            </div>
            <div>
              <div class="fixtures-grid">
                ${pastHTML || `<div style="text-align: center; padding: 40px; color: var(--color-text-muted);">No match results found for these filters.</div>`}
              </div>
            </div>
          </div>
        ` : `
          <div style="max-width: 900px; margin: 0 auto;">
              ${teamSelectorHTML}
            </div>
        `}
      </div>
    </section>
  `;
}

// Function to start the ticking countdown
export function initCountdown() {
  const targetDate = new Date("2026-06-12T18:00:00+02:00").getTime();
  
  const updateTimer = () => {
    const now = new Date().getTime();
    const difference = targetDate - now;
    
    const dEl = document.getElementById("countdown-days");
    const hEl = document.getElementById("countdown-hours");
    const mEl = document.getElementById("countdown-mins");
    const sEl = document.getElementById("countdown-secs");
    
    if (!dEl || !hEl || !mEl || !sEl) return;
    
    if (difference <= 0) {
      dEl.textContent = "00";
      hEl.textContent = "00";
      mEl.textContent = "00";
      sEl.textContent = "00";
      return;
    }
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    dEl.textContent = String(days).padStart(2, '0');
    hEl.textContent = String(hours).padStart(2, '0');
    mEl.textContent = String(minutes).padStart(2, '0');
    sEl.textContent = String(seconds).padStart(2, '0');
  };
  
  updateTimer();
  setInterval(updateTimer, 1000);
}

// Helper: render standings table for a single tournament
export function renderStandingsForTournament(tournamentName, standingsList = [], highlightCategory = '', selectedSeason = '') {
  const filtered = (standingsList || []).filter(s => s.tournament === tournamentName);
  if (!filtered.length) return `<div style="text-align:center; padding:40px; color:var(--color-text-muted);">No standings found for ${tournamentName}.</div>`;

  const sorted = filtered.slice().sort((a,b) => b.points - a.points || b.won - a.won);
  const rows = sorted.map((team, idx) => {
    const isBravehearts = team.team_name.toLowerCase().includes('bravehearts');
    const highlight = highlightCategory && (team.team_category || team.team_name.toLowerCase()).toLowerCase().includes(highlightCategory.toLowerCase());
    return `
      <tr class="standings-row ${highlight ? 'highlight' : ''}" style="${highlight ? 'background: rgba(212, 32, 39, 0.1); font-weight: 700;' : ''}">
        <td style="padding: 12px; text-align: center; font-weight: 700; width: 50px;">${idx+1}</td>
        <td class="standings-team-name-cell" style="padding: 12px; font-weight: 600;">${team.team_name}</td>
        <td style="padding: 12px; text-align: center;">${team.played}</td>
              <td style="padding: 12px; text-align: center; color: var(--color-accent); font-weight: 700;">${team.won}</td>
              <td style="padding: 12px; text-align: center; color: #ef4444;">${team.lost}</td>
              <td style="padding: 12px; text-align: center;">${team.forfeit || 0}</td>
              <td style="padding: 12px; text-align: center; font-weight: 800; font-size: 1.1rem; color: #fff;">${team.points}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="standings-table-container glass" style="margin-bottom: 40px; padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass);">
      <h3 class="tournament-title">${selectedSeason ? `${selectedSeason} ` : ''}${tournamentName}</h3>
      <div style="overflow-x: auto;">
        <table class="standings-table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">
              <th style="padding: 12px; text-align: center;">Pos</th>
              <th class="standings-team-name-cell" style="padding: 12px;">Team</th>
              <th style="padding: 12px; text-align: center;">GP</th>
                    <th style="padding: 12px; text-align: center;">W</th>
                    <th style="padding: 12px; text-align: center;">L</th>
                    <th style="padding: 12px; text-align: center;">FF</th>
                    <th style="padding: 12px; text-align: center;">Pts</th>
            </tr>
          </thead>
          <tbody style="font-size: 0.95rem; color: var(--color-text-secondary);">
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
