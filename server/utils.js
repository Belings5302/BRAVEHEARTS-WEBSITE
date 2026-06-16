// Shared utilities

const updateListeners = new Set();

let lastUpdates = {
  products: Date.now(),
  games: Date.now(),
  players: Date.now(),
  stats: Date.now(),
  news: Date.now(),
  gallery: Date.now(),
  polls: Date.now(),
  standings: Date.now(),
  notifications: Date.now()
};

function triggerUpdate(entity) {
  if (lastUpdates[entity] !== undefined) {
    lastUpdates[entity] = Date.now();
    const payload = { entity, timestamp: lastUpdates[entity], lastUpdates: { ...lastUpdates } };
    updateListeners.forEach(listener => listener(payload));
  }
}

function getLastUpdates() {
  return lastUpdates;
}

function onUpdate(listener) {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

module.exports = {
  triggerUpdate,
  getLastUpdates,
  onUpdate
};
