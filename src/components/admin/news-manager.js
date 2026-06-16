// News & Polls Manager (Admin)

export function renderNewsManager(articles = [], polls = [], activeSubView = 'articles', editingArticle = null, isSuperAdmin = false) {
  const subTabsHTML = `
    <div class="gallery-filters" style="display: flex; gap: 12px; margin-bottom: 24px;">
      <button class="filter-btn glass ${activeSubView === 'articles' ? 'active' : ''}" id="tab-manage-articles">
        Manage Articles
      </button>
      <button class="filter-btn glass ${activeSubView === 'polls' ? 'active' : ''}" id="tab-manage-polls">
        Manage Fan Polls
      </button>
    </div>
  `;

  if (activeSubView === 'articles') {
    const articlesHTML = articles.length === 0
      ? `<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No articles found.</td></tr>`
      : articles.map(art => `
        <tr data-article-id="${art.id}">
          <td style="padding: 12px; font-weight: 700; color: #fff;">${art.title}</td>
          <td style="padding: 12px;">${art.category}</td>
          <td style="padding: 12px;">${new Date(art.created_at).toLocaleDateString()}</td>
          <td style="padding: 12px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm edit-article-btn" data-id="${art.id}">Edit</button>
            <button class="btn btn-primary btn-sm delete-article-btn" data-id="${art.id}" ${isSuperAdmin ? '' : 'disabled style="opacity: 0.5;"'} title="${isSuperAdmin ? 'Delete' : 'Super Admin Only'}">Delete</button>
          </td>
        </tr>
      `).join('');

    const formTitle = editingArticle ? 'Edit News Article' : 'Create News Article';
    const formHTML = `
      <div class="login-card glass" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; margin-bottom: 30px; max-width: 100%;">
        <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: #fff; margin-bottom: 20px;">${formTitle}</h3>
        <form id="news-article-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <label class="login-label" for="article-title" style="margin-bottom: 6px;">Title</label>
              <input class="login-input" type="text" id="article-title" placeholder="Article Title" value="${editingArticle ? editingArticle.title : ''}" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="article-category" style="margin-bottom: 6px;">Category</label>
              <select class="login-input" id="article-category" style="width: 100%; background: var(--bg-obsidian-light); color: #fff; border: 1px solid var(--border-glass);" required>
                <option value="Announcement" ${editingArticle && editingArticle.category === 'Announcement' ? 'selected' : ''}>Announcement</option>
                <option value="Merchandise" ${editingArticle && editingArticle.category === 'Merchandise' ? 'selected' : ''}>Merchandise</option>
                <option value="Community" ${editingArticle && editingArticle.category === 'Community' ? 'selected' : ''}>Community</option>
                <option value="Match Review" ${editingArticle && editingArticle.category === 'Match Review' ? 'selected' : ''}>Match Review</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            <label class="login-label" for="article-image" style="margin-bottom: 6px;">Cover Image URL</label>
            <div style="display: flex; gap: 10px;">
              <input class="login-input" type="text" id="article-image" placeholder="https://..." value="${editingArticle ? editingArticle.image_url : ''}" style="flex-grow: 1;" />
              <div style="position: relative;">
                <button type="button" class="btn btn-secondary" id="upload-article-image-btn" style="height: 44px;">Upload</button>
                <input type="file" id="article-image-file" accept="image/*" style="display: none;" />
              </div>
            </div>
          </div>
          <div style="margin-bottom: 20px;">
            <label class="login-label" for="article-content" style="margin-bottom: 6px;">Content</label>
            <textarea class="login-input" id="article-content" placeholder="Write article content here..." required style="width: 100%; min-height: 150px; font-family: inherit; line-height: 1.6; resize: vertical;">${editingArticle ? editingArticle.content : ''}</textarea>
          </div>
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-primary" type="submit">${editingArticle ? 'Save Changes' : 'Publish Article'}</button>
            ${editingArticle ? `<button class="btn btn-secondary" type="button" id="cancel-article-edit">Cancel</button>` : ''}
          </div>
        </form>
      </div>
    `;

    return `
      <div class="news-manager-container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <h2 style="font-family: var(--font-headings); font-size: 2rem; color: #fff; margin:0;">News & Fan Polls</h2>
          <span style="font-size: 0.85rem; color: var(--color-text-muted); background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 4px;">Role: ${isSuperAdmin ? 'Super Admin' : 'Editor (Restricted)'}</span>
        </div>

        ${subTabsHTML}
        ${formHTML}

        <div class="login-card glass" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; max-width: 100%;">
          <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: #fff; margin-bottom: 20px; border-left: 4px solid var(--color-accent); padding-left: 12px;">Published Articles</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted);">
                  <th style="padding: 12px;">Title</th>
                  <th style="padding: 12px;">Category</th>
                  <th style="padding: 12px;">Published</th>
                  <th style="padding: 12px; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${articlesHTML}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else {
    // Polls view
    const pollsHTML = polls.length === 0
      ? `<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No polls found.</td></tr>`
      : polls.map(p => {
          const totalVotes = p.options.reduce((sum, opt) => sum + opt.votes, 0);
          return `
            <tr data-poll-id="${p.id}">
              <td style="padding: 12px; font-weight: 700; color: #fff;">${p.question}</td>
              <td style="padding: 12px;">${totalVotes} votes</td>
              <td style="padding: 12px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700; background: ${p.status === 'active' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)'}; color: ${p.status === 'active' ? '#2ed573' : '#ff4757'};">
                  ${p.status.toUpperCase()}
                </span>
              </td>
              <td style="padding: 12px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm toggle-poll-btn" data-id="${p.id}" data-status="${p.status}">
                  ${p.status === 'active' ? 'Close' : 'Open'}
                </button>
                <button class="btn btn-primary btn-sm delete-poll-btn" data-id="${p.id}" ${isSuperAdmin ? '' : 'disabled style="opacity: 0.5;"'} title="${isSuperAdmin ? 'Delete' : 'Super Admin Only'}">Delete</button>
              </td>
            </tr>
          `;
        }).join('');

    const formHTML = `
      <div class="login-card glass" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; margin-bottom: 30px; max-width: 100%;">
        <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: #fff; margin-bottom: 20px;">Create Fan Poll</h3>
        <form id="news-poll-form">
          <div style="margin-bottom: 16px;">
            <label class="login-label" for="poll-question" style="margin-bottom: 6px;">Poll Question</label>
            <input class="login-input" type="text" id="poll-question" placeholder="e.g. Who was your MVP vs Costa do Sol?" required style="width: 100%;" />
          </div>
          <div style="margin-bottom: 20px;">
            <label class="login-label" style="margin-bottom: 6px; display: block;">Poll Options (Minimum 2)</label>
            <div id="poll-options-inputs" style="display: flex; flex-direction: column; gap: 10px;">
              <input class="login-input poll-opt-input" type="text" placeholder="Option 1" required style="width: 100%;" />
              <input class="login-input poll-opt-input" type="text" placeholder="Option 2" required style="width: 100%;" />
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="add-poll-option-btn" style="margin-top: 10px;">
              <i data-lucide="plus" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Add Option
            </button>
          </div>
          <button class="btn btn-primary" type="submit">Publish Poll</button>
        </form>
      </div>
    `;

    return `
      <div class="news-manager-container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <h2 style="font-family: var(--font-headings); font-size: 2rem; color: #fff; margin:0;">News & Fan Polls</h2>
          <span style="font-size: 0.85rem; color: var(--color-text-muted); background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 4px;">Role: ${isSuperAdmin ? 'Super Admin' : 'Editor (Restricted)'}</span>
        </div>

        ${subTabsHTML}
        ${formHTML}

        <div class="login-card glass" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; max-width: 100%;">
          <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: #fff; margin-bottom: 20px; border-left: 4px solid var(--color-accent); padding-left: 12px;">Existing Polls</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted);">
                  <th style="padding: 12px;">Question</th>
                  <th style="padding: 12px;">Total Votes</th>
                  <th style="padding: 12px;">Status</th>
                  <th style="padding: 12px; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pollsHTML}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}
