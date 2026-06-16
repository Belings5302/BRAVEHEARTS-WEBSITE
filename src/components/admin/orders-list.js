// Admin Orders Management Component

export function renderOrdersList(orders = [], currentFilter = 'all') {
  return `
    <div class="admin-orders">
      <div class="section-header" style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 class="section-title">Orders Management</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">View and manage all customer orders</p>
        </div>
        <button class="btn btn-secondary btn-sm export-report-btn" data-type="sales" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export Orders CSV
        </button>
      </div>


      <!-- Filters -->
      <div class="filters-bar" style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="filter-btn ${currentFilter === 'all' ? 'filter-btn-active' : ''}" data-filter="all">All Orders</button>
        <button class="filter-btn ${currentFilter === 'paid' ? 'filter-btn-active' : ''}" data-filter="paid">Paid</button>
        <button class="filter-btn ${currentFilter === 'pending' ? 'filter-btn-active' : ''}" data-filter="pending">Pending</button>
        <button class="filter-btn ${currentFilter === 'shipped' ? 'filter-btn-active' : ''}" data-filter="shipped">Shipped</button>
        <button class="filter-btn ${currentFilter === 'cancelled' ? 'filter-btn-active' : ''}" data-filter="cancelled">Cancelled</button>
      </div>

      <!-- Orders Table -->
      <div class="orders-table-container">
        ${orders.length > 0 ? `
          <table class="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr class="order-row" data-order-id="${order.id}">
                  <td><strong>${order.reference}</strong></td>
                  <td>
                    <div>${order.name}</div>
                    <div style="font-size: 0.85rem; color: var(--color-text-muted);">${order.email}</div>
                  </td>
                  <td>
                    <div>MWK ${order.total_mwk?.toLocaleString() || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--color-accent);">$${order.total_usd?.toFixed(2) || '0.00'}</div>
                  </td>
                  <td>
                    <span style="font-size: 0.9rem; color: var(--color-text-secondary);">
                      ${order.payment_method === 'mobile_money' ? '📱 Mobile Money' : 'Credit Card'}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span>
                  </td>
                  <td style="font-size: 0.9rem; color: var(--color-text-muted);">
                    ${new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button class="btn-action view-order-btn" data-order-id="${order.id}" title="View Details">
                      <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">
            <i data-lucide="inbox" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
            <p>No orders found</p>
          </div>
        `}
      </div>
    </div>
  `;
}

export function renderOrderDetail(order) {
  if (!order) {
    return `
      <div class="admin-orders">
        <div style="text-align: center; padding: 40px; color: var(--color-text-muted);">
          <p>Order not found</p>
        </div>
      </div>
    `;
  }

  const { reference, status, total_mwk, total_usd, payment_method, mobile_money_number, created_at, name, email, items } = order;

  return `
    <div class="admin-orders">
      <div class="section-header" style="margin-bottom: 30px; align-items: flex-start;">
        <div style="flex: 1;">
          <button class="back-button" id="back-to-orders" style="margin-bottom: 12px; background: none; border: none; color: var(--color-accent); cursor: pointer; font-weight: 600;">← Back to Orders</button>
          <h2 class="section-title">Order ${reference}</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">Created on ${new Date(created_at).toLocaleString()}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <!-- Order Info -->
        <div class="info-card glass">
          <h3 class="info-title">Order Information</h3>
          <div class="info-row">
            <label>Status</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
              <span class="status-badge status-${status}">${status.toUpperCase()}</span>
              <select id="status-select" class="form-input" style="flex: 1; max-width: 150px;">
                <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="paid" ${status === 'paid' ? 'selected' : ''}>Paid</option>
                <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
              <button id="update-status-btn" class="btn btn-primary btn-sm">Update</button>
            </div>
          </div>
          <div class="info-row">
            <label>Total Amount</label>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--color-accent); margin-top: 8px;">
              MWK ${total_mwk?.toLocaleString() || 0} / $${total_usd?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div class="info-row">
            <label>Payment Method</label>
            <p style="margin-top: 8px; color: var(--color-text-secondary);">
              ${payment_method === 'mobile_money' ? '📱 Mobile Money' : 'Credit Card'}
              ${mobile_money_number ? ` (${mobile_money_number})` : ''}
            </p>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="info-card glass">
          <h3 class="info-title">Customer Information</h3>
          <div class="info-row">
            <label>Name</label>
            <p style="margin-top: 8px; color: var(--color-text-secondary);">${name}</p>
          </div>
          <div class="info-row">
            <label>Email</label>
            <p style="margin-top: 8px; color: var(--color-text-secondary);">${email}</p>
          </div>
        </div>
      </div>

      <!-- Order Items -->
      <div style="margin-top: 30px;">
        <h3 class="section-title" style="margin-bottom: 16px;">Items</h3>
        <div class="items-table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items?.map(item => `
                <tr>
                  <td><strong>${item.title}</strong></td>
                  <td>${item.quantity}</td>
                  <td>
                    <div>MWK ${item.price_mwk?.toLocaleString() || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--color-text-muted);">$${item.price_usd?.toFixed(2) || '0.00'}</div>
                  </td>
                  <td>
                    <div>MWK ${(item.quantity * (item.price_mwk || 0))?.toLocaleString() || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--color-text-muted);">$${(item.quantity * (item.price_usd || 0))?.toFixed(2) || '0.00'}</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

