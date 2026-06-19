const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// Security headers with Helmet
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://accounts.google.com", "https://apis.google.com", "https://*.gstatic.com"],
      frameSrc: ["'self'", "https://accounts.google.com", "https://*.google.com"],
      connectSrc: ["'self'", "http://localhost:3000", "https://accounts.google.com", "https://oauth2.googleapis.com", "https://www.googleapis.com", "https://*.google.com", "https://*.gstatic.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting configuration
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
// More lenient limits for development
const isDevelopment = process.env.NODE_ENV !== 'production';
const authRateLimiter = createRateLimiter(
  isDevelopment ? 60 * 1000 : 15 * 60 * 1000, 
  isDevelopment ? 100 : 5, 
  'Too many authentication attempts, please try again later'
);
const apiRateLimiter = createRateLimiter(
  isDevelopment ? 60 * 1000 : 15 * 60 * 1000, 
  isDevelopment ? 1000 : 100, 
  'Too many API requests'
);
const strictRateLimiter = createRateLimiter(
  isDevelopment ? 60 * 1000 : 60 * 1000, 
  isDevelopment ? 100 : 10, 
  'Too many requests from this IP'
);

// CSRF Token Generation
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF Protection Middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

// CSRF Token Middleware - generates and validates tokens
const csrfTokenMiddleware = (req, res, next) => {
  if (!req.session) {
    return next();
  }

  // Generate new token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  // Make token available to templates/views
  res.locals.csrfToken = req.session.csrfToken;
  
  next();
};

module.exports = {
  securityHeaders,
  authRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  cookieParser,
  csrfProtection,
  csrfTokenMiddleware,
  generateCSRFToken,
};
