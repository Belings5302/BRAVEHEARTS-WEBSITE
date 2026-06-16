// Admin Login Component

export function renderAdminLogin(mode = 'login', resetError = null, resetToken = '') {
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';

  const title = isReset ? 'Reset Admin Password' : isForgot ? 'Forgot Admin Password' : 'Bravehearts Admin Portal';
  const subtitle = isReset ? 'Enter your new password below.' : isForgot ? 'Enter your admin email address and we will send you a reset link.' : 'Manage orders, products, and club operations';
  const submitText = isReset ? 'Reset Password' : isForgot ? 'Send Reset Link' : 'Sign In';
  const showEmail = !isReset;
  const showPassword = !isForgot;

  return `
    <section class="admin-login-sec" id="admin-login">
      <div class="admin-login-container">
        <div class="admin-login-card glass">
          <div class="admin-login-header">
            <h1 class="admin-login-title">${title}</h1>
            <p class="admin-login-subtitle">${subtitle}</p>
          </div>

          <form id="admin-login-form">
            <input type="hidden" name="admin_auth_mode" id="admin-auth-mode" value="${mode}" />

            ${showEmail ? `
              <div class="form-group">
                <label class="form-label" for="admin-email">Email Address</label>
                <input class="form-input" type="email" name="email" id="admin-email" placeholder="admin@bravehearts.mw" ${showEmail ? 'required' : ''} />
              </div>
            ` : ''}

            ${showPassword ? `
              <div class="form-group">
                <label class="form-label" for="admin-password">Password</label>
                <input class="form-input" type="password" name="password" id="admin-password" placeholder="Enter your password" ${showPassword ? 'required' : ''} />
              </div>
            ` : ''}

            ${isReset ? `
              <div class="form-group">
                <label class="form-label" for="admin-new-password">New Password</label>
                <input class="form-input" type="password" name="newPassword" id="admin-new-password" placeholder="Enter new password" required minlength="6" />
              </div>
              <input type="hidden" name="reset_token" id="admin-reset-token" value="${resetToken}" />
            ` : ''}

            ${resetError ? `<p style="color: #ff4757; font-size: 0.9rem; margin-top: 8px;">${resetError}</p>` : ''}

            <button class="btn btn-primary btn-block" type="submit">${submitText}</button>
          </form>

          ${!isReset && !isForgot ? `
            <div class="admin-login-footer">
              <p style="font-size: 0.85rem; color: var(--color-text-muted); text-align: center;">
                Default credentials: admin@bravehearts.mw / admin123
              </p>
              <p style="font-size: 0.85rem; color: var(--color-text-muted); text-align: center; margin-top: 8px;">
                <a href="#/admin/forgot-password" style="color: var(--color-accent);">Forgot password?</a>
              </p>
            </div>
          ` : ''}

          ${isForgot ? `
            <div class="admin-login-footer">
              <p style="font-size: 0.85rem; color: var(--color-text-muted); text-align: center; margin-top: 8px;">
                <a href="#/admin-login" style="color: var(--color-accent);">Back to login</a>
              </p>
            </div>
          ` : ''}
        </div>
      </div>
    </section>
  `;
}
