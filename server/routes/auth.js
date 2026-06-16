const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, hashPassword } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { authRateLimiter } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendPasswordResetEmail } = require('../services/email');

// User registration
router.post('/register', authRateLimiter, validate(schemas.register), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = hashPassword(password);

  db.get('SELECT id FROM users WHERE email = ?', [email], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) {
      return res.status(400).json({ error: 'A user with that email already exists.' });
    }

    const now = new Date().toISOString();
    db.run(
      'INSERT INTO users (name, email, password_hash, subscription_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'pending', now, now],
      function (insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        res.json({ userId: this.lastID, email, name, subscriptionPaid: false });
      }
    );
  });
}));

// User login
router.post('/login', authRateLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const passwordHash = hashPassword(password);

  db.get('SELECT id, name, email, subscription_status, is_banned FROM users WHERE email = ? AND password_hash = ?', [email, passwordHash], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support at info@bravehearts.mw.' });
    }
    res.json({ userId: user.id, name: user.name, email: user.email, subscriptionStatus: user.subscription_status });
  });
}));

// Forgot password
router.post('/forgot-password', authRateLimiter, validate(schemas.forgotPassword), asyncHandler(async (req, res) => {
  const { email } = req.body;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
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

  db.get('SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?', [token, now], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const updatePassword = () => {
      db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [row.id], (updateErr) => {
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
