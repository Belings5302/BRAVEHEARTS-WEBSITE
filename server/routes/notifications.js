const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { adminAuthMiddleware } = require('../middleware/admin-auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { triggerUpdate } = require('../utils');


// Public: Get notifications
router.get('/', asyncHandler(async (req, res) => {
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
}));

// Admin: Create notification
router.post(['/admin', '/'], adminAuthMiddleware, validate(schemas.notification), asyncHandler(async (req, res) => {
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

module.exports = router;
module.exports = router;
