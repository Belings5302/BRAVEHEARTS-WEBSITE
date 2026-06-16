const redis = require('redis');
const { logger } = require('./errorHandler');

let redisClient = null;

// Initialize Redis client
function initRedis() {
  if (process.env.REDIS_HOST) {
    try {
      redisClient = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      });
      
      redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });
      
      redisClient.on('connect', () => {
        logger.info('Redis Client Connected');
      });
      
      redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
    }
  }
}

// Cache middleware factory
function cacheMiddleware(ttl = 3600) {
  return async (req, res, next) => {
    if (!redisClient) {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original res.json
      const originalJson = res.json;
      
      // Override res.json to cache response
      res.json = function(data) {
        redisClient.setEx(key, ttl, JSON.stringify(data)).catch(err => {
          logger.error('Cache set error:', err);
        });
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}

// Invalidate cache by pattern
async function invalidateCache(pattern) {
  if (!redisClient) return;
  
  try {
    const keys = await redisClient.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Invalidated ${keys.length} cache entries matching: ${pattern}`);
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
}

// Get cached value
async function getCache(key) {
  if (!redisClient) return null;
  
  try {
    const cached = await redisClient.get(`cache:${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
}

// Set cached value
async function setCache(key, value, ttl = 3600) {
  if (!redisClient) return;
  
  try {
    await redisClient.setEx(`cache:${key}`, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error('Cache set error:', error);
  }
}

module.exports = {
  initRedis,
  cacheMiddleware,
  invalidateCache,
  getCache,
  setCache
};
