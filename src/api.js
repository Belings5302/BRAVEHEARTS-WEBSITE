const API_BASE = import.meta?.env?.VITE_API_BASE_URL || '/api';

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'An unexpected error occurred.');
  }
  return data;
}

export async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  return handleResponse(response);
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(response);
}

export async function fetchProducts(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE}/products${query}`);
  return handleResponse(response);
}

export async function createOrder({ userId, items, paymentMethod, mobileMoneyNumber }) {
  const response = await fetch(`${API_BASE}/cart/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, items, paymentMethod, mobileMoneyNumber })
  });
  return handleResponse(response);
}

export async function confirmPayment(orderId) {
  const response = await fetch(`${API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId })
  });
  return handleResponse(response);
}

export async function fetchSubscription(userId) {
  const response = await fetch(`${API_BASE}/users/${userId}/subscription`);
  return handleResponse(response);
}

export async function fetchGames(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE}/games${query}`);
  return handleResponse(response);
}

export async function fetchPlayers(team = '') {
  const url = team ? `${API_BASE}/players?team=${team}` : `${API_BASE}/players`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchGameStats(gameId) {
  const response = await fetch(`${API_BASE}/games/${gameId}/stats`);
  return handleResponse(response);
}

export async function fetchNews(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE}/news${query}`);
  return handleResponse(response);
}

export async function fetchNewsDetail(id) {
  const response = await fetch(`${API_BASE}/news/${id}`);
  return handleResponse(response);
}

export async function fetchGallery() {
  const response = await fetch(`${API_BASE}/gallery`);
  return handleResponse(response);
}

export async function fetchStandings() {
  const response = await fetch(`${API_BASE}/standings`);
  return handleResponse(response);
}

export async function fetchPolls() {
  const response = await fetch(`${API_BASE}/polls`);
  return handleResponse(response);
}

export async function voteOnPoll(pollId, optionIndex, userId = null) {
  const response = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionIndex, userId })
  });
  return handleResponse(response);
}

export async function fetchNotifications(userId = null) {
  const url = userId ? `${API_BASE}/notifications?userId=${userId}` : `${API_BASE}/notifications`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchUserOrders(userId) {
  const response = await fetch(`${API_BASE}/users/${userId}/orders`);
  return handleResponse(response);
}

export async function forgotPassword(email) {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return handleResponse(response);
}

export async function resetPassword(token, newPassword) {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });
  return handleResponse(response);
}

// Exchange rate API - Fetch current MWK to USD rate
let exchangeRateCache = null;
let exchangeRateCacheTime = null;
const EXCHANGE_RATE_CACHE_DURATION = 3600000; // 1 hour in milliseconds

export async function getExchangeRate() {
  // Return cached rate if still valid
  if (exchangeRateCache && exchangeRateCacheTime && (Date.now() - exchangeRateCacheTime < EXCHANGE_RATE_CACHE_DURATION)) {
    return exchangeRateCache;
  }

  try {
    // exchangerate.host provides current rates without an API key.
    // Requesting from MWK to USD keeps the Fan Zone USD value derived from MWK.
    const response = await fetch('https://api.exchangerate.host/latest?base=MWK&symbols=USD');
    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data = await response.json();
    const mwkToUsdRate = Number(data?.rates?.USD);
    
    if (Number.isFinite(mwkToUsdRate) && mwkToUsdRate > 0) {
      exchangeRateCache = mwkToUsdRate;
      exchangeRateCacheTime = Date.now();
      return exchangeRateCache;
    }

    throw new Error('Exchange rate API response did not include a valid MWK to USD rate.');
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
  }

  // Fallback to a reasonable default rate if API fails
  return 0.0006; // Approximate MWK to USD rate
}

export function convertMWKtoUSD(mwkAmount, exchangeRate) {
  const amount = Number(mwkAmount);
  const rate = Number(exchangeRate);
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('A valid MWK amount and positive exchange rate are required.');
  }
  return amount * rate;
}
