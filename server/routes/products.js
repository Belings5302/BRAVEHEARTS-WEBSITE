const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { adminAuthMiddleware } = require('../middleware/admin-auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { triggerUpdate } = require('../utils');

// Public: Get all products
router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  let query = 'SELECT * FROM products';
  const params = [];

  if (search) {
    query += ' WHERE title LIKE ? OR sku LIKE ? OR category LIKE ? OR description LIKE ?';
    params.push(...Array(4).fill(`%${search}%`));
  }

  query += ' ORDER BY title';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ products: rows });
  });
}));

// Admin: Get all products
router.get('/admin', adminAuthMiddleware, asyncHandler(async (req, res) => {
  db.all('SELECT * FROM products ORDER BY title', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ products: rows });
  });
}));

// Admin: Create product
router.post('/admin', adminAuthMiddleware, validate(schemas.product), asyncHandler(async (req, res) => {
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

      res.json({ success: true, product: { id, title, sku, category, price_mwk, price_usd, description, is_new, image_url } });
    }
  );
}));

// Admin: Update product
router.put('/admin/:id', adminAuthMiddleware, validate(schemas.product), asyncHandler(async (req, res) => {
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

      res.json({ success: true, message: 'Product updated successfully.' });
    }
  );
}));

// Admin: Delete product
router.delete('/admin/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found.' });

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'delete_product', id, `Deleted product ${id}`, now]
    );

    res.json({ success: true, message: 'Product deleted successfully.' });
  });
}));

module.exports = router;
