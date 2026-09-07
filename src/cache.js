const store = new Map();

function getCached(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value, ttlMs) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

module.exports = { getCached, setCached };
