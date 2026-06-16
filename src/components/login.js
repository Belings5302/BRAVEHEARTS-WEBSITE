// Login & Account Component

export function renderLogin(user, mode = 'login', subscriptionPaid = false, orders = [], resetMode = false, resetError = null) {
  if (user) {
    const ordersHTML = orders.length === 0
      ? `
        <p style="color: var(--color-text-muted); font-size: 0.95rem; text-align: center; padding: 30px 0;">You have not placed any shop orders yet.</p>
      `
      : `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; color: var(--color-text-secondary);">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-glass); color: var(--color-text-muted); font-weight: 600;">
                <th style="padding: 12px 10px;">Order Ref</th>
                <th style="padding: 12px 10px;">Date</th>
                <th style="padding: 12px 10px;">Amount (MWK)</th>
                <th style="padding: 12px 10px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => {
                let statusBg = 'rgba(255, 165, 0, 0.15)';
                let statusColor = '#ffa500';
                if (o.status === 'paid') {
                  statusBg = 'rgba(46, 213, 115, 0.15)';
                  statusColor = '#2ed573';
                } else if (o.status === 'shipped') {
                  statusBg = 'rgba(30, 144, 255, 0.15)';
                  statusColor = '#1e90ff';
                } else if (o.status === 'cancelled') {
                  statusBg = 'rgba(255, 71, 87, 0.15)';
                  statusColor = '#ff4757';
                }
                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 14px 10px; font-weight: 700; color: #fff;">${o.reference}</td>
                    <td style="padding: 14px 10px;">${new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style="padding: 14px 10px; font-weight: 600;">MWK ${o.total_mwk.toLocaleString()}</td>
                    <td style="padding: 14px 10px; text-align: center;">
                      <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; background: ${statusBg}; color: ${statusColor};">
                        ${o.status}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

    return `
      <section class="login-sec" id="login">
        <div class="section-container">
          <div class="section-header" style="margin-bottom: 40px; text-align: center;">
            <span class="section-tagline">Member Access</span>
            <h2 class="section-title text-gradient-green">Account Dashboard</h2>
            <p class="section-desc" style="max-width: 600px; margin: 0 auto;">Manage your profile, pay your annual subscription, and view your purchase history.</p>
          </div>

          <div class="account-dashboard-grid" style="display: grid; grid-template-columns: 1fr; gap: 30px; max-width: 1100px; margin: 0 auto;">
            <!-- Welcome Card -->
            <div class="login-card glass" style="padding: 24px; border-radius: 16px; border: 1px solid var(--border-glass); height: fit-content; text-align: left; max-width: 100%;">
              <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.4rem; color: #fff; margin-bottom: 20px;">Profile Info</h3>
              <p style="font-size: 0.95rem; margin-bottom: 16px; color: var(--color-text-secondary);">Signed in as: <strong style="color: #fff;">${user}</strong></p>
              
              <div class="subscription-summary" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 10px; font-size: 0.9rem; color: var(--color-text-muted); font-weight: 600;">Annual Membership Status:</p>
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                  <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; background: ${subscriptionPaid ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)'}; color: ${subscriptionPaid ? '#2ed573' : '#ff4757'};">
                    ${subscriptionPaid ? 'Active Member' : 'Payment Pending'}
                  </span>
                  ${subscriptionPaid ? '' : `<button class="btn btn-secondary btn-sm" type="button" data-pay-subscription="true">Pay Fee (MWK 15,000)</button>`}
                </div>
              </div>
              <button class="btn btn-primary" data-logout="true" style="width: 100%;">Logout</button>
            </div>

            <!-- Order History Card -->
            <div class="login-card glass" style="padding: 24px; border-radius: 16px; border: 1px solid var(--border-glass); text-align: left; max-width: 100%;">
              <h3 style="margin-top:0; font-family: var(--font-headings); font-size: 1.4rem; border-left: 4px solid var(--color-accent); padding-left: 12px; color: #fff; margin-bottom: 20px;">Your Orders</h3>
              ${ordersHTML}
            </div>
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

              <input type="hidden" name="reset_token" id="reset_token" value="" />

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
