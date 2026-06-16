const teamTabs = {
  men: {
    title: "BH MEN",
    label: "Men's Senior Team",
    description: "The Bravehearts men's senior squad representing Malawi in national competition and continental qualifiers."
  },
  ladies: {
    title: "BH LADIES",
    label: "Ladies' Senior Team",
    description: "Bravehearts Ladies competing in the national league and international women's tournaments."
  },
  boys: {
    title: "BH BOYS",
    label: "Under-18 Boys Team",
    description: "The next generation of Bravehearts talent building toward senior club success."
  },
  girls: {
    title: "BH GIRLS",
    label: "Under-18 Girls Team",
    description: "Young female athletes developing through Bravehearts youth programs and international camps."
  }
};

const DEFAULT_PLAYER_IMAGE = './src/assets/logo1.png';

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

function preserveLineBreaks(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r?\n/g, '<br>');
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');
}

export function getPlayerImageUrl(player) {
  if (!player) return null;
  if (player.image_url) return player.image_url;
  if (player.imageUrl) return player.imageUrl;

  const team = String(player.team || player.team_category || '').toLowerCase();
  const isBhMen = !team || team === 'men' || team.includes('bh men');
  if (!isBhMen) return null;
  
  const normalizedName = normalizeName(player.name || player.player_name);
  const mappedFile = bhMenImageMap[normalizedName];
  if (mappedFile) {
    return encodeURI(`./src/assets/bh men/${mappedFile}`);
  }

  const playerNumber = player.number ?? player.player_number;
  if (!playerNumber) return null;
  const numberString = String(playerNumber);
  const numberFile = `bravehearts_player_${numberString}.jpg`;
  if (bhMenAvailableImages.has(numberFile)) {
    return encodeURI(`./src/assets/bh men/${numberFile}`);
  }

  return null;
}

function renderPlayerAvatar(player) {
  const imageUrl = getPlayerImageUrl(player);
  if (imageUrl) {
    return `<img class="player-avatar-img" src="${imageUrl}" alt="${player.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" />`;
  }
  return `<img class="player-avatar-img" src="${DEFAULT_PLAYER_IMAGE}" alt="${player.name || 'Bravehearts player'}" loading="lazy" style="width: 100%; height: 100%; object-fit: contain; padding: 8px;" />`;
}

export function renderRoster() {
  return `
    <section class="roster-sec" id="roster">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tagline">Meet the Squad</span>
          <h2 class="section-title text-gradient-green">Bravehearts Rosters</h2>
          <p class="section-desc">
            Click on any team below to explore our elite squads and discover the full player lineups for BH MEN, BH LADIES, BH BOYS, and BH GIRLS.
          </p>
        </div>
        <div class="team-buttons-grid">
          <a class="team-btn glass" href="#/roster/men">
            <div class="team-btn-icon"><i data-lucide="users"></i></div>
            <h3>BH MEN</h3>
            <p>Men's Senior Team</p>
          </a>
          <a class="team-btn glass" href="#/roster/ladies">
            <div class="team-btn-icon"><i data-lucide="users"></i></div>
            <h3>BH LADIES</h3>
            <p>Ladies' Senior Team</p>
          </a>
          <a class="team-btn glass" href="#/roster/boys">
            <div class="team-btn-icon"><i data-lucide="users"></i></div>
            <h3>BH BOYS</h3>
            <p>Under-18 Boys Team</p>
          </a>
          <a class="team-btn glass" href="#/roster/girls">
            <div class="team-btn-icon"><i data-lucide="users"></i></div>
            <h3>BH GIRLS</h3>
            <p>Under-18 Girls Team</p>
          </a>
        </div>
      </div>
    </section>
  `;
}

export function renderTeamPage(teamKey, players = []) {
  const teamInfo = teamTabs[teamKey];
  if (!teamInfo) return `<section class="roster-sec"><div class="section-container"><p>Team not found.</p></div></section>`;

  const namesHTML = players.map(p => `
    <a class="player-tile" href="#/player/${p.id}" data-player-id="${p.id}">
      <div class="player-avatar-large">
        ${renderPlayerAvatar(p)}
      </div>
      <div class="player-tile-content">
        <div class="player-name-number">#${p.number}</div>
        <div class="player-name-label">${p.name}</div>
      </div>
    </a>
  `).join('');

  return `
    <section class="roster-team-page">
      <div class="section-container">
        <div class="section-header">
          <a class="back-link" href="#/roster" style="color: var(--color-accent); text-decoration: none; font-weight: 700;">← Back to Teams</a>
          <h2 class="section-title">${teamInfo.title}</h2>
          <p class="section-desc">${teamInfo.description}</p>
        </div>
        <div class="player-grid">
          ${namesHTML}
        </div>
      </div>
    </section>
  `;
}

export function renderPlayerPage(playerId, players = []) {
  const found = players.find(x => String(x.id) === String(playerId));
  if (!found) return `<section class="roster-sec"><div class="section-container"><p>Player not found.</p></div></section>`;

  const teamKey = found.team || 'men';
  const detailImage = renderPlayerAvatar(found);

  // Generate some realistic dummy averages based on estimate ppg
  const ppg = found.points_per_game || found.pointsPerGame || 0;
  const rebounds = Math.round((ppg * 0.4) * 10) / 10;
  const assists = Math.round((ppg * 0.25) * 10) / 10;
  const steals = Math.round((ppg * 0.08) * 10) / 10;
  const blocks = Math.round((ppg * 0.05) * 10) / 10;

  const bioText = found.bio || `${found.name} is an elite basketball player for Bravehearts Basketball Club. Known for their athletic ability and team play, they are a key contributor to the club's success in league and continental qualifiers.`;
  const highlights = found.career_highlights || "Multiple CZBL Championship appearances, core player in regional Road to BAL qualifiers.";

  return `
    <section class="player-detail-page" style="padding: 40px 0;">
      <div class="section-container">
        <div class="section-header" style="margin-bottom: 30px;">
          <a class="back-link" href="#/roster/${teamKey}" style="color: var(--color-accent); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px; font-weight: 600;">
            <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
            Back to ${teamTabs[teamKey]?.title || teamKey}
          </a>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="font-size: 2.2rem; font-weight: 900; color: var(--color-accent); font-family: var(--font-headings);">#${found.number}</span>
            <h2 class="section-title" style="margin: 0; font-size: 2.5rem;">${found.name}</h2>
          </div>
          <p class="section-desc" style="margin-top: 8px;">${found.position} • ${found.nationality}</p>
        </div>

        <div class="player-profile-grid" style="display: grid; grid-template-columns: 1fr; gap: 30px;">
          <!-- Left: Player Image and Stats Card -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div class="player-detail-card glass" style="display: flex; flex-direction: column; align-items: center; padding: 24px; border-radius: 16px; border: 1px solid var(--border-glass);">
              <div class="player-avatar-large" style="width: 200px; height: 200px; border-radius: 50%; overflow: hidden; border: 4px solid var(--color-accent); margin-bottom: 20px; box-shadow: 0 0 20px rgba(212,32,39,0.3);">
                ${detailImage}
              </div>
              <h3 style="margin: 0 0 8px; font-family: var(--font-headings); font-size: 1.4rem;">${found.name}</h3>
              <span class="news-badge-tag" style="background: rgba(255,255,255,0.06); color: var(--color-text-secondary); border: 1px solid var(--border-glass);">${found.position}</span>
            </div>

            <!-- Season Stats Box -->
            <div class="glass" style="padding: 24px; border-radius: 16px; border: 1px solid var(--border-glass);">
              <h3 style="font-family: var(--font-headings); font-size: 1.25rem; margin-top: 0; margin-bottom: 20px; color: #fff;">Season Averages</h3>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 12px; border-radius: 8px; text-align: center;">
                  <span style="display: block; font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase;">Points</span>
                  <strong style="font-size: 1.5rem; color: var(--color-accent); font-family: var(--font-headings);">${ppg}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 12px; border-radius: 8px; text-align: center;">
                  <span style="display: block; font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase;">Rebounds</span>
                  <strong style="font-size: 1.5rem; color: #fff; font-family: var(--font-headings);">${rebounds}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 12px; border-radius: 8px; text-align: center;">
                  <span style="display: block; font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase;">Assists</span>
                  <strong style="font-size: 1.5rem; color: #fff; font-family: var(--font-headings);">${assists}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 12px; border-radius: 8px; text-align: center;">
                  <span style="display: block; font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase;">Steals</span>
                  <strong style="font-size: 1.5rem; color: #fff; font-family: var(--font-headings);">${steals}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Bio and Highlights -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div class="glass" style="padding: 24px; border-radius: 16px; border: 1px solid var(--border-glass); height: 100%;">
              <h3 style="font-family: var(--font-headings); font-size: 1.4rem; margin-top: 0; margin-bottom: 16px; color: #fff; border-left: 4px solid var(--color-accent); padding-left: 10px;">Player Bio</h3>
              <p style="color: var(--color-text-secondary); line-height: 1.8; font-size: 1.05rem; margin-bottom: 24px; white-space: normal;">
                ${preserveLineBreaks(bioText)}
              </p>

              <h3 style="font-family: var(--font-headings); font-size: 1.4rem; margin-top: 0; margin-bottom: 16px; color: #fff; border-left: 4px solid var(--color-accent); padding-left: 10px;">Career Highlights</h3>
              <p style="color: var(--color-text-secondary); line-height: 1.8; font-size: 1.05rem; margin-bottom: 24px; white-space: normal;">
                ${preserveLineBreaks(highlights)}
              </p>

              <h3 style="font-family: var(--font-headings); font-size: 1.4rem; margin-top: 0; margin-bottom: 16px; color: #fff; border-left: 4px solid var(--color-accent); padding-left: 10px;">Profile Details</h3>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; color: var(--color-text-secondary);">
                <div><strong>Height:</strong> ${found.height || 'N/A'}</div>
                <div><strong>Age:</strong> ${found.age || 'N/A'} yrs</div>
                <div><strong>Nationality:</strong> ${found.nationality || 'N/A'}</div>
                <div><strong>Team:</strong> ${teamTabs[teamKey]?.title || teamKey}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderRosterModal(teamKey, players = []) {
  const teamInfo = teamTabs[teamKey];

  if (!teamInfo) return '';

  const cardsHTML = players.map(player => {
    let flagEmoji = "🇲🇼";
    if (player.nationality.includes("USA")) flagEmoji = "🇺🇸";
    else if (player.nationality.includes("Zambia")) flagEmoji = "🇿🇲";
    else if (player.nationality.includes("Mozambique")) flagEmoji = "🇲🇿";
    else if (player.nationality.includes("Cameroon")) flagEmoji = "🇨🇲";
    else if (player.nationality.includes("Zimbabwe")) flagEmoji = "🇿🇼";
    else if (player.nationality.includes("Sierra Leone")) flagEmoji = "🇸🇱";
    else if (player.nationality.includes("Belize")) flagEmoji = "🇧🇿";

    return `
      <div class="player-card" data-id="${player.id}">
        <div class="player-inner">
          <div class="player-front glass">
            <div class="player-number">#${player.number}</div>
            <div class="player-avatar-placeholder" style="margin-bottom: 16px;">
              ${renderPlayerAvatar(player)}
            </div>
            <div>
              <h3>${player.name}</h3>
              <div class="player-role">${player.position}</div>
              <div class="player-origin">
                <span>${flagEmoji}</span>
                <span>${player.nationality}</span>
              </div>
            </div>
          </div>
          <div class="player-back">
            <h3 class="player-back-title">${player.name}</h3>
            <div class="player-stat-row">
              <span class="player-stat-label">Position</span>
              <span class="player-stat-value">${player.position}</span>
            </div>
            <div class="player-stat-row">
              <span class="player-stat-label">Height</span>
              <span class="player-stat-value">${player.height}</span>
            </div>
            <div class="player-stat-row">
              <span class="player-stat-label">Age</span>
              <span class="player-stat-value">${player.age} yrs</span>
            </div>
            <div class="player-stat-row">
              <span class="player-stat-label">Est. PPG</span>
              <span class="player-stat-value">${player.points_per_game || player.pointsPerGame || 0}</span>
            </div>
            <a href="#/player/${player.id}" class="btn btn-primary btn-sm" style="display: block; margin-top: 15px; text-decoration: none; text-align: center;">View Full Profile</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="roster-modal-backdrop" id="roster-backdrop">
      <div class="roster-modal glass">
        <div class="roster-modal-header">
          <h2>${teamInfo.title}</h2>
          <button class="roster-modal-close" id="close-roster-modal">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="roster-modal-content">
          <p class="roster-modal-desc">${teamInfo.description}</p>
          <div class="roster-grid">
            ${cardsHTML}
          </div>
        </div>
      </div>
    </div>
  `;
}
