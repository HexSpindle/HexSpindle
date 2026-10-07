const PREFIX = 'hexspindle.service.';
const memory = new Map();

function storage() {
  try { return globalThis.sessionStorage || null; } catch { return null; }
}

export function getServiceCredential(service) {
  const key = PREFIX + service;
  try {
    const s = storage();
    if (s) {
      const value = s.getItem(key);
      if (value != null) return value;
    }
  } catch { /* fall back to memory */ }
  return memory.get(key) || '';
}

export function setServiceCredential(service, value) {
  const key = PREFIX + service;
  const text = String(value ?? '');
  memory.set(key, text);
  try {
    const s = storage();
    if (s) {
      if (text) s.setItem(key, text);
      else s.removeItem(key);
    }
  } catch { /* memory still works */ }
  return text;
}

export function clearServiceCredential(service) {
  const key = PREFIX + service;
  memory.delete(key);
  try { storage()?.removeItem(key); } catch { /* ignore */ }
}
