// News and Fan Polls Component

export function renderNewsFeed(articles, polls, activeVotes = {}, searchTerm = '') {
  const articlesHTML = articles.length === 0
    ? `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-muted);">
        <i data-lucide="book-open" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
        <p>No news articles published yet. Check back soon!</p>
      </div>
    `
    : articles.map(art => {
        const dateString = new Date(art.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const defaultImg = "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600";
        const coverImg = art.image_url || defaultImg;
        return `
          <article class="news-card glass" data-article-id="${art.id}">
            <div class="news-card-img-wrapper">
              <img class="news-card-img" src="${coverImg}" alt="${art.title}" />
              <span class="news-badge-tag">${art.category}</span>
            </div>
            <div class="news-card-body">
              <div class="news-card-date">
                <i data-lucide="calendar" style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;"></i>
                ${dateString}
              </div>
              <h3 class="news-card-title">${art.title}</h3>
              <p class="news-card-excerpt">${art.content.slice(0, 120)}...</p>
              <button class="btn btn-secondary btn-sm read-article-btn" data-id="${art.id}">
                Read Article
                <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </article>
        `;
      }).join('');

  const pollsHTML = polls.length === 0
    ? `
      <div style="text-align: center; padding: 20px; color: var(--color-text-muted);">
        <p>No active polls currently.</p>
      </div>
    `
    : polls.map(p => {
        const alreadyVoted = activeVotes[p.id] !== undefined;
        const totalVotes = p.options.reduce((sum, opt) => sum + opt.votes, 0);

        let optionsHTML = '';
        if (alreadyVoted || p.status === 'closed') {
          // Show results
          optionsHTML = p.options.map((opt, idx) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            const isUserChoice = activeVotes[p.id] == idx;
            return `
              <div class="poll-result-row">
                <div class="poll-result-label">
                  <span>${opt.option} ${isUserChoice ? '<small style="color: var(--color-accent); font-weight: bold;">(Your Vote)</small>' : ''}</span>
                  <span>${pct}% (${opt.votes})</span>
                </div>
                <div class="poll-result-bar-bg">
                  <div class="poll-result-bar-fill" style="width: ${pct}%; background: ${isUserChoice ? 'var(--color-accent)' : 'rgba(255,255,255,0.25)'}"></div>
                </div>
              </div>
            `;
          }).join('');
        } else {
          // Show voting buttons
          optionsHTML = p.options.map((opt, idx) => `
            <button class="poll-vote-btn glass" data-poll-id="${p.id}" data-option-index="${idx}">
              <span>${opt.option}</span>
              <i data-lucide="chevron-right" style="width: 14px; height: 14px; opacity: 0.5;"></i>
            </button>
          `).join('');
        }

        return `
          <div class="poll-widget-card glass ${p.status === 'closed' ? 'poll-closed' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="poll-status-badge">${p.status === 'active' ? 'ACTIVE POLL' : 'CLOSED'}</span>
              <span style="font-size: 0.8rem; color: var(--color-text-muted);">${totalVotes} total votes</span>
            </div>
            <h4 class="poll-question" style="margin: 0 0 16px; font-family: var(--font-display); line-height: 1.4;">${p.question}</h4>
            <div class="poll-options-container" style="display: flex; flex-direction: column; gap: 8px;">
              ${optionsHTML}
            </div>
          </div>
        `;
      }).join('');

  return `
    <div class="news-page-container">
      <div class="page-header" style="text-align: center; margin-bottom: 40px;">
        <h2 style="font-size: 2.5rem; font-family: var(--font-display); font-weight: 800; margin-bottom: 12px;">Club <span class="text-gradient">News & Announcements</span></h2>
        <p style="color: var(--color-text-muted); max-width: 600px; margin: 0 auto;">Stay updated with match reviews, player updates, community programs, and official announcements from Bravehearts.</p>
      </div>

      <div style="max-width: 620px; margin: 0 auto 32px;">
        <label for="news-search-input" style="display: block; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 8px; font-weight: 600;">Search news</label>
        <input id="news-search-input" type="search" value="${searchTerm}" placeholder="Search by title, category, or story..." class="login-input" style="width: 100%;">
      </div>

      <div class="news-layout-grid" style="display: grid; grid-template-columns: 1fr; gap: 30px;">
        <!-- Main Feed -->
        <div class="news-articles-section">
          <h3 style="font-family: var(--font-display); margin-bottom: 20px; font-size: 1.5rem; border-left: 4px solid var(--color-accent); padding-left: 10px;">Latest Articles</h3>
          <div class="news-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
            ${articlesHTML}
          </div>
        </div>

        <!-- Sidebar (Polls & Stats) -->
        <div class="news-sidebar-section">
          <h3 style="font-family: var(--font-display); margin-bottom: 20px; font-size: 1.5rem; border-left: 4px solid var(--color-accent); padding-left: 10px;">Fanzone Polls</h3>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${pollsHTML}
          </div>
        </div>
      </div>
    </div>

    <!-- Article Detail Modal -->
    <div id="article-modal" class="modal-backdrop article-modal-backdrop" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow: hidden;">
      <div class="modal-card glass article-modal-card" style="max-width: 800px; width: 100%; max-height: 90vh; overflow: hidden; border: 1px solid var(--border-glass); border-radius: 16px; padding: 24px; position: relative; display: flex; flex-direction: column;">
        <button id="close-article-modal" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.06); border: none; border-radius: 50%; width: 36px; height: 36px; color: var(--color-text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <i data-lucide="x"></i>
        </button>
        <div id="article-modal-content" class="article-modal-scroll" style="overflow-y: auto; padding-right: 8px;"></div>
      </div>
    </div>
  `;
}

export function renderArticleDetailsModal(article) {
  const dateString = new Date(article.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const defaultImg = "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800";
  const coverImg = article.image_url || defaultImg;
  return `
    <div style="margin-bottom: 20px; border-radius: 12px; overflow: hidden; max-height: 350px;">
      <img src="${coverImg}" alt="${article.title}" style="width: 100%; height: 100%; object-fit: cover;" />
    </div>
    <span class="news-badge-tag" style="display: inline-block; margin-bottom: 12px;">${article.category}</span>
    <h2 style="font-family: var(--font-display); font-size: 2rem; margin: 0 0 12px; line-height: 1.3;">${article.title}</h2>
    <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 24px;">
      <i data-lucide="calendar" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
      Published on ${dateString}
    </div>
    <div class="article-body-text" style="color: var(--color-text-secondary); line-height: 1.8; font-size: 1.05rem; white-space: pre-line;">
      ${article.content}
    </div>
  `;
}
