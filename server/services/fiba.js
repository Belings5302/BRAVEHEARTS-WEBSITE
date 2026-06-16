const { logger } = require('../middleware/errorHandler');

const DEFAULT_BASE_URL = 'https://api.fiba.basketball';
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_PAGE_SIZE = 100;

class FibaApiError extends Error {
  constructor(message, statusCode = 502, details = null) {
    super(message);
    this.name = 'FibaApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getConfig() {
  const apiKey = process.env.FIBA_API_KEY;
  const baseUrl = (process.env.FIBA_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const timeoutMs = Number(process.env.FIBA_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  if (!apiKey) {
    throw new FibaApiError('FIBA API is not configured. Set FIBA_API_KEY in the server environment.', 503);
  }

  return { apiKey, baseUrl, timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS };
}

function sanitizePath(resourcePath) {
  const path = String(resourcePath || '').trim();
  if (!path || path.includes('..') || path.startsWith('http://') || path.startsWith('https://')) {
    throw new FibaApiError('Invalid FIBA resource path.', 400);
  }
  return path.startsWith('/') ? path : `/${path}`;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

async function requestFiba(resourcePath, params = {}) {
  const { apiKey, baseUrl, timeoutMs } = getConfig();
  const path = sanitizePath(resourcePath);
  const query = buildQuery(params);
  const url = `${baseUrl}${path}${query ? `?${query}` : ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
        'x-api-key': apiKey,
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let body = null;
    if (text) {
      try { body = JSON.parse(text); } catch (_) { body = { raw: text }; }
    }

    if (!response.ok) {
      logger.warn('FIBA API request failed', { status: response.status, path });
      throw new FibaApiError('FIBA API request failed.', response.status >= 500 ? 502 : response.status, body);
    }

    return body;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new FibaApiError('FIBA API request timed out.', 504);
    }
    if (error instanceof FibaApiError) throw error;
    throw new FibaApiError('Unable to reach FIBA API.', 502);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePageSize(value) {
  const pageSize = Number(value || 25);
  if (!Number.isInteger(pageSize) || pageSize < 1) return 25;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

module.exports = {
  requestFiba,
  normalizePageSize,
};
