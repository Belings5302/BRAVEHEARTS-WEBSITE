const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { adminAuthMiddleware } = require('../middleware/admin-auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { triggerUpdate } = require('../utils');

function superAdminOnly(req, res, next) {
  if (req.admin?.role !== 'super-admin') {
    return res.status(403).json({ error: 'Permission denied. Only Super Admins can delete resources.' });
  }
  next();
}

// Public: Get all news
router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  let query = 'SELECT * FROM news';
  const params = [];

  if (search) {
    query += ' WHERE title LIKE ? OR category LIKE ? OR content LIKE ?';
    params.push(...Array(3).fill(`%${search}%`));
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ news: rows || [] });
  });
}));

// Public: Get news article
router.get('/:id', asyncHandler(async (req, res) => {
  db.get('SELECT * FROM news WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Article not found.' });
    res.json({ article: row });
  });
}));

// Admin: Create news
router.post('/admin', adminAuthMiddleware, validate(schemas.news), asyncHandler(async (req, res) => {
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

// Admin: Update news
router.put('/admin/:id', adminAuthMiddleware, validate(schemas.news), asyncHandler(async (req, res) => {
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

// Admin: Delete news
router.delete('/admin/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  db.run('DELETE FROM news WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Article not found.' });
    triggerUpdate('news');
    res.json({ success: true });
  });
}));

module.exports = router;
