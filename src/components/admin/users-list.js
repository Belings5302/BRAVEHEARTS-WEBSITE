// Admin Users Management Component

export function renderUsersList(users = [], isSuperAdmin = false) {
  return `
    <div class="admin-users">
      <div class="section-header" style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 class="section-title">Users Management</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">View and manage user accounts and subscriptions</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <span class="stat-pill">Total: <strong>${users.length}</strong></span>
          <span class="stat-pill">Active: <strong>${users.filter(u => u.subscription_status === 'active').length}</strong></span>
          <span class="stat-pill" style="background: rgba(239, 68, 68, 0.1);">Banned: <strong>${users.filter(u => u.is_banned).length}</strong></span>
          <button class="btn btn-secondary btn-sm export-report-btn" data-type="users" style="display: flex; align-items: center; gap: 6px; cursor: pointer; height: 38px;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export Users CSV
          </button>
        </div>
      </div>


      <!-- Users Table -->
      <div class="users-table-container">
        ${users.length > 0 ? `
          <table class="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Subscription</th>
                <th>Member Since</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(user => `
                <tr class="user-row" data-user-id="${user.id}">
                  <td><strong>${user.name}</strong></td>
                  <td style="color: var(--color-text-secondary); font-size: 0.9rem;">${user.email}</td>
                  <td>
                    ${user.is_banned ? `
                      <span class="status-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Banned</span>
                    ` : `
                      <span class="status-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Active</span>
                    `}
                  </td>
                  <td>
                    <span class="subscription-badge subscription-${user.subscription_status}">
                      ${user.subscription_status.charAt(0).toUpperCase() + user.subscription_status.slice(1)}
                    </span>
                  </td>
                  <td style="color: var(--color-text-secondary); font-size: 0.9rem;">
                    ${new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <button class="btn-action view-user-btn" data-user-id="${user.id}" title="View Details">
                        <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                      </button>
                      <button class="btn btn-sm toggle-ban-btn" data-user-id="${user.id}" data-is-banned="${user.is_banned ? 'true' : 'false'}" style="padding: 4px 8px; font-size: 0.8rem; height: 28px; min-height: auto; border: none; cursor: pointer; color: #fff; background: ${user.is_banned ? '#10b981' : '#ef4444'};">
                        ${user.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">
            <i data-lucide="users" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
            <p>No users found</p>
          </div>
        `}
      </div>
    </div>
  `;
}

export function renderUserDetail(user) {
  if (!user) {
    return `
      <div class="admin-users">
        <div style="text-align: center; padding: 40px; color: var(--color-text-muted);">
          <p>User not found</p>
        </div>
      </div>
    `;
  }

  const { id, name, email, subscription_status, is_banned, created_at, updated_at, subscriptions } = user;

  return `
    <div class="admin-users">
      <div class="section-header" style="margin-bottom: 30px; align-items: flex-start;">
        <div style="flex: 1;">
          <button class="back-button" id="back-to-users" style="margin-bottom: 12px; background: none; border: none; color: var(--color-accent); cursor: pointer; font-weight: 600;">← Back to Users</button>
          <h2 class="section-title">${name}</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">${email}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <!-- User Info -->
        <div class="info-card glass">
          <h3 class="info-title">Account Information</h3>
          
          <div class="info-row" style="margin-bottom: 16px;">
            <label>Ban Status</label>
            <div style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">
              <span class="status-badge" style="background: ${is_banned ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${is_banned ? '#ef4444' : '#10b981'}; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 0.85rem;">
                ${is_banned ? 'BANNED' : 'ACTIVE'}
              </span>
              <button id="detail-toggle-ban-btn" data-user-id="${id}" data-is-banned="${is_banned ? 'true' : 'false'}" class="btn" style="padding: 6px 12px; font-size: 0.85rem; border: none; cursor: pointer; color: white; background: ${is_banned ? '#10b981' : '#ef4444'};">
                ${is_banned ? 'Unban User' : 'Ban User'}
              </button>
            </div>
          </div>

          <div class="info-row">
            <label>Subscription Status</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
              <span class="subscription-badge subscription-${subscription_status}">
                ${subscription_status.charAt(0).toUpperCase() + subscription_status.slice(1)}
              </span>
              <select id="subscription-select" class="form-input" style="flex: 1; max-width: 150px;">
                <option value="active" ${subscription_status === 'active' ? 'selected' : ''}>Active</option>
                <option value="inactive" ${subscription_status === 'inactive' ? 'selected' : ''}>Inactive</option>
                <option value="expired" ${subscription_status === 'expired' ? 'selected' : ''}>Expired</option>
              </select>
              <button id="update-subscription-btn" class="btn btn-primary btn-sm">Update</button>
            </div>
          </div>
          <div class="info-row">
            <label>Member Since</label>
            <p style="margin-top: 8px; color: var(--color-text-secondary);">
              ${new Date(created_at).toLocaleString()}
            </p>
          </div>
          <div class="info-row">
            <label>Last Updated</label>
            <p style="margin-top: 8px; color: var(--color-text-secondary);">
              ${new Date(updated_at).toLocaleString()}
            </p>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="info-card glass">
          <h3 class="info-title">Contact Information</h3>
          <div class="info-row">
            <label>Email</label>
            <p style="margin-top: 8px; color: var(--color-text-secondary); word-break: break-all;">${email}</p>
          </div>
          <div class="info-row">
            <label>User ID</label>
            <p style="margin-top: 8px; color: var(--color-text-secondary); font-family: monospace; font-size: 0.9rem;">${id}</p>
          </div>
        </div>
      </div>

      <!-- Subscriptions -->
      ${subscriptions && subscriptions.length > 0 ? `
        <div style="margin-top: 30px;">
          <h3 class="section-title" style="margin-bottom: 16px;">Active Subscriptions</h3>
          <div class="subscriptions-table-container">
            <table class="subscriptions-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                ${subscriptions.map(sub => `
                  <tr>
                    <td><strong>${sub.title}</strong></td>
                    <td>
                      <span class="status-badge status-${sub.status}">${sub.status.toUpperCase()}</span>
                    </td>
                    <td style="color: var(--color-text-secondary); font-size: 0.9rem;">
                      ${new Date(sub.started_at).toLocaleDateString()}
                    </td>
                    <td style="color: var(--color-text-secondary); font-size: 0.9rem;">
                      ${new Date(sub.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div style="margin-top: 30px; padding: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(30,255,0,0.15); border-radius: 8px; text-align: center; color: var(--color-text-secondary);">
          No active subscriptions
        </div>
      `}
    </div>
  `;
}

