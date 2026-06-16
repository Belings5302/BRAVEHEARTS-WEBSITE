const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { adminAuthMiddleware } = require('../middleware/admin-auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Checkout
router.post('/checkout', validate(schemas.checkout), asyncHandler(async (req, res) => {
  const { userId, items, paymentMethod, mobileMoneyNumber } = req.body;
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
}));

// Confirm payment
router.post('/payments/confirm', validate(schemas.confirmPayment), asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const now = new Date().toISOString();

  db.run('UPDATE payments SET status = ?, transaction_id = ?, updated_at = ? WHERE order_id = ?', ['confirmed', `MM-${Date.now()}`, now, orderId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Payment not found.' });

    db.run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', ['paid', now, orderId]);
    db.run('UPDATE subscriptions SET status = ?, updated_at = ? WHERE payment_reference = (SELECT reference FROM orders WHERE id = ?) ', ['active', now, orderId]);
    db.run('UPDATE users SET subscription_status = ? , updated_at = ? WHERE id = (SELECT user_id FROM orders WHERE id = ?)', ['active', now, orderId]);

    res.json({ success: true, message: 'Payment confirmed. Your order is now marked paid.' });
  });
}));

// Get user orders
router.get('/users/:id/orders', asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.all(
    'SELECT id, reference, status, total_mwk, total_usd, payment_method, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ orders: rows || [] });
    }
  );
}));

// Admin: Get all orders
router.get('/admin', adminAuthMiddleware, asyncHandler(async (req, res) => {
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

// Admin: Get order detail
router.get('/admin/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
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

// Admin: Update order status
router.put('/admin/:id/status', adminAuthMiddleware, asyncHandler(async (req, res) => {
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

module.exports = router;
