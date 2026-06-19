const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { db, hashPassword } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { authRateLimiter } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendPasswordResetEmail, sendWelcomeEmail, sendEmailVerificationEmail } = require('../services/email');
const path = require('path');
const fs = require('fs');

let googleClient = null;
function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) return null;
  if (!googleClient) {
    googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
    );
  }
  return googleClient;
}

function generateOAuthPasswordHash(provider, subject) {
  return hashPassword(`${provider}:${subject}:${process.env.SESSION_SECRET || 'bravehearts-oauth'}`);
}

// User registration
router.post('/register', authRateLimiter, validate(schemas.register), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = hashPassword(password);

  db.get('SELECT id FROM users WHERE email = ? AND COALESCE(is_deleted, false) = false', [email], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) {
      return res.status(400).json({ error: 'A user with that email already exists.' });
    }

    const now = new Date().toISOString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.run(
      'INSERT INTO users (name, email, password_hash, subscription_status, email_verified, email_verification_token, email_verification_expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'pending', false, verificationToken, verificationExpiresAt, now, now],
      async function (insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        try {
          await sendEmailVerificationEmail({ to: email, name, token: verificationToken });
          res.json({ userId: this.lastID, email, name, subscriptionPaid: false, emailVerified: false, message: 'Account created. Please verify your Gmail before logging in.' });
        } catch (error) {
          res.status(500).json({ error: 'Account created, but verification email could not be sent. Please contact support.' });
        }
      }
    );
  });
}));

function completeGoogleLogin(payload, callback) {
  if (!payload?.email || !payload?.email_verified) {
    return callback({ status: 401, message: 'Google account email could not be verified.' });
  }
  if (!String(payload.email).toLowerCase().endsWith('@gmail.com')) {
    return callback({ status: 400, message: 'Please use a Gmail account to continue.' });
  }

  const email = String(payload.email).toLowerCase();
  const name = payload.name || email.split('@')[0];
  const profilePhotoUrl = payload.picture || '';
  const now = new Date().toISOString();

  db.get('SELECT id, name, email, subscription_status, is_banned FROM users WHERE email = ? AND COALESCE(is_deleted, false) = false', [email], (err, user) => {
    if (err) return callback({ status: 500, message: err.message });
    if (user?.is_banned) {
      return callback({ status: 403, message: 'Your account has been banned. Please contact support at info@bravehearts.mw.' });
    }
    if (user) {
      const updates = [];
      const params = [];
      if (profilePhotoUrl) {
        updates.push('profile_photo_url = ?');
        params.push(profilePhotoUrl);
      }
      updates.push('email_verified = ?', 'updated_at = ?');
      params.push(true, now, user.id);
      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, updateErr => {
        if (updateErr) return callback({ status: 500, message: updateErr.message });
        callback(null, { userId: user.id, name: user.name || name, email: user.email, subscriptionStatus: user.subscription_status, isNewUser: false });
      });
      return;
    }

    db.run(
      'INSERT INTO users (name, email, password_hash, subscription_status, profile_photo_url, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, generateOAuthPasswordHash('google', payload.sub), 'pending', profilePhotoUrl, true, now, now],
      function(insertErr) {
        if (insertErr) return callback({ status: 500, message: insertErr.message });
        sendWelcomeEmail({ to: email, name }).catch(error => {
          console.warn('Failed to send welcome email:', error.message);
        });
        callback(null, { userId: this.lastID, name, email, subscriptionStatus: 'pending', subscriptionPaid: false, isNewUser: true });
      }
    );
  });
}

// Google redirect login/register
router.get('/google/start', authRateLimiter, asyncHandler(async (req, res) => {
  const client = getGoogleClient();
  if (!client || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).send('Google sign-in is not configured.');
  }
  const returnTo = String(req.query.returnTo || '#/home');
  const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64url');
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state
  });
  res.redirect(url);
}));

router.get('/google/callback', asyncHandler(async (req, res) => {
  const client = getGoogleClient();
  if (!client) return res.status(503).send('Google sign-in is not configured.');
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing Google authorization code.');

  const { tokens } = await client.getToken(String(code));
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  let returnTo = '#/home';
  try {
    if (state) returnTo = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8')).returnTo || returnTo;
  } catch (_) {}

  completeGoogleLogin(ticket.getPayload(), (err, user) => {
    if (err) return res.status(err.status || 500).send(err.message || 'Google sign-in failed.');
    const redirectUrl = new URL('/', process.env.PUBLIC_APP_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('googleLogin', 'success');
    redirectUrl.searchParams.set('userId', user.userId);
    redirectUrl.searchParams.set('email', user.email);
    redirectUrl.searchParams.set('name', user.name || '');
    redirectUrl.searchParams.set('subscriptionStatus', user.subscriptionStatus || 'pending');
    redirectUrl.searchParams.set('isNewUser', user.isNewUser ? 'true' : 'false');
    redirectUrl.hash = returnTo.replace(/^#?/, '#/').replace(/^#\/\//, '#/');
    res.redirect(redirectUrl.toString());
  });
}));

// Google user login/register
router.post('/google', authRateLimiter, validate(schemas.googleAuth), asyncHandler(async (req, res) => {
  const client = getGoogleClient();
  if (!client) {
    return res.status(503).json({ error: 'Google sign-in is not configured.' });
  }

  const ticket = await client.verifyIdToken({
    idToken: req.body.credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload?.email_verified) {
    return res.status(401).json({ error: 'Google account email could not be verified.' });
  }
  if (!String(payload.email).toLowerCase().endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'Please use a Gmail account to continue.' });
  }

  const email = String(payload.email).toLowerCase();
  const name = payload.name || email.split('@')[0];
  const profilePhotoUrl = payload.picture || '';
  const now = new Date().toISOString();

  db.get('SELECT id, name, email, subscription_status, is_banned FROM users WHERE email = ? AND COALESCE(is_deleted, false) = false', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (user?.is_banned) {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support at info@bravehearts.mw.' });
    }
    if (user) {
      const updates = [];
      const params = [];
      if (profilePhotoUrl) {
        updates.push('profile_photo_url = ?');
        params.push(profilePhotoUrl);
      }
      updates.push('updated_at = ?');
      params.push(now, user.id);
      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, updateErr => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ userId: user.id, name: user.name || name, email: user.email, subscriptionStatus: user.subscription_status, isNewUser: false });
      });
      return;
    }

    db.run(
      'INSERT INTO users (name, email, password_hash, subscription_status, profile_photo_url, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, generateOAuthPasswordHash('google', payload.sub), 'pending', profilePhotoUrl, true, now, now],
      function(insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        sendWelcomeEmail({ to: email, name }).catch(error => {
          console.warn('Failed to send welcome email:', error.message);
        });
        res.json({ userId: this.lastID, name, email, subscriptionStatus: 'pending', subscriptionPaid: false, isNewUser: true });
      }
    );
  });
}));

router.get('/verify-email', asyncHandler(async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(400).send('<h1>Verification failed</h1><p>Missing verification token.</p>');
  }

  db.get(
    'SELECT id FROM users WHERE email_verification_token = ? AND email_verification_expires_at > ?',
    [token, new Date().toISOString()],
    (err, user) => {
      if (err) return res.status(500).send('<h1>Verification failed</h1><p>Please try again later.</p>');
      if (!user) return res.status(400).send('<h1>Verification failed</h1><p>This verification link is invalid or expired.</p>');

      db.run(
        'UPDATE users SET email_verified = ?, email_verification_token = ?, email_verification_expires_at = ?, updated_at = ? WHERE id = ?',
        [true, null, null, new Date().toISOString(), user.id],
        updateErr => {
          if (updateErr) return res.status(500).send('<h1>Verification failed</h1><p>Please try again later.</p>');
          res.send(`
            <main style="min-height:100vh;display:grid;place-items:center;background:#07130d;color:#fff;font-family:Arial,sans-serif;padding:24px;text-align:center;">
              <section style="max-width:520px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:24px;padding:32px;">
                <h1 style="color:#34d399;margin-top:0;">Email verified</h1>
                <p>Your Bravehearts account is now active. You can log in and continue.</p>
                <a href="/#/login" style="display:inline-block;margin-top:16px;background:#d42027;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:800;">Go to Login</a>
              </section>
            </main>
          `);
        }
      );
    }
  );
}));

// User login
router.post('/login', authRateLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const passwordHash = hashPassword(password);

  db.get('SELECT id, name, email, subscription_status, is_banned, email_verified FROM users WHERE email = ? AND password_hash = ? AND COALESCE(is_deleted, false) = false', [email, passwordHash], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support at info@bravehearts.mw.' });
    }
    if (!user.email_verified) {
      return res.status(403).json({ error: 'Please verify your Gmail before logging in. Check your inbox for the Bravehearts verification link.' });
    }
    res.json({ userId: user.id, name: user.name, email: user.email, subscriptionStatus: user.subscription_status });
  });
}));

// User profile photo upload
router.post('/:id/profile-photo', asyncHandler(async (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'Filename and base64 image data are required.' });
  }

  const match = String(fileData).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Only image uploads are supported.' });
  }

  const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/avif', 'image/x-icon']);
  if (!allowedMimeTypes.has(match[1])) {
    return res.status(400).json({ error: 'Unsupported image type.' });
  }

  const extension = path.extname(fileName).toLowerCase() || '.jpg';
  const cleanName = `profile-${req.params.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}${extension}`;
  const uploadsDir = path.join(__dirname, '../../uploads');
  const filePath = path.join(uploadsDir, cleanName);

  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFile(filePath, Buffer.from(match[2], 'base64'), (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save uploaded image.' });
    res.json({ success: true, url: `/uploads/${cleanName}`, imageUrl: `/uploads/${cleanName}` });
  });
}));

// User profile
router.get('/:id/profile', asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT id, name, email, subscription_status, created_at, profile_photo_url, favorite_team, favorite_player,
            notify_game_reminders, notify_live_scores, notify_news, notify_merch
     FROM users WHERE id = ? AND COALESCE(is_deleted, false) = false`,
    [id],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found.' });

      db.get(
        `SELECT expires_at FROM subscriptions
         WHERE user_id = ? AND status = 'active'
         ORDER BY expires_at DESC LIMIT 1`,
        [id],
        (subErr, subscription) => {
          if (subErr) return res.status(500).json({ error: subErr.message });
          res.json({ profile: { ...user, membership_expires_at: subscription?.expires_at || null } });
        }
      );
    }
  );
}));

router.patch('/:id/profile', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowed = ['name', 'profile_photo_url', 'favorite_team', 'favorite_player', 'notify_game_reminders', 'notify_live_scores', 'notify_news', 'notify_merch'];
  const updates = [];
  const params = [];

  allowed.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (!updates.length) return res.status(400).json({ error: 'No profile fields provided.' });

  updates.push('updated_at = ?');
  params.push(new Date().toISOString(), id);

  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ success: true });
  });
}));

// Forgot password
router.post('/forgot-password', authRateLimiter, validate(schemas.forgotPassword), asyncHandler(async (req, res) => {
  const { email } = req.body;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  db.get('SELECT id FROM users WHERE email = ? AND COALESCE(is_deleted, false) = false', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    db.get('SELECT id FROM admins WHERE email = ?', [email], async (adminErr, admin) => {
      if (adminErr) return res.status(500).json({ error: adminErr.message });

      const resetTargets = [];
      if (user) resetTargets.push({ type: 'user', userId: user.id });
      if (admin) resetTargets.push({ type: 'admin', adminId: admin.id });

      try {
        for (const target of resetTargets) {
          const token = crypto.randomBytes(32).toString('hex');
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO password_reset_tokens (token, user_id, admin_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [token, target.userId || null, target.adminId || null, target.type, expiresAt, now],
              insertErr => insertErr ? reject(insertErr) : resolve()
            );
          });

          await sendPasswordResetEmail({ to: email, token, accountType: target.type });
        }

        res.json({ success: true, message: 'If an account with that email exists, a password reset email has been sent.' });
      } catch (sendErr) {
        res.status(500).json({ error: 'Unable to send password reset email. Please try again later.' });
      }
    });
  });
}));

// Reset password
router.post('/reset-password', authRateLimiter, validate(schemas.resetPassword), asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const now = new Date().toISOString();
  const passwordHash = hashPassword(newPassword);

  db.get('SELECT * FROM password_reset_tokens WHERE token = ? AND used = ? AND expires_at > ?', [token, false, now], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const updatePassword = () => {
      db.run('UPDATE password_reset_tokens SET used = ? WHERE id = ?', [true, row.id], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ success: true, message: 'Password has been reset successfully.' });
      });
    };

    if (row.type === 'user' && row.user_id) {
      db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, row.user_id], updatePassword);
    } else if (row.type === 'admin' && row.admin_id) {
      db.run('UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, row.admin_id], updatePassword);
    } else {
      res.status(400).json({ error: 'Invalid token type.' });
    }
  });
}));

module.exports = router;
