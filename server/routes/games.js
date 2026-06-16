const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { adminAuthMiddleware } = require('../middleware/admin-auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { triggerUpdate } = require('../utils');

// Public: Get all games
router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  let query = 'SELECT * FROM games';
  const params = [];

  if (search) {
    query += ' WHERE tournament LIKE ? OR opponent LIKE ? OR opponent_origin LIKE ? OR venue LIKE ? OR notes LIKE ? OR team LIKE ? OR status LIKE ?';
    params.push(...Array(7).fill(`%${search}%`));
  }

  query += ' ORDER BY game_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ games: rows });
  });
}));

// Public: Get game detail
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM games WHERE id = ?', [id], (err, game) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    res.json({ game });
  });
}));

// Public: Get game stats
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM player_stats WHERE game_id = ? AND is_active = 1 ORDER BY CAST(player_number AS INTEGER) ASC, player_number ASC', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ stats: rows || [] });
  });
}));

// Admin: Get all games
router.get('/admin/list', adminAuthMiddleware, asyncHandler(async (req, res) => {
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

// Admin: Get game detail
router.get('/admin/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM games WHERE id = ?', [id], (err, game) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    res.json({ game });
  });
}));

// Admin: Create game
router.post('/admin', adminAuthMiddleware, validate(schemas.game), asyncHandler(async (req, res) => {
  const { tournament, opponent, opponent_origin, team, our_score, opponent_score, is_home, status, outcome, game_date, game_time, venue, notes } = req.body;
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
}));

// Admin: Update game
router.put('/admin/:id', adminAuthMiddleware, validate(schemas.game), asyncHandler(async (req, res) => {
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
}));

// Admin: Delete game
router.delete('/admin/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
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

// Admin: Get player stats for a game
router.get('/admin/:id/stats', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM player_stats WHERE game_id = ? ORDER BY player_number ASC', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ stats: rows || [] });
  });
}));

// Admin: Create player stat entry
router.post('/admin/:id/stats', adminAuthMiddleware, asyncHandler(async (req, res) => {
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
}));

// Admin: Update player stats
router.put('/admin/stats/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { player_name, points, rebounds, assists, steals, blocks, fouls, turnovers, is_active } = req.body;
  const now = new Date().toISOString();

  const updates = [];
  const params = [];

  if (player_name !== undefined) { updates.push('player_name = ?'); params.push(player_name); }
  if (points !== undefined) { updates.push('points = ?'); params.push(points); }
  if (rebounds !== undefined) { updates.push('rebounds = ?'); params.push(rebounds); }
  if (assists !== undefined) { updates.push('assists = ?'); params.push(assists); }
  if (steals !== undefined) { updates.push('steals = ?'); params.push(steals); }
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

    db.run(
      'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'update_player_stat', id, `Updated player stats for stat ID ${id}`, now]
    );

    triggerUpdate('stats');
    res.json({ success: true, message: 'Player stats updated successfully.' });
  });
}));

// Admin: Delete player stat entry
router.delete('/admin/stats/:id', adminAuthMiddleware, asyncHandler(async (req, res) => {
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
        'SELECT SUM(points) as total_points FROM player_stats WHERE game_id = ? AND is_active = 1',
        [gameId],
        (sumErr, sumRow) => {
          if (!sumErr && sumRow && sumRow.total_points !== null) {
            db.run(
              'UPDATE games SET our_score = ?, updated_at = ? WHERE id = ?',
              [sumRow.total_points, now, gameId]
            );
          } else if (!sumErr && (!sumRow || sumRow.total_points === null)) {
            // If no active players, set score to null or 0
            db.run(
              'UPDATE games SET our_score = NULL, updated_at = ? WHERE id = ?',
              [now, gameId]
            );
          }
        }
      );

      db.run(
        'INSERT INTO admin_logs (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.admin.id, 'delete_player_stat', id, `Deleted player stat ${id}`, now]
      );

      triggerUpdate('stats');
      res.json({ success: true, message: 'Player removed successfully.' });
    });
  });
}));

// Admin: Update game score
router.put('/admin/:id/score', adminAuthMiddleware, asyncHandler(async (req, res) => {
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

module.exports = router;
