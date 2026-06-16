const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, hashPassword } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { adminAuthMiddleware } = require('../middleware/admin-auth');
const { authRateLimiter } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');
const { triggerUpdate } = require('../utils');
const { parseCsv, parseSpreadsheet, toInt } = require('../services/csv-import');

function superAdminOnly(req, res, next) {
  if (req.admin?.role !== 'super-admin') {
    return res.status(403).json({ error: 'Permission denied. Only Super Admins can delete resources.' });
  }
  next();
}

function calculateStandingsBody(req, res, next) {
  const won = Number(req.body.won || 0);
  const lost = Number(req.body.lost || 0);
  const forfeit = Number(req.body.forfeit || 0);
  req.body.played = won + lost + forfeit;
  req.body.points = (won * 2) + lost;
  req.body.point_difference = Number(req.body.points_for || 0) - Number(req.body.points_against || 0);
  if (req.body.group_name == null) req.body.group_name = '';
  next();
}

// Admin login
router.post('/login', authRateLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const passwordHash = hashPassword(password);

  db.get('SELECT id, email, name, role FROM admins WHERE email = ? AND password_hash = ?', [email, passwordHash], (err, admin) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO admin_sessions (session_id, admin_id, admin_email, admin_role, created_at) VALUES (?, ?, ?, ?, ?)',
      [sessionId, admin.id, admin.email, admin.role, now],
      (insertErr) => {
        if (insertErr) return res.status(500).json({ error: 'Failed to create session.' });
        res.json({ sessionId, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
      }
    );
  });
}));

// Admin logout
router.post('/logout', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    db.run('DELETE FROM admin_sessions WHERE session_id = ?', [sessionId]);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
}));

// Admin forgot password
router.post('/auth/forgot-password', authRateLimiter, validate(schemas.forgotPassword), asyncHandler(async (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  db.get('SELECT id FROM admins WHERE email = ?', [email], (err, admin) => {
    if (err) return res.status(500).json({ error: err.message });

    if (admin) {
      db.run(
        'INSERT INTO password_reset_tokens (token, admin_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
        [token, admin.id, 'admin', expiresAt, now]
      );
    }

    res.json({ success: true, message: 'If an admin account with that email exists, a password reset link has been generated.' });
  });
}));

// Admin reset password
router.post('/auth/reset-password', authRateLimiter, validate(schemas.resetPassword), asyncHandler(async (req, res) => {
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

    if (row.type === 'admin' && row.admin_id) {
      db.run('UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, row.admin_id], updatePassword);
    } else {
      res.status(400).json({ error: 'Invalid token type.' });
    }
  });
}));

// Admin dashboard stats
router.get('/dashboard/stats', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  Promise.all([
    new Promise((resolve, reject) => {
      db.get('SELECT SUM(total_mwk) as mwk, SUM(total_usd) as usd FROM orders WHERE status = ?', ['paid'], (err, row) => {
        resolve(err ? { mwk: 0, usd: 0 } : { mwk: row.mwk || 0, usd: row.usd || 0 });
      });
    }),
    new Promise((resolve, reject) => {
      db.all('SELECT status, COUNT(*) as count FROM orders GROUP BY status', [], (err, rows) => {
        resolve(err ? {} : Object.fromEntries(rows.map(r => [r.status, r.count])));
      });
    }),
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(DISTINCT id) as total FROM users', [], (err, row) => {
        resolve(err ? 0 : row.total);
      });
    }),
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM subscriptions WHERE status = ?', ['active'], (err, row) => {
        resolve(err ? 0 : row.count);
      });
    })
  ]).then(([revenue, orderStats, userCount, activeSubscriptions]) => {
    res.json({
      revenue,
      orderStats,
      userCount,
      activeSubscriptions,
      timestamp: new Date().toISOString()
    });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
}));

// Recent orders
router.get('/dashboard/recent-orders', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  db.all(
    `SELECT o.id, o.reference, o.status, o.total_mwk, o.total_usd, o.created_at, u.email, u.name
     FROM orders o
     JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC
     LIMIT ?`,
    [limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ orders: rows });
    }
  );
}));

// Get all users
router.get('/users', adminAuthMiddleware, asyncHandler(async (req, res) => {
  db.all(
    `SELECT id, name, email, subscription_status, is_banned, created_at, updated_at FROM users ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ users: rows });
    }
  );
}));

// Get user detail
router.get('/users/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT id, name, email, subscription_status, is_banned, created_at, updated_at FROM users WHERE id = ?`,
    [id],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found.' });

      db.all(
        `SELECT s.*, p.title FROM subscriptions s JOIN products p ON s.product_id = p.id WHERE s.user_id = ?`,
        [id],
        (err, subscriptions) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ user: { ...user, subscriptions } });
        }
      );
    }
  );
}));

// Update user subscription status
router.put('/users/:id/subscription', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subscription_status } = req.body;

  if (!['active', 'inactive', 'expired'].includes(subscription_status)) {
    return res.status(400).json({ error: 'Invalid subscription status.' });
  }

  const now = new Date().toISOString();
  db.run(
    'UPDATE users SET subscription_status = ?, updated_at = ? WHERE id = ?',
    [subscription_status, now, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'update_user_subscription', id, `Subscription changed to ${subscription_status}`, now]
      );

      res.json({ success: true, message: `User subscription updated to ${subscription_status}.` });
    }
  );
}));

// Ban/unban user
router.put('/users/:id/ban', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { is_banned } = req.body;
  const now = new Date().toISOString();

  db.run(
    'UPDATE users SET is_banned = ?, updated_at = ? WHERE id = ?',
    [is_banned ? 1 : 0, now, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, is_banned ? 'ban_user' : 'unban_user', req.params.id, is_banned ? 'User banned' : 'User unbanned', now]
      );

      res.json({ success: true, message: `User ban status updated to ${is_banned ? 'Banned' : 'Active'}.` });
    }
  );
}));

// Revenue trend (last 30 days)
router.get('/analytics/revenue-trend', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  db.all(
    `SELECT DATE(created_at) as date, 
            SUM(CASE WHEN status = 'paid' THEN total_mwk ELSE 0 END) as mwk,
            SUM(CASE WHEN status = 'paid' THEN total_usd ELSE 0 END) as usd,
            COUNT(*) as order_count
     FROM orders
     WHERE created_at >= ?
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [last30Days],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ trend: rows || [] });
    }
  );
}));

// Payment method breakdown
router.get('/analytics/payment-methods', adminAuthMiddleware, asyncHandler(async (req, res) => {
  db.all(
    `SELECT payment_method,
            COUNT(*) as order_count,
            SUM(CASE WHEN status = 'paid' THEN total_mwk ELSE 0 END) as total_mwk,
            SUM(CASE WHEN status = 'paid' THEN total_usd ELSE 0 END) as total_usd,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders
     FROM orders
     GROUP BY payment_method`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ methods: rows || [] });
    }
  );
}));

// Sales by category
router.get('/analytics/sales-by-category', adminAuthMiddleware, asyncHandler(async (req, res) => {
  db.all(
    `SELECT p.category,
            COUNT(DISTINCT o.id) as order_count,
            SUM(oi.quantity) as total_units,
            SUM(CASE WHEN o.status = 'paid' THEN oi.total_price_mwk ELSE 0 END) as total_mwk,
            SUM(CASE WHEN o.status = 'paid' THEN oi.total_price_usd ELSE 0 END) as total_usd
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN products p ON oi.product_id = p.id
     GROUP BY p.category
     ORDER BY total_mwk DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ categories: rows || [] });
    }
  );
}));

// CSV report export
router.get('/reports/export', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { type } = req.query;

  if (type === 'sales') {
    db.all(
      `SELECT o.id, o.reference, o.status, o.total_mwk, o.total_usd, o.payment_method, o.created_at, u.name, u.email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let csv = 'Order ID,Reference,Status,Total MWK,Total USD,Payment Method,Created At,Customer Name,Customer Email\n';
        rows.forEach(r => {
          csv += `"${r.id}","${r.reference}","${r.status}",${r.total_mwk},${r.total_usd},"${r.payment_method}","${r.created_at}","${r.name.replace(/"/g, '""')}","${r.email}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.csv');
        return res.status(200).send(csv);
      }
    );
  } else if (type === 'games') {
    db.all('SELECT * FROM games ORDER BY game_date DESC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      let csv = 'Game ID,Tournament,Opponent,Opponent Origin,Team,Our Score,Opponent Score,Venue,Date,Status,Outcome\n';
      rows.forEach(r => {
        csv += `"${r.id}","${r.tournament.replace(/"/g, '""')}","${r.opponent.replace(/"/g, '""')}","${r.opponent_origin.replace(/"/g, '""')}","${r.team}",${r.our_score || ''},${r.opponent_score || ''},"${(r.venue || '').replace(/"/g, '""')}","${r.game_date}","${r.status}","${r.outcome || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=games_report.csv');
      return res.status(200).send(csv);
    });
  } else if (type === 'users') {
    db.all('SELECT id, name, email, subscription_status, is_banned, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      let csv = 'User ID,Name,Email,Subscription Status,Banned,Created At\n';
      rows.forEach(r => {
        csv += `"${r.id}","${r.name.replace(/"/g, '""')}","${r.email}","${r.subscription_status}",${r.is_banned ? 'Yes' : 'No'},"${r.created_at}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users_report.csv');
      return res.status(200).send(csv);
    });
  } else {
    res.status(400).json({ error: 'Invalid export type.' });
  }
}));

// File upload
router.post('/upload', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'Filename and base64 data are required.' });
  }

  const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');
  
  const path = require('path');
  const fs = require('fs');
  const extension = path.extname(fileName) || '.jpg';
  const cleanName = `upload-${Date.now()}-${Math.floor(Math.random() * 10000)}${extension}`;
  const filePath = path.join(__dirname, '../../uploads', cleanName);

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save uploaded file.' });
    }
    res.json({ success: true, url: `/uploads/${cleanName}`, imageUrl: `/uploads/${cleanName}` });
  });
}));

// Products admin routes (redirect to products routes)
router.get('/products', adminAuthMiddleware, asyncHandler(async (req, res) => {
  db.all('SELECT * FROM products ORDER BY title', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ products: rows });
  });
}));

router.post('/products', adminAuthMiddleware, validate(schemas.product), asyncHandler(async (req, res) => {
  const { title, sku, category, price_mwk, price_usd, description, is_new, image_url } = req.body;
  const now = new Date().toISOString();
  const id = `p${Math.floor(Math.random() * 1000000)}`;

  db.run(
    'INSERT INTO products (id, title, sku, category, price_mwk, price_usd, description, is_new, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, sku, category, price_mwk, price_usd, description, is_new ? 1 : 0, image_url || '', now, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'create_product', id, `Created: ${title}`, now]
      );

      triggerUpdate('products');
      res.json({ success: true, product: { id, title, sku, category, price_mwk, price_usd, description, is_new, image_url } });
    }
  );
}));

router.put('/products/:id', adminAuthMiddleware, validate(schemas.product), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, sku, category, price_mwk, price_usd, description, is_new, image_url } = req.body;
  const now = new Date().toISOString();

  db.run(
    'UPDATE products SET title = ?, sku = ?, category = ?, price_mwk = ?, price_usd = ?, description = ?, is_new = ?, image_url = ?, updated_at = ? WHERE id = ?',
    [title, sku, category, price_mwk, price_usd, description, is_new ? 1 : 0, image_url || '', now, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not found.' });

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'update_product', id, `Updated: ${title}`, now]
      );

      triggerUpdate('products');
      res.json({ success: true, message: 'Product updated successfully.' });
    }
  );
}));

router.delete('/products/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found.' });

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'delete_product', id, `Deleted product ${id}`, now]
    );

    triggerUpdate('products');
    res.json({ success: true, message: 'Product deleted successfully.' });
  });
}));

// Orders admin routes
router.get('/orders', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const status = req.query.status || null;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  let query = `SELECT o.id, o.reference, o.status, o.total_mwk, o.total_usd, o.payment_method, o.mobile_money_number, o.created_at, u.email, u.name
               FROM orders o
               JOIN users u ON o.user_id = u.id`;
  const params = [];

  if (status) {
    query += ` WHERE o.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ orders: rows });
  });
}));

router.get('/orders/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT o.*, u.email, u.name
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE o.id = ?`,
    [id],
    (err, order) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      db.all(
        `SELECT oi.*, p.title
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [id],
        (err, items) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ order: { ...order, items } });
        }
      );
    }
  );
}));

router.put('/orders/:id/status', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'paid', 'shipped', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const now = new Date().toISOString();
  db.run(
    'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
    [status, now, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Order not found.' });

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'update_order_status', id, `Status changed to ${status}`, now]
      );

      db.get('SELECT user_id, reference FROM orders WHERE id = ?', [id], (err, orderRow) => {
        if (!err && orderRow) {
          const title = `Order Status Updated`;
          const message = `Your order ${orderRow.reference} is now marked as: ${status.toUpperCase()}.`;
          db.run('INSERT INTO notifications (user_id, title, message, created_at) VALUES (?, ?, ?, ?)', [orderRow.user_id, title, message, now]);
        }
      });

      res.json({ success: true, message: `Order status updated to ${status}.` });
    }
  );
}));

// Games admin routes
router.get('/games', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const status = req.query.status || null;
  let query = 'SELECT * FROM games';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY game_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ games: rows });
  });
}));

router.get('/games/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM games WHERE id = ?', [id], (err, game) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    res.json({ game });
  });
}));

router.post('/games', adminAuthMiddleware, validate(schemas.game), asyncHandler(async (req, res) => {
  const { tournament, opponent, opponent_origin, team, our_score, opponent_score, is_home, status, outcome, game_date, game_time, venue, opponent_logo_url, notes } = req.body;
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO games (tournament, opponent, opponent_origin, team, our_score, opponent_score, is_home, status, outcome, game_date, game_time, venue, opponent_logo_url, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tournament, opponent, opponent_origin, team || 'men', our_score || null, opponent_score || null, is_home ? 1 : 0, status || 'upcoming', outcome || null, game_date, game_time || null, venue || null, opponent_logo_url || null, notes || null, now, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'create_game', this.lastID, `Created: ${opponent} (${tournament})`, now]
      );

      triggerUpdate('games');
      res.json({ success: true, gameId: this.lastID, message: 'Game created successfully.' });
    }
  );
}));

router.put('/games/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tournament, opponent, opponent_origin, team, our_score, opponent_score, is_home, status, outcome, game_date, game_time, venue, opponent_logo_url, notes } = req.body;
  const now = new Date().toISOString();

  db.run(
    'UPDATE games SET tournament = ?, opponent = ?, opponent_origin = ?, team = ?, our_score = ?, opponent_score = ?, is_home = ?, status = ?, outcome = ?, game_date = ?, game_time = ?, venue = ?, opponent_logo_url = ?, notes = ?, updated_at = ? WHERE id = ?',
    [tournament, opponent, opponent_origin, team, our_score || null, opponent_score || null, is_home ? 1 : 0, status, outcome || null, game_date, game_time || null, venue || null, opponent_logo_url || null, notes || null, now, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Game not found.' });

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'update_game', id, `Updated: ${opponent} (${tournament})`, now]
      );

      triggerUpdate('games');
      res.json({ success: true, message: 'Game updated successfully.' });
    }
  );
}));

router.delete('/games/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.run('DELETE FROM games WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Game not found.' });

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'delete_game', id, `Deleted game ${id}`, now]
    );

    triggerUpdate('games');
    res.json({ success: true, message: 'Game deleted successfully.' });
  });
}));

function readImportUpload(req, res, next) {
  const chunks = [];
  let size = 0;
  req.on('data', chunk => {
    chunks.push(chunk);
    size += chunk.length;
    if (size > 5 * 1024 * 1024) {
      req.destroy(new Error('Import file is too large. Maximum size is 5MB.'));
    }
  });
  req.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    const fileName = String(req.headers['x-file-name'] || '').toLowerCase();
    const isExcel = contentType.includes('spreadsheet') || contentType.includes('excel') || fileName.endsWith('.xlsx');
    req.importRows = isExcel ? parseSpreadsheet(buffer) : parseCsv(buffer.toString('utf8'));
    next();
  });
  req.on('error', error => next(error));
}

function importStatsRows(gameId, rows, now) {
  const errors = [];
  const warnings = [];
  const validRows = [];

  rows.forEach(row => {
    const rowNumber = row.__rowNumber;
    const playerNumber = toInt(row.playerNumber, null);
    const playerName = String(row.playerName || '').trim();
    if (!playerName) errors.push({ row: rowNumber, field: 'PLAYERNAME', message: 'PLAYERNAME is required.' });
    if (!playerNumber && validRows.some(existing => String(existing.player_name).toLowerCase() === playerName.toLowerCase())) {
      errors.push({ row: rowNumber, field: 'PLAYERNAME', message: 'Duplicate PLAYERNAME in file. Add playerNumber column or make names unique.' });
    }
    if (!playerName) return;

    const stat = {
      game_id: gameId,
      player_number: playerNumber || (validRows.length + 1),
      player_name: playerName,
      minutes: String(row.minutes || '').trim() || null,
      points: toInt(row.points),
      field_goals_made: toInt(row.fieldGoalsMade),
      field_goals_attempted: toInt(row.fieldGoalsAttempted),
      two_points_made: toInt(row.twoPointsMade),
      two_points_attempted: toInt(row.twoPointsAttempted),
      three_points_made: toInt(row.threePointsMade),
      three_points_attempted: toInt(row.threePointsAttempted),
      free_throws_made: toInt(row.freeThrowsMade),
      free_throws_attempted: toInt(row.freeThrowsAttempted),
      offensive_rebounds: toInt(row.offensiveRebounds),
      defensive_rebounds: toInt(row.defensiveRebounds),
      rebounds: toInt(row.rebounds),
      assists: toInt(row.assists),
      steals: toInt(row.steals),
      blocks: toInt(row.blocks),
      turnovers: toInt(row.turnovers),
      fouls: toInt(row.fouls),
      plus_minus: toInt(row.plusMinus),
      efficiency: toInt(row.efficiency)
    };

    if (stat.field_goals_made > stat.field_goals_attempted) warnings.push({ row: rowNumber, field: 'fieldGoalsMade', message: 'FGM is greater than FGA.' });
    if (stat.two_points_made > stat.two_points_attempted) warnings.push({ row: rowNumber, field: 'twoPointsMade', message: '2PM is greater than 2PA.' });
    if (stat.three_points_made > stat.three_points_attempted) warnings.push({ row: rowNumber, field: 'threePointsMade', message: '3PM is greater than 3PA.' });
    if (stat.free_throws_made > stat.free_throws_attempted) warnings.push({ row: rowNumber, field: 'freeThrowsMade', message: 'FTM is greater than FTA.' });

    const calculatedRebounds = stat.offensive_rebounds + stat.defensive_rebounds;
    if (stat.rebounds === 0 && calculatedRebounds > 0) stat.rebounds = calculatedRebounds;
    if (stat.rebounds !== calculatedRebounds && calculatedRebounds > 0) warnings.push({ row: rowNumber, field: 'rebounds', message: 'REB differs from OREB + DREB.' });

    const calculatedPoints = (stat.two_points_made * 2) + (stat.three_points_made * 3) + stat.free_throws_made;
    if (stat.points === 0 && calculatedPoints > 0) stat.points = calculatedPoints;
    if (stat.points !== calculatedPoints && calculatedPoints > 0) warnings.push({ row: rowNumber, field: 'points', message: 'PTS differs from calculated shot totals.' });

    validRows.push(stat);
  });

  return { errors, warnings, validRows };
}

// Game stats admin routes
router.get('/games/:id/stats', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM player_stats WHERE game_id = ? AND is_active = TRUE ORDER BY CAST(player_number AS INTEGER) ASC, player_number ASC', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ stats: rows || [] });
  });
}));

router.post('/games/:id/stats', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { player_number, player_name } = req.body;
  const now = new Date().toISOString();

  if (!player_number || !player_name) {
    return res.status(400).json({ error: 'Player number and name are required.' });
  }

  db.run(
    `INSERT INTO player_stats (game_id, player_number, player_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, player_number, player_name, now, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // Auto-calculate total score from player points
      db.all(
        'SELECT SUM(points) as total_points FROM player_stats WHERE game_id = ? AND is_active = TRUE',
        [id],
        (sumErr, sumRow) => {
          if (!sumErr && sumRow && sumRow.total_points !== null) {
            db.run(
              'UPDATE games SET our_score = ?, updated_at = ? WHERE id = ?',
              [sumRow.total_points, now, id],
              function () {
                // Trigger both stats and games updates after score is updated
                triggerUpdate('stats');
                triggerUpdate('games');
              }
            );
          } else {
            triggerUpdate('stats');
          }
        }
      );

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'add_player_stat', id, `Added player ${player_name} (#${player_number}) for game ${id}`, now]
      );

      res.json({
        success: true,
        stat: {
          id: this.lastID,
          game_id: id,
          player_number,
          player_name,
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          fouls: 0,
          turnovers: 0,
          is_active: 1
        }
      });
    }
  );
}));

router.post(['/games/:id/stats/import', '/games/:id/stats:import'], adminAuthMiddleware, readImportUpload, asyncHandler(async (req, res) => {
  const gameId = req.params.id;
  const rows = req.importRows || [];
  if (rows.length === 0) {
    return res.status(400).json({ error: 'CSV file does not contain any data rows.' });
  }

  const now = new Date().toISOString();
  const { errors, warnings, validRows } = importStatsRows(gameId, rows, now);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Import validation failed.', summary: { totalRows: rows.length, validRows: validRows.length, errorRows: errors.length, warningRows: warnings.length }, errors, warnings });
  }

  const sql = `INSERT INTO player_stats (
      game_id, player_number, player_name, minutes, points, rebounds, assists, steals, blocks, fouls, turnovers,
      field_goals_made, field_goals_attempted, two_points_made, two_points_attempted, three_points_made, three_points_attempted,
      free_throws_made, free_throws_attempted, offensive_rebounds, defensive_rebounds, plus_minus, efficiency, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(game_id, player_number) DO UPDATE SET
      player_name = excluded.player_name,
      minutes = excluded.minutes,
      points = excluded.points,
      rebounds = excluded.rebounds,
      assists = excluded.assists,
      steals = excluded.steals,
      blocks = excluded.blocks,
      fouls = excluded.fouls,
      turnovers = excluded.turnovers,
      field_goals_made = excluded.field_goals_made,
      field_goals_attempted = excluded.field_goals_attempted,
      two_points_made = excluded.two_points_made,
      two_points_attempted = excluded.two_points_attempted,
      three_points_made = excluded.three_points_made,
      three_points_attempted = excluded.three_points_attempted,
      free_throws_made = excluded.free_throws_made,
      free_throws_attempted = excluded.free_throws_attempted,
      offensive_rebounds = excluded.offensive_rebounds,
      defensive_rebounds = excluded.defensive_rebounds,
      plus_minus = excluded.plus_minus,
      efficiency = excluded.efficiency,
      is_active = TRUE,
      updated_at = excluded.updated_at`;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    let completed = 0;
    let failed = false;

    const finish = () => {
      db.run('UPDATE games SET our_score = (SELECT COALESCE(SUM(points), 0) FROM player_stats WHERE game_id = ? AND is_active = TRUE), updated_at = ? WHERE id = ?', [gameId, now, gameId], () => {
        db.run('COMMIT', commitErr => {
          if (commitErr) return res.status(500).json({ error: commitErr.message });
          db.run('INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)', [req.admin.id, 'import_game_stats', gameId, `Imported ${validRows.length} player stat rows`, now]);
          triggerUpdate('stats');
          triggerUpdate('games');
          res.json({ success: true, summary: { totalRows: rows.length, importedRows: validRows.length, warningRows: warnings.length }, warnings });
        });
      });
    };

    validRows.forEach(stat => {
      db.run(sql, [
        stat.game_id, stat.player_number, stat.player_name, stat.minutes, stat.points, stat.rebounds, stat.assists, stat.steals, stat.blocks, stat.fouls, stat.turnovers,
        stat.field_goals_made, stat.field_goals_attempted, stat.two_points_made, stat.two_points_attempted, stat.three_points_made, stat.three_points_attempted,
        stat.free_throws_made, stat.free_throws_attempted, stat.offensive_rebounds, stat.defensive_rebounds, stat.plus_minus, stat.efficiency, now, now
      ], err => {
        if (failed) return;
        if (err) {
          failed = true;
          return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));
        }
        completed += 1;
        if (completed === validRows.length) finish();
      });
    });
  });
}));

router.put(['/games/stats/:id', '/stats/:id'], adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    player_name,
    points,
    field_goals_made,
    field_goals_attempted,
    two_points_made,
    two_points_attempted,
    three_points_made,
    three_points_attempted,
    free_throws_made,
    free_throws_attempted,
    assists,
    steals,
    offensive_rebounds,
    defensive_rebounds,
    rebounds,
    blocks,
    fouls,
    turnovers,
    is_active
  } = req.body;
  const now = new Date().toISOString();

  const updates = [];
  const params = [];

  if (player_name !== undefined) { updates.push('player_name = ?'); params.push(player_name); }
  if (points !== undefined) { updates.push('points = ?'); params.push(points); }
  if (field_goals_made !== undefined) { updates.push('field_goals_made = ?'); params.push(field_goals_made); }
  if (field_goals_attempted !== undefined) { updates.push('field_goals_attempted = ?'); params.push(field_goals_attempted); }
  if (two_points_made !== undefined) { updates.push('two_points_made = ?'); params.push(two_points_made); }
  if (two_points_attempted !== undefined) { updates.push('two_points_attempted = ?'); params.push(two_points_attempted); }
  if (three_points_made !== undefined) { updates.push('three_points_made = ?'); params.push(three_points_made); }
  if (three_points_attempted !== undefined) { updates.push('three_points_attempted = ?'); params.push(three_points_attempted); }
  if (free_throws_made !== undefined) { updates.push('free_throws_made = ?'); params.push(free_throws_made); }
  if (free_throws_attempted !== undefined) { updates.push('free_throws_attempted = ?'); params.push(free_throws_attempted); }
  if (assists !== undefined) { updates.push('assists = ?'); params.push(assists); }
  if (steals !== undefined) { updates.push('steals = ?'); params.push(steals); }
  if (offensive_rebounds !== undefined) { updates.push('offensive_rebounds = ?'); params.push(offensive_rebounds); }
  if (defensive_rebounds !== undefined) { updates.push('defensive_rebounds = ?'); params.push(defensive_rebounds); }
  if (rebounds !== undefined) { updates.push('rebounds = ?'); params.push(rebounds); }
  if (blocks !== undefined) { updates.push('blocks = ?'); params.push(blocks); }
  if (fouls !== undefined) { updates.push('fouls = ?'); params.push(fouls); }
  if (turnovers !== undefined) { updates.push('turnovers = ?'); params.push(turnovers); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided.' });
  }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  db.run(`UPDATE player_stats SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Player stat not found.' });

    // Auto-calculate total score from player points
    db.get('SELECT game_id FROM player_stats WHERE id = ?', [id], (err, statRow) => {
      if (!err && statRow) {
        db.all(
          'SELECT SUM(points) as total_points FROM player_stats WHERE game_id = ? AND is_active = TRUE',
          [statRow.game_id],
          (sumErr, sumRow) => {
            if (!sumErr && sumRow && sumRow.total_points !== null) {
              db.run(
                'UPDATE games SET our_score = ?, updated_at = ? WHERE id = ?',
                [sumRow.total_points, now, statRow.game_id],
                function () {
                  // Trigger both stats and games updates after score is updated
                  triggerUpdate('stats');
                  triggerUpdate('games');
                }
              );
            } else {
              triggerUpdate('stats');
            }
          }
        );
      } else {
        triggerUpdate('stats');
      }

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'update_player_stat', id, `Updated player stats for stat ID ${id}`, now]
      );

      res.json({ success: true, message: 'Player stats updated successfully.' });
    });
  });
}));

router.delete('/games/stats/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  // Get game_id before deleting
  db.get('SELECT game_id FROM player_stats WHERE id = ?', [id], (err, statRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!statRow) return res.status(404).json({ error: 'Player stat not found.' });

    const gameId = statRow.game_id;

    db.run('DELETE FROM player_stats WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Player stat not found.' });

      // Auto-calculate total score from player points
      db.all(
        'SELECT SUM(points) as total_points FROM player_stats WHERE game_id = ? AND is_active = TRUE',
        [gameId],
        (sumErr, sumRow) => {
          if (!sumErr && sumRow && sumRow.total_points !== null) {
            db.run(
              'UPDATE games SET our_score = ?, updated_at = ? WHERE id = ?',
              [sumRow.total_points, now, gameId],
              function () {
                // Trigger both stats and games updates after score is updated
                triggerUpdate('stats');
                triggerUpdate('games');
              }
            );
          } else if (!sumErr && (!sumRow || sumRow.total_points === null)) {
            // If no active players, set score to null or 0
            db.run(
              'UPDATE games SET our_score = NULL, updated_at = ? WHERE id = ?',
              [now, gameId],
              function () {
                // Trigger both stats and games updates after score is updated
                triggerUpdate('stats');
                triggerUpdate('games');
              }
            );
          } else {
            triggerUpdate('stats');
          }
        }
      );

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'delete_player_stat', id, `Deleted player stat ${id}`, now]
      );

      res.json({ success: true, message: 'Player removed successfully.' });
    });
  });
}));

// Alternative route for deleting player stats (frontend compatibility)
router.delete('/stats/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  // Get game_id before deleting
  db.get('SELECT game_id FROM player_stats WHERE id = ?', [id], (err, statRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!statRow) return res.status(404).json({ error: 'Player stat not found.' });

    const gameId = statRow.game_id;

    db.run('DELETE FROM player_stats WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Player stat not found.' });

      // Auto-calculate total score from player points
      db.all(
        'SELECT SUM(points) as total_points FROM player_stats WHERE game_id = ? AND is_active = TRUE',
        [gameId],
        (sumErr, sumRow) => {
          if (!sumErr && sumRow && sumRow.total_points !== null) {
            db.run(
              'UPDATE games SET our_score = ?, updated_at = ? WHERE id = ?',
              [sumRow.total_points, now, gameId],
              function () {
                // Trigger both stats and games updates after score is updated
                triggerUpdate('stats');
                triggerUpdate('games');
              }
            );
          } else if (!sumErr && (!sumRow || sumRow.total_points === null)) {
            // If no active players, set score to null or 0
            db.run(
              'UPDATE games SET our_score = NULL, updated_at = ? WHERE id = ?',
              [now, gameId],
              function () {
                // Trigger both stats and games updates after score is updated
                triggerUpdate('stats');
                triggerUpdate('games');
              }
            );
          } else {
            triggerUpdate('stats');
          }
        }
      );

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'delete_player_stat', id, `Deleted player stat ${id}`, now]
      );

      res.json({ success: true, message: 'Player removed successfully.' });
    });
  });
}));

router.put('/games/:id/score', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { our_score, opponent_score, status, outcome } = req.body;
  const now = new Date().toISOString();

  const updates = [];
  const params = [];

  if (our_score !== undefined) { updates.push('our_score = ?'); params.push(our_score); }
  if (opponent_score !== undefined) { updates.push('opponent_score = ?'); params.push(opponent_score); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (outcome !== undefined) { updates.push('outcome = ?'); params.push(outcome); }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  db.run(`UPDATE games SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Game not found.' });

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'update_game_score', id, `Updated score for game ${id}`, now]
    );

    triggerUpdate('games');
    res.json({ success: true, message: 'Game score updated successfully.' });
  });
}));

// Players admin routes
router.get('/players', adminAuthMiddleware, asyncHandler(async (req, res) => {
  db.all('SELECT * FROM players ORDER BY team, name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ players: rows || [] });
  });
}));

router.post('/players', adminAuthMiddleware, validate(schemas.player), asyncHandler(async (req, res) => {
  const { name, number, position, nationality, height, age, points_per_game, team, bio, career_highlights, image_url } = req.body;
  const id = `p_${Date.now()}`;
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO players (id, name, number, position, nationality, height, age, points_per_game, team, bio, career_highlights, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, number, position, nationality || '', height || '', age || 0, points_per_game || 0, team, bio || '', career_highlights || '', image_url || '', now, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'create_player', id, `Created player ${name}`, now]
      );

      triggerUpdate('players');
      res.status(201).json({ success: true, player_id: id });
    }
  );
}));

router.put('/players/:id', adminAuthMiddleware, validate(schemas.player), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, number, position, nationality, height, age, points_per_game, team, bio, career_highlights, image_url } = req.body;
  const now = new Date().toISOString();

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (number !== undefined) { updates.push('number = ?'); params.push(number); }
  if (position !== undefined) { updates.push('position = ?'); params.push(position); }
  if (nationality !== undefined) { updates.push('nationality = ?'); params.push(nationality); }
  if (height !== undefined) { updates.push('height = ?'); params.push(height); }
  if (age !== undefined) { updates.push('age = ?'); params.push(age); }
  if (points_per_game !== undefined) { updates.push('points_per_game = ?'); params.push(points_per_game); }
  if (team !== undefined) { updates.push('team = ?'); params.push(team); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
  if (career_highlights !== undefined) { updates.push('career_highlights = ?'); params.push(career_highlights); }
  if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }

  if (updates.length === 0) return res.status(400).json({ error: 'No updates provided.' });

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  db.run(`UPDATE players SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Player not found.' });

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'update_player', id, `Updated player ${id}`, now]
    );

    triggerUpdate('players');
    res.json({ success: true, message: 'Player updated successfully.' });
  });
}));

router.delete('/players/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.run('DELETE FROM players WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Player not found.' });

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'delete_player', id, `Deleted player ${id}`, now]
    );

    triggerUpdate('players');
    res.json({ success: true, message: 'Player deleted successfully.' });
  });
}));

// News admin routes
router.post('/news', adminAuthMiddleware, validate(schemas.news), asyncHandler(async (req, res) => {
  const { title, category, content, image_url } = req.body;
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO news (title, category, content, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [title, category, content, image_url || '', now, now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      triggerUpdate('news');
      res.json({ success: true, newsId: this.lastID });
    }
  );
}));

// Admin: Create notification
router.post('/notifications', adminAuthMiddleware, validate(schemas.notification), asyncHandler(async (req, res) => {
  const { user_id, title, message } = req.body;
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?)',
    [user_id || null, title, message, 0, now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      triggerUpdate('notifications');
      res.json({ success: true, notificationId: this.lastID });
    }
  );
}));

router.put('/news/:id', adminAuthMiddleware, validate(schemas.news), asyncHandler(async (req, res) => {
  const { title, category, content, image_url } = req.body;
  const now = new Date().toISOString();

  db.run(
    'UPDATE news SET title = ?, category = ?, content = ?, image_url = ?, updated_at = ? WHERE id = ?',
    [title, category, content, image_url || '', now, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Article not found.' });
      triggerUpdate('news');
      res.json({ success: true });
    }
  );
}));

router.delete('/news/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  db.run('DELETE FROM news WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Article not found.' });
    triggerUpdate('news');
    res.json({ success: true });
  });
}));

// Gallery admin routes
router.post('/gallery', adminAuthMiddleware, validate(schemas.gallery), asyncHandler(async (req, res) => {
  const { title, media_type, media_url } = req.body;
  const now = new Date().toISOString();

  function getYouTubeEmbedUrl(rawUrl) {
    if (!rawUrl) return '';
    try {
      const url = new URL(rawUrl);
      const hostname = url.hostname.replace(/^www\./, '');
      let videoId = '';
      if (hostname === 'youtu.be') {
        videoId = url.pathname.split('/').filter(Boolean)[0] || '';
      } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
        if (url.pathname === '/watch') {
          videoId = url.searchParams.get('v') || '';
        } else if (url.pathname.startsWith('/embed/')) {
          videoId = url.pathname.split('/').filter(Boolean)[1] || '';
        } else if (url.pathname.startsWith('/shorts/')) {
          videoId = url.pathname.split('/').filter(Boolean)[1] || '';
        }
      }
      if (!videoId) return rawUrl;
      const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
      const start = url.searchParams.get('start') || url.searchParams.get('t');
      if (start) embedUrl.searchParams.set('start', String(start));
      return embedUrl.toString();
    } catch {
      return rawUrl;
    }
  }

  const normalizedMediaUrl = media_type === 'video' ? getYouTubeEmbedUrl(media_url) : media_url;

  db.run(
    'INSERT INTO gallery (title, media_type, media_url, created_at) VALUES (?, ?, ?, ?)',
    [title, media_type, normalizedMediaUrl, now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      triggerUpdate('gallery');
      res.json({ success: true, galleryId: this.lastID });
    }
  );
}));

router.delete('/gallery/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  db.run('DELETE FROM gallery WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Gallery item not found.' });
    triggerUpdate('gallery');
    res.json({ success: true });
  });
}));

function normalizeStandingRow(row) {
  const won = toInt(row.won);
  const lost = toInt(row.lost);
  const forfeit = toInt(row.forfeit);
  const pointsFor = toInt(row.pointsFor);
  const pointsAgainst = toInt(row.pointsAgainst);
  const uploadedDiff = row.pointDifference !== undefined && row.pointDifference !== '' ? toInt(row.pointDifference) : null;
  const played = row.played !== undefined && row.played !== '' ? toInt(row.played) : won + lost + forfeit;
  return {
    rowNumber: row.__rowNumber,
    season: String(row.season || '').trim(),
    tournament: String(row.tournament || '').trim(),
    team_category: String(row.teamCategory || '').trim().toLowerCase(),
    team_name: String(row.teamName || '').trim(),
    played,
    won,
    lost,
    forfeit,
    points_for: pointsFor,
    points_against: pointsAgainst,
    point_difference: uploadedDiff !== null ? uploadedDiff : pointsFor - pointsAgainst,
    points: (won * 2) + lost,
    group_name: String(row.groupName || 'A').trim() || 'A'
  };
}

// Standings admin routes
router.post(['/standings/import', '/standings:import'], adminAuthMiddleware, readImportUpload, asyncHandler(async (req, res) => {
  const rows = req.importRows || [];
  if (rows.length === 0) {
    return res.status(400).json({ error: 'CSV file does not contain any data rows.' });
  }

  const errors = [];
  const validRows = rows.map(normalizeStandingRow).filter(row => {
    if (!row.season) errors.push({ row: row.rowNumber, field: 'season', message: 'season is required.' });
    if (!row.tournament) errors.push({ row: row.rowNumber, field: 'tournament', message: 'tournament is required.' });
    if (!row.team_category) row.team_category = 'men';
    if (!row.team_name) errors.push({ row: row.rowNumber, field: 'teamName', message: 'teamName is required.' });
    return row.season && row.tournament && row.team_category && row.team_name;
  });

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Import validation failed.', summary: { totalRows: rows.length, validRows: validRows.length, errorRows: errors.length }, errors });
  }

  const now = new Date().toISOString();
  const selectSql = 'SELECT id FROM standings WHERE season = ? AND tournament = ? AND LOWER(COALESCE(team_category, \"\")) = LOWER(?) AND LOWER(team_name) = LOWER(?)';
  const insertSql = 'INSERT INTO standings (tournament, season, team_name, played, won, lost, forfeit, points_for, points_against, point_difference, points, group_name, team_category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const updateSql = 'UPDATE standings SET played = ?, won = ?, lost = ?, forfeit = ?, points_for = ?, points_against = ?, point_difference = ?, points = ?, group_name = ?, updated_at = ? WHERE id = ?';
  let completed = 0;
  let created = 0;
  let updated = 0;
  let failed = false;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const done = () => {
      db.run('COMMIT', commitErr => {
        if (commitErr) return res.status(500).json({ error: commitErr.message });
        triggerUpdate('standings');
        res.json({ success: true, summary: { totalRows: rows.length, importedRows: validRows.length, createdRows: created, updatedRows: updated } });
      });
    };

    validRows.forEach(row => {
      db.get(selectSql, [row.season, row.tournament, row.team_category, row.team_name], (getErr, existing) => {
        if (failed) return;
        if (getErr) {
          failed = true;
          return db.run('ROLLBACK', () => res.status(500).json({ error: getErr.message }));
        }

        const callback = err => {
          if (failed) return;
          if (err) {
            failed = true;
            return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));
          }
          completed += 1;
          if (completed === validRows.length) done();
        };

        if (existing) {
          updated += 1;
          db.run(updateSql, [row.played, row.won, row.lost, row.forfeit, row.points_for, row.points_against, row.point_difference, row.points, row.group_name, now, existing.id], callback);
        } else {
          created += 1;
          db.run(insertSql, [row.tournament, row.season, row.team_name, row.played, row.won, row.lost, row.forfeit, row.points_for, row.points_against, row.point_difference, row.points, row.group_name, row.team_category, now, now], callback);
        }
      });
    });
  });
}));

router.post('/standings', adminAuthMiddleware, calculateStandingsBody, validate(schemas.standings), asyncHandler(async (req, res) => {
  const { tournament, season, team_name, played, won, lost, forfeit, points_for, points_against, point_difference, points, group_name, team_category } = req.body;
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO standings (tournament, season, team_name, played, won, lost, forfeit, points_for, points_against, point_difference, points, group_name, team_category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tournament, season || null, team_name, played || 0, won || 0, lost || 0, forfeit || 0, points_for || 0, points_against || 0, point_difference || 0, points || 0, group_name || 'A', team_category || null, now, now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      triggerUpdate('standings');
      res.json({ success: true, standingsId: this.lastID });
    }
  );
}));

router.put('/standings/:id', adminAuthMiddleware, calculateStandingsBody, validate(schemas.standings), asyncHandler(async (req, res) => {
  const { tournament, season, team_name, played, won, lost, forfeit, points_for, points_against, point_difference, points, group_name, team_category } = req.body;
  const now = new Date().toISOString();

  // Ensure the record being updated belongs to the same season to prevent cross-season edits
  db.get('SELECT season FROM standings WHERE id = ?', [req.params.id], (getErr, row) => {
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!row) return res.status(404).json({ error: 'Standings entry not found.' });
    if (String(row.season || '') !== String(season || '')) {
      return res.status(400).json({ error: 'Season mismatch. Cannot modify a standings record for a different season.' });
    }

    db.run(
      'UPDATE standings SET tournament = ?, season = ?, team_name = ?, played = ?, won = ?, lost = ?, forfeit = ?, points_for = ?, points_against = ?, point_difference = ?, points = ?, group_name = ?, team_category = ?, updated_at = ? WHERE id = ?',
      [tournament, season || null, team_name, played || 0, won || 0, lost || 0, forfeit || 0, points_for || 0, points_against || 0, point_difference || 0, points || 0, group_name || null, team_category || null, now, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Standings entry not found.' });
        triggerUpdate('standings');
        res.json({ success: true });
      }
    );
  });
}));

router.delete('/standings', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  const { season, teamCategory } = req.query;
  const params = [];
  let where = '';

  if (season || teamCategory) {
    const clauses = [];
    if (season) {
      clauses.push('season = ?');
      params.push(season);
    }
    if (teamCategory) {
      clauses.push('LOWER(COALESCE(team_category, \"\")) = LOWER(?)');
      params.push(teamCategory);
    }
    where = ` WHERE ${clauses.join(' AND ')}`;
  }

  db.run(`DELETE FROM standings${where}`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    triggerUpdate('standings');
    res.json({ success: true, deletedRows: this.changes });
  });
}));

router.delete('/standings/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  db.run('DELETE FROM standings WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Standings entry not found.' });
    triggerUpdate('standings');
    res.json({ success: true });
  });
}));

// Polls admin routes
router.post('/polls', adminAuthMiddleware, validate(schemas.poll), asyncHandler(async (req, res) => {
  const { question, options } = req.body;
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO polls (question, options, status, created_at) VALUES (?, ?, ?, ?)',
    [question, JSON.stringify(options), 'active', now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      triggerUpdate('polls');
      res.json({ success: true, pollId: this.lastID });
    }
  );
}));

router.put('/polls/:id/status', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  db.run('UPDATE polls SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Poll not found.' });
    triggerUpdate('polls');
    res.json({ success: true });
  });
}));

router.delete('/polls/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  db.run('DELETE FROM polls WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Poll not found.' });
    triggerUpdate('polls');
    res.json({ success: true });
  });
}));

module.exports = router;
