/**
 * HexSpindle user-supplied AI credentials and provider requests.
 * Secrets are stored locally in IndexedDB, not encrypted and not synchronized.
 * Browser DevTools, extensions, and code on this origin can access them.
 * A backend proxy is required for production-grade secret protection.
 */
export const AI_PROVIDERS = Object.freeze({
  anthropic: {
    label: 'Anthropic (Claude)',
    model: 'claude-sonnet-5-5',
    help: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-…',
    listUrl: 'https://api.anthropic.com/v1/models?limit=100',
    suggestUrl: 'https://api.anthropic.com/v1/messages',
  },
  openai: {
    label: 'OpenAI',
    model: 'gpt-6-luna',
    help: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-…',
    listUrl: 'https://api.openai.com/v1/models',
    suggestUrl: 'https://api.openai.com/v1/responses',
  },
});

const DB_NAME = 'hexspindle-user-settings';
const STORE_NAME = 'apiKeys';
const DB_VERSION = 1;

function assertProvider(provider) {
  if (!Object.hasOwn(AI_PROVIDERS, provider)) throw new Error('Unsupported AI provider');
}

function openDb() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB is not available in this browser'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'provider' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another open tab'));
  });
}

async function transact(provider, method, value) {
  assertProvider(provider);
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, method === 'get' ? 'readonly' : 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = method === 'get' ? store.get(provider)
        : method === 'delete' ? store.delete(provider) : store.put(value);
      let result;
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || req.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  } finally { db.close(); }
}

export async function loadAISetting(provider) {
  const r = await transact(provider, 'get');
  return r && typeof r.key === 'string' ? r : null;
}

export async function saveAISetting(provider, key, model) {
  assertProvider(provider);
  if (typeof key !== 'string' || !key.trim()) throw new Error('Enter an API key');
  const value = { provider, key: key.trim(), model: String(model || AI_PROVIDERS[provider].model).trim(), saved: Date.now() };
  if (!value.model) throw new Error('Enter a model ID');
  await transact(provider, 'put', value);
  return value;
}

export async function deleteAISetting(provider) { await transact(provider, 'delete'); }

// Migration is a one-time move; delete localStorage only after IndexedDB commit.
export async function migrateLegacyAnthropicKey(storage = globalThis.localStorage) {
  let legacy;
  try { legacy = storage?.getItem('df.anthropicKey'); } catch { return false; }
  if (!legacy) return false;
  let key;
  try { key = JSON.parse(legacy); } catch { key = legacy; }
  if (typeof key !== 'string' || !key.trim()) return false;
  const existing = await loadAISetting('anthropic');
  if (!existing) await saveAISetting('anthropic', key, AI_PROVIDERS.anthropic.model);
  try { storage.removeItem('df.anthropicKey'); } catch { /* removal denied */ }
  return true;
}

export function maskAIKey(key) {
  if (!key) return '';
  const head = key.slice(0, Math.min(6, Math.max(2, key.length - 5)));
  return head + '••••••••' + (key.length > 10 ? key.slice(-4) : '');
}

function headersFor(provider, key) {
  assertProvider(provider);
  return provider === 'anthropic'
    ? { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
    : { Authorization: 'Bearer ' + key };
}

export function readableAIError(provider, err) {
  const msg = String(err?.message || err || 'Unknown error');
  // Avoid displaying an API key if a vendor unexpectedly reflects it.
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(msg))
    return `Browser could not reach ${AI_PROVIDERS[provider]?.label || 'the provider'} (CORS, connection, or browser policy). A valid key may still be blocked; a secure server-side proxy may be required.`;
  return msg;
}

async function request(provider, key, url, init = {}) {
  assertProvider(provider);
  let response;
  try {
    response = await fetch(url, {
      ...init, headers: { ...headersFor(provider, key), ...(init.headers || {}) },
      credentials: 'omit', cache: 'no-store',
      signal: init.signal || (typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(35000) : undefined),
    });
  } catch (e) { throw new Error(readableAIError(provider, e)); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.error?.message || body.message || `HTTP ${response.status}`;
    const e = new Error(`${response.status}: ${String(detail).slice(0, 400)}`);
    e.status = response.status;
    throw e;
  }
  return body;
}

/** A checkmark is valid only if model listing succeeds AND the requested model is visible. */
export async function verifyAIConnection(provider, key, model = AI_PROVIDERS[provider]?.model) {
  assertProvider(provider);
  const body = await request(provider, key, AI_PROVIDERS[provider].listUrl);
  const models = (Array.isArray(body.data) ? body.data : []).map(item => item?.id).filter(x => typeof x === 'string');
  if (!models.length) throw new Error('Provider returned no available model IDs');
  const wanted = String(model || '').trim();
  if (!models.includes(wanted)) {
    throw new Error(`Key is accepted, but model “${wanted}” is not in the available model list. Select a model your account can use.`);
  }
  return { ok: true, model: wanted, count: models.length };
}

export function parseAISuggestion(raw, names) {
  // Models sometimes wrap JSON in a Markdown fence; never interpret arbitrary JS.
  const m = String(raw || '').match(/\[[\s\S]*?\]/);
  if (!m) throw new Error('The model did not return a JSON list of operations');
  let arr;
  try { arr = JSON.parse(m[0]); } catch { throw new Error('The model returned invalid recipe JSON'); }
  if (!Array.isArray(arr) || arr.some(x => typeof x !== 'string')) throw new Error('The suggested recipe must be a list of operation names');
  if (arr.length > 30) throw new Error('The suggested recipe is too long (maximum 30 operations)');
  const allowed = new Set(names);
  const unknown = arr.filter(x => !allowed.has(x));
  return { names: arr.filter(x => allowed.has(x)), unknown };
}

/** Never puts the user's key in the prompt or on the page; only in Authorization headers. */
export async function requestAISuggestion(provider, key, model, prompt, validNames) {
  assertProvider(provider);
  const body = provider === 'anthropic'
    ? { model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }
    : { model, max_output_tokens: 1200, store: false, input: [{ role: 'user', content: prompt }] };
  const j = await request(provider, key, AI_PROVIDERS[provider].suggestUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const content = provider === 'anthropic'
    ? (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('')
    : (j.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('') || j.output_text || '';
  return parseAISuggestion(content, validNames);
}
