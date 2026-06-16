// Hero Component

const featuredPlayers = [
  { name: 'Faad Billy', height: '6\'2"', position: 'Guard', image: './src/assets/bh men/faad billy.jpg' },
  { name: 'Ian Limbe', height: '6\'1"', position: 'Guard', image: './src/assets/bh men/ian limbe.jpg' },
  { name: 'Kelvin Masiyano', height: '6\'4"', position: 'Forward', image: './src/assets/bh men/kelvin masiyano.jpg' },
  { name: 'Kevin Constant', height: '6\'3"', position: 'Wing', image: './src/assets/bh men/kevin constant.jpg' },
  { name: 'Patrick Chirwa', height: '6\'5"', position: 'Forward', image: './src/assets/bh men/patrick chirwa.jpg' },
  { name: 'Vincent Masiyano', height: '6\'6"', position: 'Center', image: './src/assets/bh men/vincent masiyano.jpg' }
];

function getRandomFeaturedPlayerIndex() {
  const lastIndex = Number(sessionStorage.getItem('bh_featured_player_index') ?? -1);
  if (featuredPlayers.length <= 1) return 0;

  let nextIndex = Math.floor(Math.random() * featuredPlayers.length);
  if (nextIndex === lastIndex) {
    nextIndex = (nextIndex + 1) % featuredPlayers.length;
  }
  sessionStorage.setItem('bh_featured_player_index', String(nextIndex));
  return nextIndex;
}

export function initHeroPlayerRotation(intervalMs = 5000) {
  const container = document.querySelector('[data-hero-player-feature]');
  if (!container) return;

  const image = container.querySelector('.hero-featured-player-img');
  const name = container.querySelector('[data-hero-player-name]');
  const height = container.querySelector('[data-hero-player-height]');
  const position = container.querySelector('[data-hero-player-position]');
  if (!image || !name || !height || !position) return;

  if (window.__bhHeroPlayerRotationTimer) {
    clearInterval(window.__bhHeroPlayerRotationTimer);
  }

  let index = Number(container.dataset.heroPlayerIndex || 0);
  window.__bhHeroPlayerRotationTimer = setInterval(() => {
    index = (index + 1) % featuredPlayers.length;
    const player = featuredPlayers[index];
    container.dataset.heroPlayerIndex = String(index);
    image.classList.add('is-switching');

    setTimeout(() => {
      image.src = player.image;
      image.alt = player.name;
      name.textContent = player.name;
      height.textContent = `Height: ${player.height}`;
      position.textContent = `Position: ${player.position}`;
      image.classList.remove('is-switching');
    }, 180);
  }, intervalMs);
}

export function renderHero(liveGame = null, recentArticles = [], isLoggedIn = false) {
  const featuredPlayerIndex = getRandomFeaturedPlayerIndex();
  const featuredPlayer = featuredPlayers[featuredPlayerIndex];
  const tickerHTML = liveGame ? `
    <nav class="live-game-nav" aria-label="Live game">
      <a href="#/game/${liveGame.id}" class="live-ticker-banner">
        <span class="live-ticker-badge">🔴 LIVE</span>
        <span class="live-ticker-match">Bravehearts vs ${liveGame.opponent}</span>
        <span class="live-ticker-score">${liveGame.our_score ?? 0} - ${liveGame.opponent_score ?? 0}</span>
        <span class="live-ticker-view">
          Stats
          <i data-lucide="arrow-right"></i>
        </span>
      </a>
    </nav>
  ` : '';

  const recentArticlesHTML = recentArticles.length ? `
    <section class="home-news-sec" style="padding: 30px 0 70px;">
      <div class="section-container">
        <div class="section-header" style="margin-bottom: 28px;">
          <span class="section-tagline">Latest Updates</span>
          <h2 class="section-title text-gradient">Recent Articles</h2>
          <p class="section-desc">Catch up on the latest Bravehearts news, announcements, and match stories.</p>
        </div>
        <div class="news-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
          ${recentArticles.map(article => {
            const dateString = new Date(article.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const coverImg = article.image_url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600';
            return `
              <article class="news-card glass" data-article-id="${article.id}">
                <div class="news-card-img-wrapper">
                  <img class="news-card-img" src="${coverImg}" alt="${article.title}" loading="lazy" />
                  <span class="news-badge-tag">${article.category}</span>
                </div>
                <div class="news-card-body">
                  <div class="news-card-date">
                    <i data-lucide="calendar" style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;"></i>
                    ${dateString}
                  </div>
                  <h3 class="news-card-title">${article.title}</h3>
                  <p class="news-card-excerpt">${String(article.content || '').slice(0, 110)}...</p>
                  <button class="btn btn-secondary btn-sm read-article-btn" data-id="${article.id}" type="button" style="display: inline-flex; align-items: center; gap: 6px;">
                    Read Article
                    <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
        <div style="text-align: center; margin-top: 28px;">
          <a class="btn btn-primary" href="#/news" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
            View All Articles
            <i data-lucide="newspaper"></i>
          </a>
        </div>
      </div>
    </section>
  ` : '';

  return `
    ${tickerHTML}
    <section class="hero-sec" id="hero">
      <div class="section-container">
        <div class="hero-grid">
          <!-- Text Content -->
          <div class="hero-content">
            <h1 class="hero-title">
              BRAVEHEARTS <span class="text-gradient">BASKETBALL CLUB</span>
            </h1>
            <p class="hero-subtitle">
              Empowering Malawian youth through elite sports and academic scholarship programs. Domestically dominant. Internationally aspiring.
            </p>
            ${!isLoggedIn ? `
              <div class="glass" style="padding: 14px 16px; border-radius: 12px; margin: 18px 0; border: 1px solid var(--border-active);">
                <p style="margin: 0; color: var(--color-text-secondary); font-size: 0.95rem;">
                  Enjoying Bravehearts? <a href="#/login" style="color: var(--color-accent); font-weight: 800; text-decoration: none;">Create an account</a> to shop, vote in polls, receive notifications, and track your orders.
                </p>
              </div>
            ` : ''}
            <div class="hero-cta">
              <a class="btn btn-primary" href="#/roster">
                Explore Roster
                <i data-lucide="arrow-right"></i>
              </a>
              <a class="btn btn-secondary" href="#/fanzone">
                Visit Fanzone
                <i data-lucide="shopping-bag"></i>
              </a>
            </div>
          </div>
          
          <!-- Graphic Representation -->
          <div class="hero-graphic-container">
            <div class="hero-badge-graphic hero-player-feature" data-hero-player-feature data-hero-player-index="${featuredPlayerIndex >= 0 ? featuredPlayerIndex : 0}">
              <img class="hero-featured-player-img" src="${featuredPlayer.image}" alt="${featuredPlayer.name}" loading="lazy" />
              <div class="hero-featured-player-overlay">
                <span>Featured Player</span>
                <strong data-hero-player-name>${featuredPlayer.name}</strong>
                <em data-hero-player-position>Position: ${featuredPlayer.position}</em>
                <em data-hero-player-height>Height: ${featuredPlayer.height}</em>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    ${recentArticlesHTML}

    <!-- Article Detail Modal -->
    <div id="article-modal" class="modal-backdrop article-modal-backdrop" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow: hidden;">
      <div class="modal-card glass article-modal-card" style="max-width: 800px; width: 100%; max-height: 90vh; overflow: hidden; border: 1px solid var(--border-glass); border-radius: 16px; padding: 24px; position: relative; display: flex; flex-direction: column; margin: auto;">
        <button id="close-article-modal" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.06); border: none; border-radius: 50%; width: 36px; height: 36px; color: var(--color-text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2;">
          <i data-lucide="x"></i>
        </button>
        <div id="article-modal-content" class="article-modal-scroll" style="overflow-y: auto; padding-right: 8px;"></div>
      </div>
    </div>
  `;
}
