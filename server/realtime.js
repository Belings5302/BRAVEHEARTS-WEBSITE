const WebSocket = require('ws');
const { onUpdate, getLastUpdates } = require('./utils');
const { logger } = require('./middleware/errorHandler');

function initRealtime(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  function send(ws, payload) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }

  function broadcast(payload) {
    const message = { type: 'update', ...payload };
    wss.clients.forEach(client => send(client, message));
  }

  wss.on('connection', ws => {
    send(ws, { type: 'connected', lastUpdates: getLastUpdates() });

    ws.on('error', error => {
      logger.warn(`WebSocket client error: ${error.message}`);
    });
  });

  const unsubscribe = onUpdate(broadcast);

  wss.on('close', () => {
    unsubscribe();
  });

  logger.info('WebSocket realtime server listening on /ws');
  return wss;
}

module.exports = { initRealtime };
