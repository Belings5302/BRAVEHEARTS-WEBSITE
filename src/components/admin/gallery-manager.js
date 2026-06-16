// Gallery Manager (Admin)

export function renderGalleryManager(items = [], isSuperAdmin = false) {
  const itemsHTML = items.length === 0
    ? `<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No media items found in the gallery.</td></tr>`
    : items.map(item => `
      <tr data-gallery-id="${item.id}">
        <td style="padding: 12px; font-weight: 700; color: var(--color-text-primary);">${item.title}</td>
        <td style="padding: 12px; text-transform: capitalize; color: var(--color-text-primary);">${item.media_type}</td>
        <td style="padding: 12px; font-size: 0.85rem; color: var(--color-text-secondary); word-break: break-all;">${item.media_url}</td>
        <td style="padding: 12px; text-align: right;">
          <button class="btn btn-primary btn-sm delete-gallery-item-btn" data-id="${item.id}" ${isSuperAdmin ? '' : 'disabled style="opacity: 0.5;"'} title="${isSuperAdmin ? 'Delete' : 'Super Admin Only'}">Delete</button>
        </td>
      </tr>
    `).join('');

  return `
    <div class="gallery-manager-container admin-manager-page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 12px;">
        <h2 style="font-family: var(--font-headings); font-size: 2rem; color: var(--color-text-primary); margin:0;">Media Gallery Manager</h2>
        <span style="font-size: 0.85rem; color: var(--color-text-primary); background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 4px;">Role: ${isSuperAdmin ? 'Super Admin' : 'Editor (Restricted)'}</span>
      </div>

      <!-- Add Media Form -->
      <div class="login-card glass" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; margin-bottom: 30px; max-width: 100%;">
        <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: var(--color-text-primary); margin-bottom: 20px;">Add Media Item</h3>
        <form id="gallery-item-form">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div>
              <label class="login-label" for="gallery-title" style="margin-bottom: 6px;">Media Title</label>
              <input class="login-input" type="text" id="gallery-title" placeholder="e.g. BAL Highlights vs Costa do Sol" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="gallery-type" style="margin-bottom: 6px;">Media Type</label>
              <select class="login-input" id="gallery-type" style="width: 100%; background: var(--bg-card); color: var(--color-text-primary); border: 1px solid var(--border-glass);" required>
                <option value="image">Photo</option>
                <option value="video">Video (YouTube Link)</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom: 20px;">
            <label class="login-label" for="gallery-url" style="margin-bottom: 6px;">Media URL / Source</label>
            <div style="display: flex; gap: 10px;">
              <input class="login-input" type="text" id="gallery-url" placeholder="https://..." required style="flex-grow: 1;" />
              <div style="position: relative;" id="gallery-upload-container">
                <button type="button" class="btn btn-secondary" id="upload-gallery-image-btn" style="height: 44px;">Upload</button>
                <input type="file" id="gallery-image-file" accept="image/*" style="display: none;" />
              </div>
            </div>
            <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 6px; margin-bottom:0;">Note: For photos, you can upload directly or paste a URL. For videos, paste any YouTube watch, share, Shorts, or embed link.</p>
          </div>
          <button class="btn btn-primary" type="submit" style="width: 100%;">Add to Gallery</button>
        </form>
      </div>

      <!-- Current Items List -->
      <div class="login-card glass" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; max-width: 100%;">
        <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: var(--color-text-primary); margin-bottom: 20px; border-left: 4px solid var(--color-accent); padding-left: 12px;">Gallery Media List</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; min-width: 620px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted);">
                <th style="padding: 12px; width: 30%; color: var(--color-text-secondary);">Title</th>
                <th style="padding: 12px; width: 15%; color: var(--color-text-secondary);">Type</th>
                <th style="padding: 12px; width: 45%; color: var(--color-text-secondary);">Source URL</th>
                <th style="padding: 12px; width: 10%; text-align: right; color: var(--color-text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
