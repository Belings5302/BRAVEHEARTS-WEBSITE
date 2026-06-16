// Admin Products Management Component

export function renderProductsList(products = [], isSuperAdmin = false) {
  return `
    <div class="admin-products">
      <div class="section-header" style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 class="section-title">Products Management</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">Create, edit, and manage product inventory</p>
        </div>
        <button id="add-product-btn" class="btn btn-primary">
          <i data-lucide="plus" style="width: 18px; height: 18px; margin-right: 6px; display: inline;"></i> Add Product
        </button>
      </div>

      <!-- Products Table -->
      <div class="products-table-container">
        ${products.length > 0 ? `
          <table class="products-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted);">
                <th style="padding: 12px;">Image</th>
                <th style="padding: 12px;">Product Name</th>
                <th style="padding: 12px;">SKU</th>
                <th style="padding: 12px;">Category</th>
                <th style="padding: 12px;">Price (MWK / USD)</th>
                <th style="padding: 12px;">New</th>
                <th style="padding: 12px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(product => `
                <tr class="product-row" data-product-id="${product.id}" style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                  <td data-label="Image" style="padding: 12px;">
                    <div style="width: 48px; height: 48px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass);">
                      <img src="${product.image_url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100'}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                  </td>
                  <td data-label="Product Name" style="padding: 12px;"><strong>${product.title}</strong></td>
                  <td data-label="SKU" style="padding: 12px;"><code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem;">${product.sku}</code></td>
                  <td data-label="Category" style="padding: 12px;">${product.category}</td>
                  <td data-label="Price" style="padding: 12px;">
                    <div>MWK ${product.price_mwk?.toLocaleString() || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--color-accent);">$${product.price_usd?.toFixed(2) || '0.00'}</div>
                  </td>
                  <td data-label="New" style="padding: 12px;">
                    <span class="badge ${product.is_new ? 'badge-new' : 'badge-inactive'}">
                      ${product.is_new ? '✓ New' : '-'}
                    </span>
                  </td>
                  <td data-label="Action" style="padding: 12px; text-align: right;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
                      <button class="btn-action edit-product-btn" data-product-id="${product.id}" title="Edit">
                        <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                      </button>
                      <button class="btn-action delete-product-btn" data-product-id="${product.id}" ${isSuperAdmin ? '' : 'disabled style="opacity: 0.5;"'} title="${isSuperAdmin ? 'Delete' : 'Super Admin Only'}">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="empty-state" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
            <i data-lucide="box" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px; display: block; margin: 0 auto 16px;"></i>
            <p>No products found</p>
          </div>
        `}
      </div>
    </div>
  `;
}

export function renderProductForm(product = null) {
  const isEdit = !!product;
  const title = isEdit ? `Edit Product: ${product.title}` : 'Create New Product';

  return `
    <div class="admin-products">
      <div class="section-header" style="margin-bottom: 30px;">
        <button class="back-button" id="back-to-products" style="margin-bottom: 12px; background: none; border: none; color: var(--color-accent); cursor: pointer; font-weight: 600;">← Back to Products</button>
        <h2 class="section-title">${title}</h2>
      </div>

      <form id="product-form" class="product-form" style="max-width: 600px; text-align: left;">
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" for="product-title" style="display: block; margin-bottom: 6px;">Product Name *</label>
          <input class="form-input" type="text" id="product-title" name="title" placeholder="e.g., Bravehearts Home Jersey" required value="${product?.title || ''}" style="width: 100%;" />
        </div>

        <div class="form-grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label class="form-label" for="product-sku" style="display: block; margin-bottom: 6px;">SKU *</label>
            <input class="form-input" type="text" id="product-sku" name="sku" placeholder="e.g., BH-HOME-26" required value="${product?.sku || ''}" style="width: 100%;" />
          </div>

          <div class="form-group">
            <label class="form-label" for="product-category" style="display: block; margin-bottom: 6px;">Category *</label>
            <select class="form-input" id="product-category" name="category" required style="width: 100%; background: var(--bg-obsidian-light); color: #fff; border: 1px solid var(--border-glass); height: 44px; padding: 0 12px; border-radius: 8px;">
              <option value="" disabled>Select category</option>
              <option value="Apparel" ${product?.category === 'Apparel' ? 'selected' : ''}>Apparel</option>
              <option value="Headwear" ${product?.category === 'Headwear' ? 'selected' : ''}>Headwear</option>
              <option value="Tickets" ${product?.category === 'Tickets' ? 'selected' : ''}>Tickets</option>
              <option value="Membership" ${product?.category === 'Membership' ? 'selected' : ''}>Membership</option>
              <option value="Subscription" ${product?.category === 'Subscription' ? 'selected' : ''}>Subscription</option>
              <option value="Other" ${product?.category === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label class="form-label" for="product-price-mwk" style="display: block; margin-bottom: 6px;">Price (MWK) *</label>
            <input class="form-input" type="number" id="product-price-mwk" name="price_mwk" placeholder="e.g., 45000" required value="${product?.price_mwk || ''}" style="width: 100%;" />
          </div>

          <div class="form-group">
            <label class="form-label" for="product-price-usd" style="display: block; margin-bottom: 6px;">Price (USD) *</label>
            <input class="form-input" type="number" id="product-price-usd" name="price_usd" placeholder="e.g., 15.00" step="0.01" required value="${product?.price_usd || ''}" style="width: 100%;" />
          </div>
        </div>

        <!-- Product Image URL and Upload -->
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" for="product-image-url" style="display: block; margin-bottom: 6px;">Product Image URL</label>
          <div style="display: flex; gap: 10px;">
            <input class="form-input" type="text" id="product-image-url" name="image_url" placeholder="e.g., /uploads/image.jpg" value="${product?.image_url || ''}" style="flex-grow: 1;" />
            <div style="position: relative;">
              <button type="button" class="btn btn-secondary" id="upload-product-image-btn" style="height: 44px;">Upload</button>
              <input type="file" id="product-image-file" accept="image/*" style="display: none;" />
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" for="product-description" style="display: block; margin-bottom: 6px;">Description</label>
          <textarea class="form-input" id="product-description" name="description" rows="4" placeholder="Product description..." style="width: 100%;">${product?.description || ''}</textarea>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: var(--color-text-primary);">
            <input type="checkbox" id="product-is-new" name="is_new" ${product?.is_new ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" />
            Mark as New Product
          </label>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button type="submit" class="btn btn-primary">
            ${isEdit ? 'Save Changes' : 'Create Product'}
          </button>
          <button type="button" id="cancel-form-btn" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;
}
