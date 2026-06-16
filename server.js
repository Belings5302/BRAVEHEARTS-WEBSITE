require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const crypto = require('crypto');
const { db, hashPassword } = require('./server/db');
const { adminAuthMiddleware } = require('./server/middleware/admin-auth');
const { securityHeaders, apiRateLimiter } = require('./server/middleware/security');
const { errorHandler, notFoundHandler, logger } = require('./server/middleware/errorHandler');
const { getLastUpdates } = require('./server/utils');
const { initRealtime } = require('./server/realtime');

// Import routes
const authRoutes = require('./server/routes/auth');
const productRoutes = require('./server/routes/products');
const orderRoutes = require('./server/routes/orders');
const gameRoutes = require('./server/routes/games');
const playerRoutes = require('./server/routes/players');
const newsRoutes = require('./server/routes/news');
const galleryRoutes = require('./server/routes/gallery');
const standingsRoutes = require('./server/routes/standings');
const pollsRoutes = require('./server/routes/polls');
const notificationRoutes = require('./server/routes/notifications');
const adminRoutes = require('./server/routes/admin');
const fibaRoutes = require('./server/routes/fiba');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Ensure logs directory exists
const logsPath = path.join(__dirname, 'logs');
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}

// Apply security middleware
app.use(securityHeaders);
app.use(apiRateLimiter);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

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

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.get('/api/updates', (req, res) => {
  res.json(getLastUpdates());
});

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/standings', standingsRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fiba', fibaRoutes);

// User subscription endpoint
app.get('/api/users/:id/subscription', (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.get(
    `SELECT status, expires_at FROM subscriptions
     WHERE user_id = ? AND status = 'active'
     ORDER BY expires_at DESC
     LIMIT 1`,
    [id],
    (subErr, subscription) => {
      if (subErr) return res.status(500).json({ error: subErr.message });

      const isActive = Boolean(subscription && String(subscription.expires_at || '') > now);
      const subscriptionStatus = isActive ? 'active' : 'inactive';

      db.get('SELECT id FROM users WHERE id = ?', [id], (userErr, user) => {
        if (userErr) return res.status(500).json({ error: userErr.message });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        db.run('UPDATE users SET subscription_status = ?, updated_at = ? WHERE id = ?', [subscriptionStatus, now, id]);
        res.json({ subscriptionStatus, expiresAt: subscription?.expires_at || null });
      });
    }
  );
});

// 404 handgetLer()
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Backend server listening on http://localhost:${PORT}`);
  console.log(`Backend server listening on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const message = `Port ${PORT} is already in use. Stop the existing server process or start this app with a different PORT, for example: PORT=3001 npm start`;
    logger.error(message);
    console.error(`\n${message}\n`);
    process.exit(1);
  }

  logger.error(`Server failed to start: ${error.message}`, { stack: error.stack });
  throw error;
});

initRealtime(server);
