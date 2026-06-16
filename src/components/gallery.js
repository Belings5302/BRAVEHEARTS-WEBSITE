// Gallery Component

export function renderGallery(items, currentFilter = 'all') {
  const filteredItems = currentFilter === 'all'
    ? items
    : items.filter(item => item.media_type === currentFilter);

  const galleryHTML = filteredItems.length === 0
    ? `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--color-text-muted);">
        <i data-lucide="image" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
        <p>No media files found in this category.</p>
      </div>
    `
    : filteredItems.map(item => {
        const isVideo = item.media_type === 'video';
        
        return `
          <div class="gallery-item-card glass" data-id="${item.id}" data-type="${item.media_type}" data-url="${item.media_url}">
            <div class="gallery-media-wrapper">
              <img class="gallery-img" src="${isVideo ? 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=600' : item.media_url}" alt="${item.title}" />
              <div class="gallery-overlay">
                <div class="gallery-overlay-icon">
                  <i data-lucide="${isVideo ? 'play-circle' : 'maximize-2'}"></i>
                </div>
              </div>
            </div>
            <div class="gallery-item-title">${item.title}</div>
          </div>
        `;
      }).join('');

  return `
    <div class="gallery-page-container">
      <div class="page-header" style="text-align: center; margin-bottom: 40px;">
        <h2 style="font-size: 2.5rem; font-family: var(--font-display); font-weight: 800; margin-bottom: 12px;">Media <span class="text-gradient">Gallery</span></h2>
        <p style="color: var(--color-text-muted); max-width: 600px; margin: 0 auto;">Relive the action! Browse game photos, practice session highlights, and official video recaps of the Bravehearts.</p>
      </div>

      <!-- Filters -->
      <div class="gallery-filters" style="display: flex; justify-content: center; gap: 12px; margin-bottom: 30px;">
        <button class="filter-btn glass ${currentFilter === 'all' ? 'active' : ''}" data-gallery-filter="all">All Media</button>
        <button class="filter-btn glass ${currentFilter === 'image' ? 'active' : ''}" data-gallery-filter="image">Photos</button>
        <button class="filter-btn glass ${currentFilter === 'video' ? 'active' : ''}" data-gallery-filter="video">Videos</button>
      </div>

      <!-- Grid -->
      <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        ${galleryHTML}
      </div>
    </div>

    <!-- Lightbox Modal -->
    <div id="gallery-lightbox" class="modal-backdrop" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; padding: 20px;">
      <button id="close-lightbox-btn" style="position: absolute; top: 20px; right: 20px; width: 48px; height: 48px; z-index: 10002;">
        <i data-lucide="x" style="width: 24px; height: 24px;"></i>
      </button>
      <div class="lightbox-content" style="max-width: 90%; max-height: 85vh; display: flex; flex-direction: column; align-items: center; gap: 16px; position: relative;">
        <div id="lightbox-media-container" style="width: 100%; display: flex; justify-content: center; align-items: center;"></div>
        <h4 id="lightbox-title" style="margin: 0; color: #fff; font-family: var(--font-display); font-size: 1.2rem; text-align: center;"></h4>
      </div>
    </div>
  `;
}
