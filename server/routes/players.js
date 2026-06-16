const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { adminAuthMiddleware } = require('../middleware/admin-auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { triggerUpdate } = require('../utils');

// Middleware to restrict delete operations to Super Admins only
function superAdminOnly(req, res, next) {
  if (req.admin?.role !== 'super-admin') {
    return res.status(403).json({ error: 'Permission denied. Only Super Admins can delete resources.' });
  }
  next();
}

// Public: Get all players
router.get('/', asyncHandler(async (req, res) => {
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
}));

// Admin: Get all players
router.get('/admin', adminAuthMiddleware, asyncHandler(async (req, res) => {
  db.all('SELECT * FROM players ORDER BY team, name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ players: rows || [] });
  });
}));

// Admin: Create player
router.post('/admin', adminAuthMiddleware, validate(schemas.player), asyncHandler(async (req, res) => {
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

// Admin: Update player
router.put('/admin/:id', adminAuthMiddleware, validate(schemas.player), asyncHandler(async (req, res) => {
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

// Admin: Delete player
router.delete('/admin/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
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

module.exports = router;
