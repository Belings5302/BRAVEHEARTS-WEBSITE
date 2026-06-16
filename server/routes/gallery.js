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

// Public: Get all gallery items
router.get('/', asyncHandler(async (req, res) => {
  db.all('SELECT * FROM gallery ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ gallery: rows || [] });
  });
}));

// Admin: Create gallery item
router.post('/admin', adminAuthMiddleware, validate(schemas.gallery), asyncHandler(async (req, res) => {
  const { title, media_type, media_url } = req.body;
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
}));

// Admin: Delete gallery item
router.delete('/admin/:id', adminAuthMiddleware, superAdminOnly, asyncHandler(async (req, res) => {
  db.run('DELETE FROM gallery WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Gallery item not found.' });
    triggerUpdate('gallery');
    res.json({ success: true });
  });
}));

module.exports = router;
