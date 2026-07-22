/**
 * Password cloud saves via encrypted JSONBlob storage.
 * Password → PBKDF2 key → AES-GCM encrypt slot → store under SHA-256(password) in a shared index blob.
 *
 * Uses the IIIF arthistoricum JSONBlob mirror (CORS-friendly, no 24h expiry like jsonblob.com).
 */

const INDEX_BLOB_ID = 'abe06f51-85c5-11f1-bdf1-bdec50505d9e';
const INDEX_URL = `https://jsonblob.iiif.arthistoricum.net/api/jsonBlob/${INDEX_BLOB_ID}`;
const PEPPER = 'blob-survivor-cloud-v1';

function bytesToB64(bytes) {
  let s = '';
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

function b64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(password, saltBytes) {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${PEPPER}:${password}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 120000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptSlot(slotData, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plain = new TextEncoder().encode(JSON.stringify(slotData));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return {
    v: 1,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(ct)),
  };
}

async function decryptSlot(payload, password) {
  if (!payload?.salt || !payload?.iv || !payload?.ct) {
    throw new Error('Corrupt cloud save');
  }
  const salt = b64ToBytes(payload.salt);
  const iv = b64ToBytes(payload.iv);
  const ct = b64ToBytes(payload.ct);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(plain));
}

async function fetchIndex() {
  let res;
  try {
    res = await fetch(INDEX_URL, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('Could not reach cloud saves (network error)');
  }
  if (!res.ok) {
    throw new Error(`Could not reach cloud saves (${res.status})`);
  }
  const data = await res.json();
  if (!data || typeof data !== 'object') return { v: 1, game: 'blob-survivor', map: {} };
  if (!data.map || typeof data.map !== 'object') data.map = {};
  return data;
}

async function putIndex(index) {
  let res;
  try {
    res = await fetch(INDEX_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(index),
    });
  } catch {
    throw new Error('Could not write cloud save (network error)');
  }
  if (!res.ok) throw new Error(`Could not write cloud save (${res.status})`);
}

export function normalizePassword(raw) {
  return String(raw || '').trim();
}

export function validatePassword(password) {
  if (password.length < 4) return 'Password must be at least 4 characters.';
  if (password.length > 64) return 'Password is too long (max 64).';
  return null;
}

/** Upload / overwrite a cloud save for this password. */
export async function cloudSaveSlot(slotData, password) {
  const pw = normalizePassword(password);
  const err = validatePassword(pw);
  if (err) throw new Error(err);

  const key = await sha256Hex(`${PEPPER}|${pw}`);
  const encrypted = await encryptSlot(slotData, pw);
  const index = await fetchIndex();
  index.map[key] = {
    ...encrypted,
    updatedAt: Date.now(),
  };
  await putIndex(index);
  return true;
}

/** Download and decrypt a cloud save for this password. */
export async function cloudLoadSlot(password) {
  const pw = normalizePassword(password);
  const err = validatePassword(pw);
  if (err) throw new Error(err);

  const key = await sha256Hex(`${PEPPER}|${pw}`);
  const index = await fetchIndex();
  const entry = index.map?.[key];
  if (!entry) throw new Error('No cloud save found for that password.');
  return decryptSlot(entry, pw);
}
