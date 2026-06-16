// Admin Dashboard Component

export function renderAdminDashboard(stats = {}) {
  const revenue = stats.revenue || { mwk: 0, usd: 0 };
  const orderStats = stats.orderStats || {};
  const userCount = stats.userCount || 0;
  const activeSubscriptions = stats.activeSubscriptions || 0;
  const recentOrders = stats.recentOrders || [];

  const totalOrders = Object.values(orderStats).reduce((sum, val) => sum + (val || 0), 0);
  const paidOrders = orderStats.paid || 0;
  const pendingOrders = orderStats.pending || 0;

  return `
    <div class="admin-dashboard" style="animation: fadeIn 0.4s ease-out;">
      <div class="dashboard-header" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 class="dashboard-title">Dashboard</h2>
          <p class="dashboard-subtitle">Welcome to Bravehearts Admin Portal</p>
        </div>
        <div class="quick-actions" style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm export-report-btn" data-type="sales" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export Sales CSV
          </button>
          <button class="btn btn-secondary btn-sm export-report-btn" data-type="games" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export Schedule CSV
          </button>
          <button class="btn btn-secondary btn-sm export-report-btn" data-type="users" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export Users CSV
          </button>
        </div>
      </div>


      <div class="analytics-tiles-grid">
        <!-- Tile 1: Total Revenue -->
        <div class="analytics-tile tile-span-3 tile-glow-green">
          <div class="tile-header">
            <span class="tile-title">Total Revenue</span>
            <div class="tile-icon-wrapper green">
              <i data-lucide="trending-up" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            <div class="tile-value">MWK ${revenue.mwk?.toLocaleString() || 0}</div>
            <div class="tile-meta">
              <i data-lucide="dollar-sign" style="width: 14px; height: 14px; color: var(--color-accent);"></i>
              <span>$${revenue.usd?.toFixed(2) || '0.00'} USD</span>
            </div>
          </div>
        </div>

        <!-- Tile 2: Total Orders -->
        <div class="analytics-tile tile-span-3 tile-glow-blue">
          <div class="tile-header">
            <span class="tile-title">Total Orders</span>
            <div class="tile-icon-wrapper blue">
              <i data-lucide="shopping-cart" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            <div class="tile-value">${totalOrders}</div>
            <div class="tile-meta">
              <i data-lucide="check-circle-2" style="width: 14px; height: 14px; color: #64c8ff;"></i>
              <span>${paidOrders} paid, ${pendingOrders} pending</span>
            </div>
          </div>
        </div>

        <!-- Tile 3: Total Users -->
        <div class="analytics-tile tile-span-3 tile-glow-orange">
          <div class="tile-header">
            <span class="tile-title">Total Users</span>
            <div class="tile-icon-wrapper orange">
              <i data-lucide="users" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            <div class="tile-value">${userCount}</div>
            <div class="tile-meta">
              <i data-lucide="award" style="width: 14px; height: 14px; color: #ff9664;"></i>
              <span>Active members</span>
            </div>
          </div>
        </div>

        <!-- Tile 4: Active Subscriptions -->
        <div class="analytics-tile tile-span-3 tile-glow-purple">
          <div class="tile-header">
            <span class="tile-title">Active Subscriptions</span>
            <div class="tile-icon-wrapper purple">
              <i data-lucide="award" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            <div class="tile-value">${activeSubscriptions}</div>
            <div class="tile-meta">
              <i data-lucide="refresh-cw" style="width: 14px; height: 14px; color: #c864ff;"></i>
              <span>Recurring members</span>
            </div>
          </div>
        </div>

        <!-- Tile 5: Recent Orders Table -->
        <div class="analytics-tile tile-span-12">
          <div class="tile-header" style="margin-bottom: 24px;">
            <span class="tile-title">Recent Orders</span>
            <a href="#/admin/orders" class="link-button" style="font-size: 0.85rem; display: flex; align-items: center; gap: 4px;">
              <span>View all</span>
              <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
            </a>
          </div>
          <div class="tile-content">
            <div class="orders-table-container">
              ${recentOrders.length > 0 ? `
                <table class="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentOrders.map(order => `
                      <tr class="order-row">
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
                          <span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span>
                        </td>
                        <td style="font-size: 0.9rem; color: var(--color-text-muted);">
                          ${new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="empty-state" style="padding: 40px 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <i data-lucide="inbox" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                  <p>No orders yet</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
