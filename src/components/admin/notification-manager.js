// Notification Manager (Admin)

export function renderNotificationManager(notifications = [], users = [], isSuperAdmin = false) {
  const notificationsHTML = notifications.length === 0
    ? `<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No announcement logs found.</td></tr>`
    : notifications.map(n => `
      <tr>
        <td style="padding: 12px; font-weight: 700; color: var(--color-text-primary);">${n.title}</td>
        <td style="padding: 12px; font-size: 0.9rem; color: var(--color-text-secondary); max-width: 300px; word-break: break-all;">${n.message}</td>
        <td style="padding: 12px; color: var(--color-text-primary);">${n.user_id ? `User ID: ${n.user_id}` : 'Global Broadcast'}</td>
        <td style="padding: 12px; color: var(--color-text-primary);">${new Date(n.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

  const userOptionsHTML = users.map(u => `
    <option value="${u.id}">${u.name} (${u.email})</option>
  `).join('');

  return `
    <div class="notification-manager-container admin-manager-page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 12px;">
        <h2 style="font-family: var(--font-headings); font-size: 2rem; color: var(--color-text-primary); margin:0;">Notification Broadcast Center</h2>
        <span style="font-size: 0.85rem; color: var(--color-text-primary); background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 4px;">Role: ${isSuperAdmin ? 'Super Admin' : 'Editor (Restricted)'}</span>
      </div>

      <!-- Broadcast Form -->
      <div class="login-card glass" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; margin-bottom: 30px; max-width: 100%;">
          <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: var(--color-text-primary); margin-bottom: 20px;">Send Announcement Alert</h3>
        <form id="announcement-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <label class="login-label" for="announcement-title" style="margin-bottom: 6px;">Alert Title</label>
              <input class="login-input" type="text" id="announcement-title" placeholder="e.g. Next Match Location Shift" required style="width: 100%;" />
            </div>
            <div>
              <label class="login-label" for="announcement-user" style="margin-bottom: 6px;">Target Recipient</label>
              <select class="login-input" id="announcement-user" style="width: 100%; background: var(--bg-card); color: var(--color-text-primary); border: 1px solid var(--border-glass);" required>
                <option value="global">All Registered Users (Global Broadcast)</option>
                ${userOptionsHTML}
              </select>
            </div>
          </div>
          <div style="margin-bottom: 20px;">
            <label class="login-label" for="announcement-message" style="margin-bottom: 6px;">Message Body</label>
            <textarea class="login-input" id="announcement-message" placeholder="Type your warning or announcement message here..." required style="width: 100%; min-height: 80px; font-family: inherit; line-height: 1.6; resize: vertical;"></textarea>
          </div>
          <button class="btn btn-primary" type="submit" style="width: 100%;">Broadcast Announcement</button>
        </form>
      </div>

      <!-- Broadcast History -->
      <div class="login-card glass" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: left; max-width: 100%;">
        <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.3rem; color: var(--color-text-primary); margin-bottom: 20px; border-left: 4px solid var(--color-accent); padding-left: 12px;">Broadcast History</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; min-width: 640px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted);">
                <th style="padding: 12px; width: 25%; color: var(--color-text-secondary);">Title</th>
                <th style="padding: 12px; width: 45%; color: var(--color-text-secondary);">Message</th>
                <th style="padding: 12px; width: 15%; color: var(--color-text-secondary);">Target</th>
                <th style="padding: 12px; width: 15%; color: var(--color-text-secondary);">Date</th>
              </tr>
            </thead>
            <tbody>
              ${notificationsHTML}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
