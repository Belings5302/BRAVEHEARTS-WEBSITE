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

router.get('/', asyncHandler(async (req, res) => {
  db.all('SELECT * FROM standings ORDER BY tournament ASC, season DESC, points DESC, won DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ standings: rows || [] });
  });
}));

router.post('/admin', adminAuthMiddleware, calculateStandingsBody, validate(schemas.standings), asyncHandler(async (req, res) => {
  const { tournament, season, team_name, played, won, lost, forfeit, points_for, points_against, point_difference, points, group_name, team_category } = req.body;
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO standings (tournament, season, team_name, played, won, lost, forfeit, points_for, points_against, point_difference, points, group_name, team_category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tournament, season, team_name, played || 0, won || 0, lost || 0, forfeit || 0, points_for || 0, points_against || 0, point_difference || 0, points || 0, group_name || '', team_category || null, now, now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      triggerUpdate('standings');
      res.json({ success: true, standingsId: this.lastID });
    }
  );
}));

router.put('/admin/:id', adminAuthMiddleware, calculateStandingsBody, validate(schemas.standings), asyncHandler(async (req, res) => {
  const { tournament, season, team_name, played, won, lost, forfeit, points, group_name, team_category } = req.body;
  const now = new Date().toISOString();

  // Ensure the record being updated belongs to the same season - prevent cross-season edits
  db.get('SELECT season FROM standings WHERE id = ?', [req.params.id], (getErr, row) => {
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!row) return res.status(404).json({ error: 'Standings entry not found.' });
    if (String(row.season || '') !== String(season || '')) {
      return res.status(400).json({ error: 'Season mismatch. Cannot modify a standings record for a different season.' });
    }

    db.run(
      'UPDATE standings SET tournament = ?, season = ?, team_name = ?, played = ?, won = ?, lost = ?, forfeit = ?, points = ?, group_name = ?, team_category = ?, updated_at = ? WHERE id = ?',
      [tournament, season, team_name, played, won, lost, forfeit || 0, points, group_name || '', team_category || null, now, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Standings entry not found.' });
        triggerUpdate('standings');
        res.json({ success: true });
      }
    );
  });
}));

router.delete('/admin/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  db.run('DELETE FROM standings WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Standings entry not found.' });
    triggerUpdate('standings');
    res.json({ success: true });
  });
}));

module.exports = router;
