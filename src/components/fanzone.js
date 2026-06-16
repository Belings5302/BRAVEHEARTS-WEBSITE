// FanZone and Cart Component
function getMerchImageUrl(product) {
  const normalizedTitle = String(product.title || '').toLowerCase();
  if (normalizedTitle.includes('home jersey')) return './src/assets/merch/red jersey.jpg';
  if (normalizedTitle.includes('away jersey')) return './src/assets/merch/white.jpg';
  if (normalizedTitle.includes('road to bal hoodie') || normalizedTitle.includes('hoodie')) return './src/assets/merch/top.jpg';
  if (normalizedTitle.includes('snapback cap') || normalizedTitle.includes('cap')) return './src/assets/merch/cap.jpg';
  return null;
}

export function isSubscriptionProduct(product) {
  const category = String(product.category || '').toLowerCase();
  const title = String(product.title || '').toLowerCase();
  return category.includes('subscription') || category.includes('membership') || title.includes('subscription') || title.includes('membership');
}

export function renderFanZone(products = [], exchangeRate = 0.0006, searchTerm = '', hasActiveSubscription = false) {
  const visibleProducts = hasActiveSubscription ? products.filter(product => !isSubscriptionProduct(product)) : products;
  const productsHTML = visibleProducts.map(product => {
    const imageUrl = getMerchImageUrl(product);
    const imageMarkup = imageUrl ? `
          <img class="product-img" src="${encodeURI(imageUrl)}" alt="${product.title}" loading="lazy" />
        ` : `
          <i data-lucide="${product.category === 'Headwear' ? 'smile' : product.category === 'Tickets' ? 'ticket' : product.category === 'Membership' ? 'award' : 'shirt'}" style="width: 64px; height: 64px;"></i>
          <span style="font-size: 0.8rem; font-weight: 600; opacity: 0.7;">Bravehearts Official</span>
        `;

    const mwkPrice = Number(product.price ?? product.price_mwk ?? 0);
    const priceUSD = (mwkPrice * exchangeRate).toFixed(2);

    return `
      <div class="product-card glass">
        <div class="product-img-placeholder">
          ${product.isNew ? `<span class="product-badge">New</span>` : ''}
          ${imageMarkup}
        </div>
        <div class="product-info">
          <div class="product-category">${product.category}</div>
          <h3 class="product-title">${product.title}</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-muted); min-height: 48px; margin-bottom: 16px;">
            ${product.description}
          </p>
          <div class="product-footer">
            <div>
              <div class="product-price">MWK ${mwkPrice.toLocaleString()}</div>
              <span style="font-size: 0.75rem; color: var(--color-accent); font-weight: 600;">$${priceUSD} USD</span>
            </div>
            <button class="add-to-cart-btn" data-add-to-cart="${product.id}" title="Add to Cart">
              <i data-lucide="plus" style="width: 18px; height: 18px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="fanzone-sec" id="fanzone">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tagline">Supporters Shop</span>
          <h2 class="section-title text-gradient-green">Fanzone & Merch</h2>
          <p class="section-desc">
            Support the club! All proceeds from tickets and official merchandise directly fund our academic youth scholarships.
          </p>
        </div>
        
        <div style="max-width: 520px; margin: 0 auto 28px;">
          <label for="product-search-input" style="display: block; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 8px; font-weight: 600;">Search products</label>
          <input id="product-search-input" type="search" value="${searchTerm}" placeholder="Search by product, category, SKU..." class="login-input" style="width: 100%;">
        </div>
        ${hasActiveSubscription ? `
          <div class="glass" style="max-width: 760px; margin: 0 auto 24px; padding: 16px 18px; border-radius: 14px; text-align: center; color: var(--color-text-main);">
            Your subscription is active. The subscription fee will appear again when your subscription period ends.
          </div>
        ` : ''}
        <div class="products-grid">
          ${productsHTML || `<div class="glass" style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--color-text-muted); border-radius: 16px;">No Fan Zone products found.</div>`}
        </div>
      </div>
    </section>
  `;
}

export function renderCartDrawer(cartItems = [], isOpen = false, selectedMobileMoney = null, exchangeRate = 0.0006) {
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPriceMWK = cartItems.reduce((sum, item) => sum + (Number(item.price ?? item.price_mwk ?? 0) * item.quantity), 0);
  const totalPriceUSD = totalPriceMWK * exchangeRate;

  let cartItemsHTML = `
    <div class="cart-empty-message">
      <i data-lucide="shopping-cart" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.3; display: inline-block;"></i>
      <p>Your shopping cart is empty.</p>
      <p style="font-size: 0.8rem; margin-top: 8px;">Explore the Fanzone to add items.</p>
    </div>
  `;

  if (cartItems.length > 0) {
    cartItemsHTML = cartItems.map(item => {
      const itemPriceMWK = Number(item.price ?? item.price_mwk ?? 0);
      const itemPriceUSD = (itemPriceMWK * exchangeRate).toFixed(2);
      return `
      <div class="cart-item">
        <div style="background: rgba(255,255,255,0.03); width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-glass);">
          <i data-lucide="${item.category === 'Tickets' ? 'ticket' : item.category === 'Membership' ? 'award' : 'shirt'}" style="width: 24px; height: 24px; color: var(--color-accent);"></i>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">MWK ${itemPriceMWK.toLocaleString()} ($${itemPriceUSD})</div>
          <div class="cart-item-qty">Qty: ${item.quantity}</div>
        </div>
        <button class="cart-item-remove" data-remove-from-cart="${item.id}" title="Remove Item">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      </div>
    `;
    }).join('');
  }

  const paymentSelection = cartItems.length > 0 ? `
    <div class="cart-payment-section">
      <p style="margin-bottom: 12px; color: var(--color-text-muted);">Tap a payment method to select:</p>
      <div class="mobile-money-buttons" style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;">
        <div class="mobile-money-img-btn ${selectedMobileMoney === 'Airtel Money' ? 'active' : ''}" data-select-mobile-money="Airtel Money" role="button" tabindex="0" aria-label="Pay with Airtel Money">
          <img class="mobile-money-img" src="./src/assets/airtel.jpg" alt="Airtel Money" />
          <span class="mobile-money-label">Airtel Money</span>
        </div>
        <div class="mobile-money-img-btn ${selectedMobileMoney === 'TNM Mpamba' ? 'active' : ''}" data-select-mobile-money="TNM Mpamba" role="button" tabindex="0" aria-label="Pay with TNM Mpamba">
          <img class="mobile-money-img" src="./src/assets/mpamba.jpg" alt="TNM Mpamba" />
          <span class="mobile-money-label">TNM Mpamba</span>
        </div>
      </div>
      ${selectedMobileMoney ? `
        <div class="payment-instructions glass" style="padding: 16px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass);">
          <p style="margin: 0 0 10px; font-weight: 700;">${selectedMobileMoney} instructions</p>
          <p style="margin: 0 0 8px;">${selectedMobileMoney === 'Airtel Money' ? 'Airtel Money Paybill: 23242' : 'TNM Mpamba Paybill: 12345'}</p>
          <p style="margin: 0 0 8px;">Business Name: Bravehearts</p>
          <p style="margin: 0 0 8px;">Reference: use your email address or a unique code like <strong>BH-${Date.now()}</strong></p>
          <p style="margin: 0; font-size: 0.85rem; color: var(--color-text-muted);">After payment, click Confirm Payment to complete your order.</p>
        </div>
      ` : ''}
    </div>
  ` : '';

  return `
    <!-- Backdrop -->
    <div class="cart-backdrop ${isOpen ? 'active' : ''}" id="cart-backdrop"></div>
    
    <!-- Drawer -->
    <div class="cart-drawer ${isOpen ? 'open' : ''}" id="cart-drawer">
      <div class="cart-header">
        <h3 style="display: flex; align-items: center; gap: 10px;">
          <i data-lucide="shopping-cart" style="color: var(--color-accent);"></i>
          Your Cart (${itemCount})
        </h3>
        <button class="close-cart-btn" id="close-cart-btn">
          <i data-lucide="x"></i>
        </button>
      </div>
      
      <div class="cart-scroll-area">
        <div class="cart-items">
          ${cartItemsHTML}
        </div>
        
        ${cartItems.length > 0 ? `
        ${paymentSelection}
        <div class="cart-footer">
          <div class="cart-total-row">
            <span>Total:</span>
            <div style="text-align: right;">
              <div>MWK ${totalPriceMWK.toLocaleString()}</div>
              <span style="font-size: 0.85rem; color: var(--color-accent);">$${totalPriceUSD.toFixed(2)} USD</span>
            </div>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${selectedMobileMoney ? `
              <button class="btn btn-primary checkout-btn" id="checkout-btn" type="button">
                Pay with ${selectedMobileMoney}
                <i data-lucide="credit-card"></i>
              </button>
              <button class="btn btn-secondary" type="button" data-confirm-mobile-payment="true">Confirm Payment</button>
            ` : `
              <p style="font-size: 0.85rem; color: var(--color-text-muted); text-align: center; width: 100%; padding: 8px 0;">
                <i data-lucide="arrow-up" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
                Select a payment method above to proceed
              </p>
            `}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}
