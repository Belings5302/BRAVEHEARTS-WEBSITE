const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { validate, schemas } = require('../middleware/validation');
const { adminAuthMiddleware } = require('../middleware/admin-auth');
const { asyncHandler } = require('../middleware/errorHandler');

function superAdminOnly(req, res, next) {
  if (req.admin?.role !== 'super-admin') {
    return res.status(403).json({ error: 'Permission denied. Only Super Admins can delete resources.' });
  }
  next();
}


// Public: Get all polls with vote counts
router.get('/', asyncHandler(async (req, res) => {
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
}));

// Public: Vote on a poll
router.post('/:id/vote', asyncHandler(async (req, res) => {
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
}));

// Admin: Create poll
router.post('/admin', adminAuthMiddleware, validate(schemas.poll), asyncHandler(async (req, res) => {
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

// Admin: Update poll status
router.put('/admin/:id/status', adminAuthMiddleware, asyncHandler(async (req, res) => {
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

// Admin: Delete poll
router.delete('/admin/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  db.run('DELETE FROM polls WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Poll not found.' });
    triggerUpdate('polls');
    res.json({ success: true });
  });
}));

module.exports = router;
module.exports = router;
