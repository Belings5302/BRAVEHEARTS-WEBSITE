// Login & Account Component

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatStatus(status) {
  return String(status || 'pending').replace(/_/g, ' ');
}

function getOrderStatusStyle(status) {
  if (status === 'paid') return { bg: 'rgba(46, 213, 115, 0.15)', color: '#2ed573' };
  if (status === 'shipped') return { bg: 'rgba(30, 144, 255, 0.15)', color: '#1e90ff' };
  if (status === 'cancelled') return { bg: 'rgba(255, 71, 87, 0.15)', color: '#ff4757' };
  return { bg: 'rgba(255, 165, 0, 0.15)', color: '#ffa500' };
}

export function renderLogin(user, mode = 'login', subscriptionPaid = false, orders = [], resetMode = false, resetError = null, profile = null, selectedOrder = null, players = [], resetToken = '') {
  if (user) {
    const recentOrders = orders.slice(0, 5);
    const paidOrders = orders.filter(order => order.status === 'paid');
    const totalSpent = paidOrders.reduce((sum, order) => sum + Number(order.total_mwk || 0), 0);
    const latestOrder = orders[0];
    const displayName = String(profile?.name || '').trim() || String(user || '').split('@')[0] || 'Member';
    const profilePhotoUrl = profile?.profile_photo_url || '';
    const avatarContent = profilePhotoUrl ? `<img src="${profilePhotoUrl}" alt="${displayName}">` : `<i data-lucide="user"></i>`;
    const favoriteTeam = profile?.favorite_team || '';
    const favoritePlayer = profile?.favorite_player || '';
    const normalizeTeam = value => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'women') return 'ladies';
      return normalized;
    };
    const teamPlayers = favoriteTeam ? players.filter(player => normalizeTeam(player.team) === normalizeTeam(favoriteTeam)) : [];
    const membershipExpiresAt = profile?.membership_expires_at || null;
    const subscriptionLabel = subscriptionPaid ? 'Active Member' : 'Payment Pending';
    const subscriptionTone = subscriptionPaid
      ? { bg: 'rgba(46, 213, 115, 0.15)', color: '#2ed573' }
      : { bg: 'rgba(255, 71, 87, 0.15)', color: '#ff4757' };

    const ordersHTML = recentOrders.length === 0
      ? `
        <div class="account-empty-state">
          <i data-lucide="shopping-bag"></i>
          <p>No recent orders yet.</p>
          <a class="btn btn-secondary btn-sm" href="#/fanzone">Visit Fan Zone</a>
        </div>
      `
      : `
        <div class="account-orders-list">
          ${recentOrders.map(order => {
            const statusStyle = getOrderStatusStyle(order.status);
            return `
              <article class="account-order-item" data-account-order-id="${order.id}">
                <div>
                  <strong>${order.reference}</strong>
                  <span>${formatDate(order.created_at)} • ${order.payment_method || 'Payment'}</span>
                </div>
                <div class="account-order-side">
                  <strong>MWK ${Number(order.total_mwk || 0).toLocaleString()}</strong>
                  <span style="background:${statusStyle.bg};color:${statusStyle.color};">${formatStatus(order.status)}</span>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      `;

    return `
      <section class="login-sec" id="login">
        <div class="section-container">
          <div class="section-header account-header">
            <span class="section-tagline">Member Access</span>
            <h2 class="section-title text-gradient-green">My Account</h2>
            <p class="section-desc">Manage your profile, membership, orders, and account security.</p>
          </div>

          <div class="account-dashboard-grid">
            <article class="account-card account-profile-card glass">
              <div class="account-card-title-row">
                <div>
                  <span class="account-kicker">Profile summary</span>
                  <h3>Welcome back, ${displayName}</h3>
                </div>
                <button class="account-avatar account-avatar-button" type="button" data-profile-photo-trigger="true" aria-label="View or change profile photo">
                  ${avatarContent}
                  <span class="account-avatar-edit-badge"><i data-lucide="camera"></i></span>
                </button>
              </div>
              <form class="account-profile-form" data-account-profile-form="true">
                <input class="login-input" type="hidden" name="profile_photo_url" value="${profilePhotoUrl}" />
                <input class="account-hidden-file" type="file" name="profile_photo_file" accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.avif,.ico" />
                <div class="account-form-row">
                  <select class="login-input" name="favorite_team" data-favorite-team-select="true">
                    <option value="" ${!favoriteTeam ? 'selected' : ''}>Choose favourite team</option>
                    <option value="men" ${favoriteTeam === 'men' ? 'selected' : ''}>BH Men</option>
                    <option value="ladies" ${favoriteTeam === 'ladies' ? 'selected' : ''}>BH Ladies</option>
                    <option value="boys" ${favoriteTeam === 'boys' ? 'selected' : ''}>BH Boys</option>
                    <option value="girls" ${favoriteTeam === 'girls' ? 'selected' : ''}>BH Girls</option>
                  </select>
                  <select class="login-input" name="favorite_player" ${favoriteTeam && teamPlayers.length ? '' : 'disabled'} data-favorite-player-select="true">
                    <option value="" ${!favoritePlayer ? 'selected' : ''}>${favoriteTeam ? (teamPlayers.length ? 'Choose favourite player' : 'No roster players found') : 'Select team first'}</option>
                    ${teamPlayers.map(player => `<option value="${player.name}" ${favoritePlayer === player.name ? 'selected' : ''}>${player.name}</option>`).join('')}
                  </select>
                </div>
                <button class="btn btn-secondary btn-sm" type="submit">Save Profile</button>
              </form>
              <div class="account-mini-stats">
                <div>
                  <span>Orders</span>
                  <strong>${orders.length}</strong>
                </div>
                <div>
                  <span>Paid total</span>
                  <strong>MWK ${totalSpent.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Latest order</span>
                  <strong>${latestOrder ? formatDate(latestOrder.created_at) : '—'}</strong>
                </div>
              </div>
            </article>

            <article class="account-card glass">
              <div class="account-card-title-row">
                <div>
                  <span class="account-kicker">Membership</span>
                  <h3>Subscription status</h3>
                </div>
                <span class="account-status-pill" style="background:${subscriptionTone.bg};color:${subscriptionTone.color};">${subscriptionLabel}</span>
              </div>
              <p class="account-card-copy">
                ${subscriptionPaid
                  ? 'Your annual Bravehearts membership is active. Thank you for supporting the club.'
                  : 'Complete your annual subscription to activate member benefits and support the club.'}
              </p>
              <div class="account-expiry"><span>Expiry date</span><strong>${membershipExpiresAt ? formatDate(membershipExpiresAt) : 'Not active yet'}</strong></div>
              ${subscriptionPaid ? `
                <a class="btn btn-secondary btn-sm account-card-action" href="#/fanzone">View Fan Zone</a>
              ` : `
                <button class="btn btn-secondary btn-sm account-card-action" type="button" data-pay-subscription="true">Pay Fee (MWK 15,000)</button>
              `}
            </article>

            <article class="account-card account-orders-card glass">
              <div class="account-card-title-row">
                <div>
                  <span class="account-kicker">Purchase history</span>
                  <h3>Recent orders</h3>
                </div>
                <span class="account-count-pill">${recentOrders.length} shown</span>
              </div>
              ${ordersHTML}
              ${selectedOrder ? `
                <div class="account-order-detail">
                  <div class="account-card-title-row">
                    <div>
                      <span class="account-kicker">Order detail</span>
                      <h3>${selectedOrder.reference}</h3>
                    </div>
                    <button class="btn btn-secondary btn-sm" type="button" data-close-order-detail="true">Close</button>
                  </div>
                  ${(selectedOrder.items || []).map(item => `
                    <div class="account-detail-item">
                      <span>${item.title}</span>
                      <strong>${item.quantity} × MWK ${Number(item.unit_price_mwk || 0).toLocaleString()}</strong>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </article>

            <article class="account-card glass">
              <div class="account-card-title-row">
                <div>
                  <span class="account-kicker">Preferences</span>
                  <h3>Notifications</h3>
                </div>
                <i data-lucide="bell" class="account-title-icon"></i>
              </div>
              <form class="account-preferences-form" data-account-preferences-form="true">
                ${[['notify_game_reminders','Game reminders'], ['notify_live_scores','Live scores'], ['notify_news','News updates'], ['notify_merch','Merch promotions']].map(([key,label]) => `
                  <label><input type="checkbox" name="${key}" ${profile?.[key] !== false ? 'checked' : ''}> ${label}</label>
                `).join('')}
                <button class="btn btn-secondary btn-sm" type="submit">Save Preferences</button>
              </form>
            </article>

            <article class="account-card glass">
              <div class="account-card-title-row">
                <div>
                  <span class="account-kicker">Security</span>
                  <h3>Account actions</h3>
                </div>
                <i data-lucide="shield-check" class="account-title-icon"></i>
              </div>
              <div class="account-actions-stack">
                <button class="btn btn-secondary" type="button" data-account-change-password="true">Change Password</button>
                <button class="btn btn-primary" type="button" data-logout="true">Logout</button>
              </div>
            </article>
          </div>
        </div>
      </section>
    `;
  }

  if (resetMode) {
    return `
      <section class="login-sec" id="login">
        <div class="section-container">
          <div class="section-header" style="text-align: center; margin-bottom: 40px;">
            <span class="section-tagline">Secure Access</span>
            <h2 class="section-title text-gradient-green">Reset Password</h2>
            <p class="section-desc" style="max-width: 600px; margin: 0 auto;">Enter your new password below.</p>
          </div>

          <div class="login-card glass" style="margin: 0 auto;">
            <form id="login-form">
              <input type="hidden" name="reset_mode" value="true" />

              <label class="login-label" for="password">New Password</label>
              <input class="login-input" type="password" name="password" id="password" placeholder="Enter new password" required minlength="6" />

              <label class="login-label" for="confirm_password">Confirm New Password</label>
              <input class="login-input" type="password" name="confirm_password" id="confirm_password" placeholder="Confirm new password" required minlength="6" />

              <input type="hidden" name="reset_token" id="reset_token" value="${resetToken}" />

              ${resetError ? `<p style="color: #ff4757; font-size: 0.9rem; margin-top: 8px;">${resetError}</p>` : ''}

              <button class="btn btn-primary" type="submit" style="width: 100%; margin-top: 10px;">Reset Password</button>
            </form>
          </div>
        </div>
      </section>
    `;
  }

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const loginLabel = isRegister ? 'Create Account' : isForgot ? 'Reset Password' : 'Member Login';
  const loginSubtitle = isRegister ? 'Register with Bravehearts and join the club as an official member.' : isForgot ? 'Enter your email address and we will send you a reset link.' : 'Access your Bravehearts member profile, track team updates, and manage your account.';
  const submitText = isRegister ? 'Create Account' : isForgot ? 'Send Reset Link' : 'Sign In';

  return `
    <section class="login-sec" id="login">
      <div class="section-container">
        <div class="section-header" style="text-align: center; margin-bottom: 40px;">
          <span class="section-tagline">Secure Access</span>
          <h2 class="section-title text-gradient-green">${loginLabel}</h2>
          <p class="section-desc" style="max-width: 600px; margin: 0 auto;">${loginSubtitle}</p>
        </div>

        <div class="login-card glass auth-card" style="margin: 0 auto;">
          <div class="auth-toggle" role="tablist" aria-label="Account access options">
            <button type="button" class="auth-switch-btn ${!isRegister && !isForgot ? 'active' : ''}" data-auth-mode="login">Sign In</button>
            <button type="button" class="auth-switch-btn ${isRegister ? 'active' : ''}" data-auth-mode="register">Create Account</button>
          </div>

          ${isForgot ? `
            <div class="auth-help-panel">
              <i data-lucide="mail-check"></i>
              <div>
                <strong>Reset your password</strong>
                <span>Enter the email linked to your Bravehearts account. If it exists, we will send reset instructions.</span>
              </div>
            </div>
          ` : ''}

          <form id="login-form">
            ${isRegister ? `
              <label class="login-label" for="name">Full name</label>
              <input class="login-input" type="text" name="name" id="name" placeholder="Your full name" autocomplete="name" required />
            ` : ''}

            <label class="login-label" for="email">Email address</label>
            <input class="login-input" type="email" name="email" id="email" placeholder="you@example.com" autocomplete="email" required />

            ${!isForgot ? `
              <div class="password-label-row">
                <label class="login-label" for="password">Password</label>
                ${!isRegister ? `<a href="#/login" class="auth-text-link" data-auth-mode="forgot">Forgot password?</a>` : ''}
              </div>
              <input class="login-input" type="password" name="password" id="password" placeholder="Enter your password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" required minlength="6" />
            ` : ''}

            ${isRegister ? `
              <label class="login-label" for="confirm_password">Confirm password</label>
              <input class="login-input" type="password" name="confirm_password" id="confirm_password" placeholder="Confirm your password" autocomplete="new-password" required minlength="6" />
            ` : ''}

            <button class="btn btn-primary" type="submit" style="width: 100%; margin-top: 10px;">${submitText}</button>
          </form>

          ${!isForgot ? `
            <div class="auth-divider"><span>or</span></div>
            <div class="google-signin-container" data-google-signin-container="true">
              <button class="btn google-signin-btn" type="button" data-google-signin="true">
                <span class="google-g-mark">G</span>
                Continue with Google
              </button>
            </div>
          ` : ''}

          <p class="auth-bottom-note">
            ${isRegister
              ? `Already have an account? <a href="#/login" class="auth-text-link" data-auth-mode="login">Sign in</a>`
              : isForgot
                ? `Remembered your password? <a href="#/login" class="auth-text-link" data-auth-mode="login">Back to sign in</a>`
                : `New to Bravehearts? <a href="#/login" class="auth-text-link" data-auth-mode="register">Create an account</a>`}
          </p>
        </div>
      </div>
    </section>
  `;
}
