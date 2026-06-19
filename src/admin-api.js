const ADMIN_API_BASE = import.meta?.env?.VITE_ADMIN_API_BASE_URL || '/api/admin';

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { error: await response.text().catch(() => '') };
  if (!response.ok) {
    const validationDetails = Array.isArray(data.errors)
      ? `: ${data.errors.slice(0, 6).map(detail => `Row ${detail.row || '?'} ${detail.field || 'field'} - ${detail.message || ''}`.trim()).join('; ')}`
      : '';
    const details = Array.isArray(data.details)
      ? `: ${data.details.map(detail => `${detail.field || 'field'} ${detail.message || ''}`.trim()).join(', ')}`
      : validationDetails;
    const message = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(`${message}${details}`);
  }
  return data;
}

export async function adminLogin(email, password) {
  const response = await fetch(`${ADMIN_API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(response);
}

export async function adminForgotPassword(email) {
  const response = await fetch(`${ADMIN_API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return handleResponse(response);
}

export async function adminResetPassword(token, newPassword) {
  const response = await fetch(`${ADMIN_API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });
  return handleResponse(response);
}

export async function adminLogout(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/logout`, {
    method: 'POST',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function fetchDashboardStats(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/dashboard/stats`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function fetchRecentOrders(sessionId, limit = 5) {
  const response = await fetch(`${ADMIN_API_BASE}/dashboard/recent-orders?limit=${limit}`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

// ============= ORDERS MANAGEMENT =============

export async function fetchAllOrders(sessionId, status = null, limit = 50, offset = 0) {
  let url = `${ADMIN_API_BASE}/orders?limit=${limit}&offset=${offset}`;
  if (status) url += `&status=${status}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function fetchOrderDetail(sessionId, orderId) {
  const response = await fetch(`${ADMIN_API_BASE}/orders/${orderId}`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function verifyOrderPayment(sessionId, orderId, decision, reason = '') {
  const response = await fetch(`${ADMIN_API_BASE}/orders/${orderId}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({ decision, reason })
  });
  return handleResponse(response);
}

export async function updateOrderStatus(sessionId, orderId, status) {
  const response = await fetch(`${ADMIN_API_BASE}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({ status })
  });
  return handleResponse(response);
}

// ============= PRODUCTS MANAGEMENT =============

export async function fetchAllProducts(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/products`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function createProduct(sessionId, productData) {
  const response = await fetch(`${ADMIN_API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(productData)
  });
  return handleResponse(response);
}

export async function updateProduct(sessionId, productId, productData) {
  const response = await fetch(`${ADMIN_API_BASE}/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(productData)
  });
  return handleResponse(response);
}

export async function deleteProduct(sessionId, productId) {
  const response = await fetch(`${ADMIN_API_BASE}/products/${productId}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

// ============= USERS MANAGEMENT =============

export async function fetchAllUsers(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/users`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function fetchUserDetail(sessionId, userId) {
  const response = await fetch(`${ADMIN_API_BASE}/users/${userId}`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function deleteUser(sessionId, userId) {
  const response = await fetch(`${ADMIN_API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function updateUserSubscription(sessionId, userId, subscriptionStatus) {
  const response = await fetch(`${ADMIN_API_BASE}/users/${userId}/subscription`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({ subscription_status: subscriptionStatus })
  });
  return handleResponse(response);
}

// ============= PAYMENT ANALYTICS =============

export async function fetchRevenueTrend(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/analytics/revenue-trend`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function fetchPaymentMethods(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/analytics/payment-methods`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function fetchSalesByCategory(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/analytics/sales-by-category`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

// ============= GAME SCHEDULES MANAGEMENT =============

export async function fetchAllGames(sessionId, status = null) {
  let url = `${ADMIN_API_BASE}/games`;
  if (status) url += `?status=${status}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function fetchGameDetail(sessionId, gameId) {
  const response = await fetch(`${ADMIN_API_BASE}/games/${gameId}`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function createGame(sessionId, gameData) {
  const response = await fetch(`${ADMIN_API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(gameData)
  });
  return handleResponse(response);
}

export async function updateGame(sessionId, gameId, gameData) {
  const response = await fetch(`${ADMIN_API_BASE}/games/${gameId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(gameData)
  });
  return handleResponse(response);
}

export async function deleteGame(sessionId, gameId) {
  const response = await fetch(`${ADMIN_API_BASE}/games/${gameId}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

// ============= PLAYER STATS MANAGEMENT =============

export async function fetchGameStats(sessionId, gameId) {
  const response = await fetch(`${ADMIN_API_BASE}/games/${gameId}/stats`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function createPlayerStat(sessionId, gameId, playerData) {
  const response = await fetch(`${ADMIN_API_BASE}/games/${gameId}/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(playerData)
  });
  return handleResponse(response);
}

export async function updatePlayerStat(sessionId, statId, playerData) {
  const response = await fetch(`${ADMIN_API_BASE}/stats/${statId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(playerData)
  });
  return handleResponse(response);
}

export async function deletePlayerStat(sessionId, statId) {
  const response = await fetch(`${ADMIN_API_BASE}/stats/${statId}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function updateGameScore(sessionId, gameId, scores) {
  const response = await fetch(`${ADMIN_API_BASE}/games/${gameId}/score`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(scores)
  });
  return handleResponse(response);
}

export async function importGameStatsFile(sessionId, gameId, file) {
  const response = await fetch(`${ADMIN_API_BASE}/games/${gameId}/stats/import`, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-file-name': file.name, 'x-session-id': sessionId },
    body: await file.arrayBuffer()
  });
  return handleResponse(response);
}

// ============= PLAYERS MANAGEMENT =============

export async function fetchAllPlayers(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/players`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function createPlayer(sessionId, playerData) {
  const response = await fetch(`${ADMIN_API_BASE}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(playerData)
  });
  return handleResponse(response);
}

export async function updatePlayer(sessionId, playerId, playerData) {
  const response = await fetch(`${ADMIN_API_BASE}/players/${playerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(playerData)
  });
  return handleResponse(response);
}

export async function deletePlayer(sessionId, playerId) {
  const response = await fetch(`${ADMIN_API_BASE}/players/${playerId}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

// ============= NEWS / BLOG MANAGEMENT =============

export async function createNews(sessionId, newsData) {
  const response = await fetch(`${ADMIN_API_BASE}/news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(newsData)
  });
  return handleResponse(response);
}

export async function updateNews(sessionId, id, newsData) {
  const response = await fetch(`${ADMIN_API_BASE}/news/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(newsData)
  });
  return handleResponse(response);
}

export async function deleteNews(sessionId, id) {
  const response = await fetch(`${ADMIN_API_BASE}/news/${id}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

// ============= GALLERY / MEDIA MANAGEMENT =============

export async function createGalleryItem(sessionId, galleryData) {
  const response = await fetch(`${ADMIN_API_BASE}/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(galleryData)
  });
  return handleResponse(response);
}

export async function deleteGalleryItem(sessionId, id) {
  const response = await fetch(`${ADMIN_API_BASE}/gallery/${id}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

// ============= STANDINGS / TOURNAMENT MANAGEMENT =============

export async function fetchAdminStandings(sessionId) {
  const response = await fetch(`${ADMIN_API_BASE}/standings`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function createStandingsEntry(sessionId, standingsData) {
  const response = await fetch(`${ADMIN_API_BASE}/standings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(standingsData)
  });
  return handleResponse(response);
}

export async function updateStandingsEntry(sessionId, id, standingsData) {
  const response = await fetch(`${ADMIN_API_BASE}/standings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(standingsData)
  });
  return handleResponse(response);
}

export async function deleteStandingsEntry(sessionId, id) {
  const response = await fetch(`${ADMIN_API_BASE}/standings/${id}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function clearStandingsTable(sessionId, { season = '', teamCategory = '' } = {}) {
  const params = new URLSearchParams();
  if (season) params.set('season', season);
  if (teamCategory) params.set('teamCategory', teamCategory);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${ADMIN_API_BASE}/standings${query}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

export async function importStandingsFile(sessionId, file) {
  try {
    const response = await fetch(`${ADMIN_API_BASE}/standings/import`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-file-name': file.name, 'x-session-id': sessionId },
      body: await file.arrayBuffer()
    });
    return handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Could not reach the server during standings import. Check Railway deployment/logs and try a smaller CSV/XLSX file.');
    }
    throw error;
  }
}

// ============= POLLS MANAGEMENT =============

export async function createPoll(sessionId, pollData) {
  const response = await fetch(`${ADMIN_API_BASE}/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(pollData)
  });
  return handleResponse(response);
}

export async function updatePollStatus(sessionId, id, status) {
  const response = await fetch(`${ADMIN_API_BASE}/polls/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({ status })
  });
  return handleResponse(response);
}

export async function deletePoll(sessionId, id) {
  const response = await fetch(`${ADMIN_API_BASE}/polls/${id}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId }
  });
  return handleResponse(response);
}

// ============= NOTIFICATIONS (ANNOUNCEMENTS) =============

export async function createNotification(sessionId, notificationData) {
  const response = await fetch(`${ADMIN_API_BASE}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(notificationData)
  });
  return handleResponse(response);
}

// ============= USER MANAGEMENT MIGRATION =============

export async function banUser(sessionId, userId, isBanned) {
  const response = await fetch(`${ADMIN_API_BASE}/users/${userId}/ban`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({ is_banned: isBanned })
  });
  return handleResponse(response);
}

// ============= FILE UPLOAD =============

export async function uploadImage(sessionId, fileName, fileData) {
  const response = await fetch(`${ADMIN_API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({ fileName, fileData })
  });
  return handleResponse(response);
}

// ============= CSV EXPORT =============

export async function exportReport(sessionId, type) {
  const response = await fetch(`${ADMIN_API_BASE}/reports/export?type=${type}`, {
    method: 'GET',
    headers: { 'x-session-id': sessionId }
  });
  if (!response.ok) {
    throw new Error('Failed to export CSV report.');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_report_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

