const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const { db, hashPassword } = require('./server/db');
const { adminAuthMiddleware } = require('./server/middleware/admin-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Track last updates for automatic page refreshes
const lastUpdates = {
  products: Date.now(),
  games: Date.now(),
  players: Date.now(),
  stats: Date.now(),
  news: Date.now(),
  gallery: Date.now(),
  polls: Date.now(),
  standings: Date.now(),
  notifications: Date.now()
};

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
    if (start) embedUrl.searchParams.set('start', String(parseYouTubeStartTime(start)));

    return embedUrl.toString();
  } catch {
    return rawUrl;
  }
}

function parseYouTubeStartTime(value) {
  if (/^\d+$/.test(value)) return Number(value);

  const hours = value.match(/(\d+)h/)?.[1] || 0;
  const minutes = value.match(/(\d+)m/)?.[1] || 0;
  const seconds = value.match(/(\d+)s/)?.[1] || 0;

  return (Number(hours) * 3600) + (Number(minutes) * 60) + Number(seconds);
}

function triggerUpdate(entity) {
  if (lastUpdates[entity] !== undefined) {
    lastUpdates[entity] = Date.now();
  }
}



app.use(cors());
app.use(express.json());

// Session middleware – looks up admin sessions from SQLite (persists across restarts)
app.use((req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    db.get(
      'SELECT admin_id, admin_email, admin_role FROM admin_sessions WHERE session_id = ?',
      [sessionId],
      (err, row) => {
        if (!err && row) {
          req.session = {
            adminId: row.admin_id,
            adminEmail: row.admin_email,
            adminRole: row.admin_role
          };
        }
        next();
      }
    );
  } else {
    next();
  }
});

// Serve static files (admin.html, frontend files, etc.)
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Endpoint for users/admins to poll for updates
app.get('/api/updates', (req, res) => {
  res.json(lastUpdates);
});

app.get('/api/products', async (req, res) => {
  db.all('SELECT * FROM products ORDER BY title', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ products: rows });
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

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
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

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
});

// ============= PASSWORD RESET FLOW =============

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    if (user) {
      db.run(
        'INSERT INTO password_reset_tokens (token, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
        [token, user.id, 'user', expiresAt, now]
      );
    }

    db.get('SELECT id FROM admins WHERE email = ?', [email], (err, admin) => {
      if (err) return res.status(500).json({ error: err.message });

      if (admin) {
        db.run(
          'INSERT INTO password_reset_tokens (token, admin_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
          [token, admin.id, 'admin', expiresAt, now]
        );
      }

      res.json({ success: true, message: 'If an account with that email exists, a password reset link has been generated.' });
    });
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

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
});

app.post('/api/cart/checkout', (req, res) => {
  const { userId, items, paymentMethod, mobileMoneyNumber } = req.body;
  if (!userId || !items || !items.length || !paymentMethod) {
    return res.status(400).json({ error: 'User, cart items, and payment method are required.' });
  }

  const reference = `BH-${Date.now()}`;
  const now = new Date().toISOString();
  const status = 'pending';

  const orderStmt = db.prepare('INSERT INTO orders (user_id, status, total_mwk, total_usd, payment_method, mobile_money_number, reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price_mwk, unit_price_usd, total_price_mwk, total_price_usd) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const paymentStmt = db.prepare('INSERT INTO payments (order_id, user_id, method, status, amount_mwk, amount_usd, reference, transaction_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  let totalMwk = 0;
  let totalUsd = 0;

  const productIds = items.map(item => item.productId);
  const placeholders = productIds.map(() => '?').join(',');
  db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds, (err, products) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!products.length) return res.status(400).json({ error: 'One or more products are invalid.' });

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    items.forEach(item => {
      const product = productMap[item.productId];
      if (!product) return;
      totalMwk += product.price_mwk * item.quantity;
      totalUsd += product.price_usd * item.quantity;
    });

    orderStmt.run(userId, status, totalMwk, totalUsd, paymentMethod, mobileMoneyNumber, reference, now, now, function (orderErr) {
      if (orderErr) return res.status(500).json({ error: orderErr.message });
      const orderId = this.lastID;

      items.forEach(item => {
        const product = productMap[item.productId];
        if (!product) return;
        const itemTotalMwk = product.price_mwk * item.quantity;
        const itemTotalUsd = product.price_usd * item.quantity;
        itemStmt.run(orderId, product.id, item.quantity, product.price_mwk, product.price_usd, itemTotalMwk, itemTotalUsd);
      });

      paymentStmt.run(orderId, userId, paymentMethod, 'initiated', totalMwk, totalUsd, reference, null, now, now, () => {
        const subscriptionItems = products.filter(p => p.category === 'Subscription' && items.some(i => i.productId === p.id));
        if (subscriptionItems.length) {
          const product = subscriptionItems[0];
          const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
          db.run('INSERT INTO subscriptions (user_id, product_id, status, price_mwk, price_usd, started_at, expires_at, payment_reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, product.id, 'pending', product.price_mwk, product.price_usd, now, expiresAt, reference, now, now]
          );
        }

        orderStmt.finalize();
        itemStmt.finalize();
        paymentStmt.finalize();

        res.json({ orderId, reference, message: 'Order created. Please complete the mobile money payment and confirm.' });
      });
    });
  });
});

app.post('/api/payments/confirm', (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required to confirm payment.' });
  }

  const now = new Date().toISOString();
  db.run('UPDATE payments SET status = ?, transaction_id = ?, updated_at = ? WHERE order_id = ?', ['confirmed', `MM-${Date.now()}`, now, orderId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Payment not found.' });

    db.run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', ['paid', now, orderId]);
    db.run('UPDATE subscriptions SET status = ?, updated_at = ? WHERE payment_reference = (SELECT reference FROM orders WHERE id = ?) ', ['active', now, orderId]);
    db.run('UPDATE users SET subscription_status = ? , updated_at = ? WHERE id = (SELECT user_id FROM orders WHERE id = ?)', ['active', now, orderId]);

    res.json({ success: true, message: 'Payment confirmed. Your order is now marked paid.' });
  });
});

app.get('/api/users/:id/subscription', (req, res) => {
  const { id } = req.params;
  db.get('SELECT subscription_status FROM users WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found.' });
    res.json({ subscriptionStatus: row.subscription_status });
  });
});

// ============= ADMIN ROUTES =============

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

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
});

// Admin Forgot Password
app.post('/api/admin/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

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
});

// Admin Reset Password
app.post('/api/admin/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

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
});

// Admin Logout
app.post('/api/admin/logout', adminAuthMiddleware, (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    db.run('DELETE FROM admin_sessions WHERE session_id = ?', [sessionId]);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Admin Dashboard Stats
app.get('/api/admin/dashboard/stats', adminAuthMiddleware, (req, res) => {
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
});

// Recent Orders
app.get('/api/admin/dashboard/recent-orders', adminAuthMiddleware, (req, res) => {
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
});

// ============= ORDERS MANAGEMENT =============

// Get all orders with optional filtering
app.get('/api/admin/orders', adminAuthMiddleware, (req, res) => {
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
});

// Get order detail
app.get('/api/admin/orders/:id', adminAuthMiddleware, (req, res) => {
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
});

// Update order status
app.put('/api/admin/orders/:id/status', adminAuthMiddleware, (req, res) => {
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

      // Log admin action
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'update_order_status', id, `Status changed to ${status}`, now]
      );

      // Trigger user notification
      db.get('SELECT user_id, reference FROM orders WHERE id = ?', [id], (err, orderRow) => {
        if (!err && orderRow) {
          const title = `Order Status Updated`;
          const message = `Your order ${orderRow.reference} is now marked as: ${status.toUpperCase()}.`;
          db.run('INSERT INTO notifications (user_id, title, message, created_at) VALUES (?, ?, ?, ?)', [orderRow.user_id, title, message, now]);
          triggerUpdate('notifications');
        }
      });

      res.json({ success: true, message: `Order status updated to ${status}.` });
    }
  );
});


// ============= PRODUCTS MANAGEMENT =============

// Get all products (admin version with more details)
app.get('/api/admin/products', adminAuthMiddleware, (req, res) => {
  db.all('SELECT * FROM products ORDER BY title', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ products: rows });
  });
});

// Create product
app.post('/api/admin/products', adminAuthMiddleware, (req, res) => {
  const { title, sku, category, price_mwk, price_usd, description, is_new, image_url } = req.body;

  if (!title || !sku || !category || !price_mwk || !price_usd) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const now = new Date().toISOString();
  const id = `p${Math.floor(Math.random() * 1000000)}`;

  db.run(
    'INSERT INTO products (id, title, sku, category, price_mwk, price_usd, description, is_new, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, sku, category, price_mwk, price_usd, description, is_new ? 1 : 0, image_url || '', now, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // Log admin action
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'create_product', id, `Created: ${title}`, now]
      );

      triggerUpdate('products');
      res.json({ success: true, product: { id, title, sku, category, price_mwk, price_usd, description, is_new, image_url } });
    }
  );
});

// Update product
app.put('/api/admin/products/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, sku, category, price_mwk, price_usd, description, is_new, image_url } = req.body;

  const now = new Date().toISOString();
  db.run(
    'UPDATE products SET title = ?, sku = ?, category = ?, price_mwk = ?, price_usd = ?, description = ?, is_new = ?, image_url = ?, updated_at = ? WHERE id = ?',
    [title, sku, category, price_mwk, price_usd, description, is_new ? 1 : 0, image_url || '', now, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not found.' });

      // Log admin action
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'update_product', id, `Updated: ${title}`, now]
      );

      triggerUpdate('products');
      res.json({ success: true, message: 'Product updated successfully.' });
    }
  );
});

// Delete product
app.delete('/api/admin/products/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found.' });

    // Log admin action
    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'delete_product', id, `Deleted product ${id}`, now]
    );

    triggerUpdate('products');
    res.json({ success: true, message: 'Product deleted successfully.' });
  });
});

// ============= USERS MANAGEMENT =============

// Get all users
app.get('/api/admin/users', adminAuthMiddleware, (req, res) => {
  db.all(
    `SELECT id, name, email, subscription_status, is_banned, created_at, updated_at FROM users ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ users: rows });
    }
  );
});

// Get user detail
app.get('/api/admin/users/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT id, name, email, subscription_status, is_banned, created_at, updated_at FROM users WHERE id = ?`,
    [id],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found.' });

      // Get user's subscriptions
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
});

// Update user subscription status
app.put('/api/admin/users/:id/subscription', adminAuthMiddleware, (req, res) => {
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

      // Log admin action
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'update_user_subscription', id, `Subscription changed to ${subscription_status}`, now]
      );

      res.json({ success: true, message: `User subscription updated to ${subscription_status}.` });
    }
  );
});

// ============= PAYMENT ANALYTICS =============

// Get revenue trend (last 30 days)
app.get('/api/admin/analytics/revenue-trend', adminAuthMiddleware, (req, res) => {
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
});

// Get payment method breakdown
app.get('/api/admin/analytics/payment-methods', adminAuthMiddleware, (req, res) => {
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
});

// Get sales by category
app.get('/api/admin/analytics/sales-by-category', adminAuthMiddleware, (req, res) => {
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
});

// ============= GAME SCHEDULES MANAGEMENT =============

// Public: Get all games (for frontend display)
app.get('/api/games', (req, res) => {
  db.all('SELECT * FROM games ORDER BY game_date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ games: rows });
  });
});

// Public: Get game detail (for frontend display)
app.get('/api/games/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM games WHERE id = ?', [id], (err, game) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    res.json({ game });
  });
});

// Admin: Get all games
app.get('/api/admin/games', adminAuthMiddleware, (req, res) => {
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
});

// Admin: Get game detail
app.get('/api/admin/games/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM games WHERE id = ?', [id], (err, game) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    res.json({ game });
  });
});

// Admin: Create game
app.post('/api/admin/games', adminAuthMiddleware, (req, res) => {
  const { tournament, opponent, opponent_origin, team, our_score, opponent_score, is_home, status, outcome, game_date, game_time, venue, notes } = req.body;

  if (!tournament || !opponent || !opponent_origin || !game_date) {
    return res.status(400).json({ error: 'Tournament, opponent, opponent origin, and game date are required.' });
  }

  const now = new Date().toISOString();
  db.run(
    'INSERT INTO games (tournament, opponent, opponent_origin, team, our_score, opponent_score, is_home, status, outcome, game_date, game_time, venue, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tournament, opponent, opponent_origin, team || 'men', our_score || null, opponent_score || null, is_home ? 1 : 0, status || 'upcoming', outcome || null, game_date, game_time || null, venue || null, notes || null, now, now],
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
});

// Admin: Update game
app.put('/api/admin/games/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const { tournament, opponent, opponent_origin, team, our_score, opponent_score, is_home, status, outcome, game_date, game_time, venue, notes } = req.body;

  const now = new Date().toISOString();
  db.run(
    'UPDATE games SET tournament = ?, opponent = ?, opponent_origin = ?, team = ?, our_score = ?, opponent_score = ?, is_home = ?, status = ?, outcome = ?, game_date = ?, game_time = ?, venue = ?, notes = ?, updated_at = ? WHERE id = ?',
    [tournament, opponent, opponent_origin, team, our_score || null, opponent_score || null, is_home ? 1 : 0, status, outcome || null, game_date, game_time || null, venue || null, notes || null, now, id],
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
});

// Admin: Delete game
app.delete('/api/admin/games/:id', adminAuthMiddleware, (req, res) => {
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
});

// ============= PLAYER STATS MANAGEMENT =============

// Get all player stats for a game
app.get('/api/admin/games/:id/stats', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;

  db.all('SELECT * FROM player_stats WHERE game_id = ? ORDER BY player_number ASC', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ stats: rows || [] });
  });
});

// Create a new player stat entry
app.post('/api/admin/games/:id/stats', adminAuthMiddleware, (req, res) => {
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

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'add_player_stat', id, `Added player ${player_name} (#${player_number}) for game ${id}`, now]
      );

      triggerUpdate('stats');
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
});

// Update player stats
app.put('/api/admin/stats/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const { player_name, points, rebounds, assists, steals, blocks, fouls, turnovers, is_active } = req.body;
  const now = new Date().toISOString();

  const updates = [];
  const params = [];

  if (player_name !== undefined) {
    updates.push('player_name = ?');
    params.push(player_name);
  }
  if (points !== undefined) {
    updates.push('points = ?');
    params.push(points);
  }
  if (rebounds !== undefined) {
    updates.push('rebounds = ?');
    params.push(rebounds);
  }
  if (assists !== undefined) {
    updates.push('assists = ?');
    params.push(assists);
  }
  if (steals !== undefined) {
    updates.push('steals = ?');
    params.push(steals);
  }
  if (blocks !== undefined) {
    updates.push('blocks = ?');
    params.push(blocks);
  }
  if (fouls !== undefined) {
    updates.push('fouls = ?');
    params.push(fouls);
  }
  if (turnovers !== undefined) {
    updates.push('turnovers = ?');
    params.push(turnovers);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided.' });
  }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  db.run(`UPDATE player_stats SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Player stat not found.' });

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'update_player_stat', id, `Updated player stats for stat ID ${id}`, now]
    );

    triggerUpdate('stats');
    res.json({ success: true, message: 'Player stats updated successfully.' });
  });
});

// Delete a player stat entry
app.delete('/api/admin/stats/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.run('DELETE FROM player_stats WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Player stat not found.' });

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'delete_player_stat', id, `Deleted player stat ${id}`, now]
    );

    triggerUpdate('stats');
    res.json({ success: true, message: 'Player removed successfully.' });
  });
});

// Update game score
app.put('/api/admin/games/:id/score', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const { our_score, opponent_score, status, outcome } = req.body;
  const now = new Date().toISOString();

  const updates = [];
  const params = [];

  if (our_score !== undefined) {
    updates.push('our_score = ?');
    params.push(our_score);
  }
  if (opponent_score !== undefined) {
    updates.push('opponent_score = ?');
    params.push(opponent_score);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (outcome !== undefined) {
    updates.push('outcome = ?');
    params.push(outcome);
  }

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
});

// ============= PLAYERS MANAGEMENT (ADMIN) =============

app.get('/api/admin/players', adminAuthMiddleware, (req, res) => {
  db.all('SELECT * FROM players ORDER BY team, name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ players: rows || [] });
  });
});

app.post('/api/admin/players', adminAuthMiddleware, (req, res) => {
  const { name, number, position, nationality, height, age, points_per_game, team, bio, career_highlights, image_url } = req.body;
  if (!name || !number || !position || !team) {
    return res.status(400).json({ error: 'Name, number, position, and team are required.' });
  }

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
});

app.put('/api/admin/players/:id', adminAuthMiddleware, (req, res) => {
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
});

app.delete('/api/admin/players/:id', adminAuthMiddleware, superAdminOnly, (req, res) => {
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
});

// ============= PLAYERS MANAGEMENT (PUBLIC) =============

app.get('/api/players', (req, res) => {
  const { team } = req.query;
  let query = 'SELECT * FROM players';
  const params = [];

  if (team) {
    query += ' WHERE team = ?';
    params.push(team);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ players: rows || [] });
  });
});

// Public: Get game stats for display
app.get('/api/games/:id/stats', (req, res) => {
  const { id } = req.params;

  db.all('SELECT * FROM player_stats WHERE game_id = ? AND is_active = 1 ORDER BY points DESC, player_number ASC', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ stats: rows || [] });
  });
});

// Middleware to restrict delete operations to Super Admins only
function superAdminOnly(req, res, next) {
  if (req.admin?.role !== 'super-admin') {
    return res.status(403).json({ error: 'Permission denied. Only Super Admins can delete resources.' });
  }
  next();
}

// ============= NEWS / BLOG ENDPOINTS =============

app.get('/api/news', (req, res) => {
  db.all('SELECT * FROM news ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ news: rows || [] });
  });
});

app.get('/api/news/:id', (req, res) => {
  db.get('SELECT * FROM news WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Article not found.' });
    res.json({ article: row });
  });
});

app.post('/api/admin/news', adminAuthMiddleware, (req, res) => {
  const { title, category, content, image_url } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'Title, category, and content are required.' });
  }
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
});

app.put('/api/admin/news/:id', adminAuthMiddleware, (req, res) => {
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
});

app.delete('/api/admin/news/:id', adminAuthMiddleware, superAdminOnly, (req, res) => {
  db.run('DELETE FROM news WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Article not found.' });
    triggerUpdate('news');
    res.json({ success: true });
  });
});

// ============= GALLERY / MEDIA ENDPOINTS =============

app.get('/api/gallery', (req, res) => {
  db.all('SELECT * FROM gallery ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ gallery: rows || [] });
  });
});

app.post('/api/admin/gallery', adminAuthMiddleware, (req, res) => {
  const { title, media_type, media_url } = req.body;
  if (!title || !media_type || !media_url) {
    return res.status(400).json({ error: 'Title, media type, and media URL are required.' });
  }
  const now = new Date().toISOString();
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
});

app.delete('/api/admin/gallery/:id', adminAuthMiddleware, superAdminOnly, (req, res) => {
  db.run('DELETE FROM gallery WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Gallery item not found.' });
    triggerUpdate('gallery');
    res.json({ success: true });
  });
});

// ============= STANDINGS ENDPOINTS =============

app.get('/api/standings', (req, res) => {
  db.all('SELECT * FROM standings ORDER BY tournament ASC, points DESC, won DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ standings: rows || [] });
  });
});

app.post('/api/admin/standings', adminAuthMiddleware, (req, res) => {
  const { tournament, team_name, played, won, lost, points, group_name, team_category } = req.body;
  if (!tournament || !team_name) {
    return res.status(400).json({ error: 'Tournament and team name are required.' });
  }
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO standings (tournament, team_name, played, won, lost, points, group_name, team_category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tournament, team_name, played || 0, won || 0, lost || 0, points || 0, group_name || 'A', team_category || null, now, now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      triggerUpdate('standings');
      res.json({ success: true, standingsId: this.lastID });
    }
  );
});

app.put('/api/admin/standings/:id', adminAuthMiddleware, (req, res) => {
  const { tournament, team_name, played, won, lost, points, group_name, team_category } = req.body;
  const now = new Date().toISOString();
  db.run(
    'UPDATE standings SET tournament = ?, team_name = ?, played = ?, won = ?, lost = ?, points = ?, group_name = ?, team_category = ?, updated_at = ? WHERE id = ?',
    [tournament, team_name, played, won, lost, points, group_name, team_category || null, now, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Standings entry not found.' });
      triggerUpdate('standings');
      res.json({ success: true });
    }
  );
});

app.delete('/api/admin/standings/:id', adminAuthMiddleware, superAdminOnly, (req, res) => {
  db.run('DELETE FROM standings WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Standings entry not found.' });
    triggerUpdate('standings');
    res.json({ success: true });
  });
});

// ============= POLLS & VOTING ENDPOINTS =============

app.get('/api/polls', (req, res) => {
  db.all('SELECT * FROM polls ORDER BY created_at DESC', [], (err, polls) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all('SELECT poll_id, option_index, COUNT(*) as vote_count FROM poll_votes GROUP BY poll_id, option_index', [], (err, votes) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const votesMap = {};
      votes.forEach(v => {
        if (!votesMap[v.poll_id]) votesMap[v.poll_id] = {};
        votesMap[v.poll_id][v.option_index] = v.vote_count;
      });

      const formattedPolls = polls.map(p => {
        let optionsList = [];
        try {
          optionsList = JSON.parse(p.options);
        } catch(e) {
          optionsList = [];
        }
        
        const optionVotes = optionsList.map((opt, idx) => ({
          option: opt,
          votes: (votesMap[p.id] && votesMap[p.id][idx]) || 0
        }));

        return {
          id: p.id,
          question: p.question,
          status: p.status,
          options: optionVotes,
          created_at: p.created_at
        };
      });

      res.json({ polls: formattedPolls });
    });
  });
});

app.post('/api/polls/:id/vote', (req, res) => {
  const pollId = req.params.id;
  const { optionIndex, userId } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const now = new Date().toISOString();

  if (optionIndex === undefined) {
    return res.status(400).json({ error: 'Option index is required.' });
  }

  db.get('SELECT status FROM polls WHERE id = ?', [pollId], (err, poll) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!poll) return res.status(404).json({ error: 'Poll not found.' });
    if (poll.status !== 'active') {
      return res.status(400).json({ error: 'This poll has been closed.' });
    }

    let checkQuery = 'SELECT id FROM poll_votes WHERE poll_id = ? AND (ip_address = ?';
    const checkParams = [pollId, ipAddress];
    if (userId) {
      checkQuery += ' OR user_id = ?';
      checkParams.push(userId);
    }
    checkQuery += ')';

    db.get(checkQuery, checkParams, (err, voted) => {
      if (err) return res.status(500).json({ error: err.message });
      if (voted) {
        return res.status(400).json({ error: 'You have already voted in this poll.' });
      }

      db.run(
        'INSERT INTO poll_votes (poll_id, user_id, option_index, ip_address, created_at) VALUES (?, ?, ?, ?, ?)',
        [pollId, userId || null, optionIndex, ipAddress, now],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          triggerUpdate('polls');
          res.json({ success: true, message: 'Vote submitted successfully.' });
        }
      );
    });
  });
});

app.post('/api/admin/polls', adminAuthMiddleware, (req, res) => {
  const { question, options } = req.body;
  if (!question || !options || !options.length) {
    return res.status(400).json({ error: 'Question and options are required.' });
  }
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
});

app.put('/api/admin/polls/:id/status', adminAuthMiddleware, (req, res) => {
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
});

app.delete('/api/admin/polls/:id', adminAuthMiddleware, superAdminOnly, (req, res) => {
  db.run('DELETE FROM polls WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Poll not found.' });
    triggerUpdate('polls');
    res.json({ success: true });
  });
});

// ============= NOTIFICATION ENDPOINTS =============

app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  let query = 'SELECT * FROM notifications WHERE user_id IS NULL';
  const params = [];
  
  if (userId) {
    query += ' OR user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ notifications: rows || [] });
  });
});

app.post('/api/admin/notifications', adminAuthMiddleware, (req, res) => {
  const { user_id, title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }
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
});

// ============= USER MANAGEMENT MIGRATION ENDPOINT =============

app.put('/api/admin/users/:id/ban', adminAuthMiddleware, (req, res) => {
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
});

// ============= FILE UPLOAD ENDPOINT =============

app.post('/api/admin/upload', adminAuthMiddleware, (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'Filename and base64 data are required.' });
  }

  const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');
  
  const extension = path.extname(fileName) || '.jpg';
  const cleanName = `upload-${Date.now()}-${Math.floor(Math.random() * 10000)}${extension}`;
  const filePath = path.join(__dirname, 'uploads', cleanName);

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save uploaded file.' });
    }
    res.json({ success: true, url: `/uploads/${cleanName}`, imageUrl: `/uploads/${cleanName}` });
  });
});

// ============= CSV REPORT EXPORT ENDPOINT =============

app.get('/api/admin/reports/export', adminAuthMiddleware, (req, res) => {
  const { type } = req.query; // 'sales', 'games', 'users'

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
});

// GET user orders (public/user specific)
app.get('/api/users/:id/orders', (req, res) => {
  const { id } = req.params;
  db.all(
    'SELECT id, reference, status, total_mwk, total_usd, payment_method, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ orders: rows || [] });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
