/**
 * Web Crypto AES-GCM encryption for sensitive localStorage values.
 *
 * Uses IndexedDB to persist a wrapping key across page reloads so that
 * server passwords, n9router API keys, and memory API keys are not
 * stored in plaintext in localStorage.
 *
 * If Web Crypto or IndexedDB is unavailable (non-HTTPS, restricted
 * environment), the module falls back gracefully to pass-through
 * (plaintext) storage with a console.warn.
 */

const DB_NAME = "pilot-crypto";
const STORE_NAME = "keys";
const KEY_NAME = "aes-gcm-key";

let cachedKey: CryptoKey | null = null;

// ── IndexedDB helpers ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Key lifecycle ──────────────────────────────────────────────────────────

async function getOrCreateKey(): Promise<CryptoKey | null> {
  if (cachedKey) return cachedKey;

  try {
    const db = await openDB();

    // Try to retrieve an existing key from IndexedDB
    const stored = await new Promise<ArrayBuffer | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(KEY_NAME);
        req.onsuccess = () => resolve(req.result as ArrayBuffer | undefined);
        req.onerror = () => reject(req.error);
      },
    );

    if (stored) {
      cachedKey = await crypto.subtle.importKey(
        "raw",
        stored,
        { name: "AES-GCM" },
        false /* not extractable after import */,
        ["encrypt", "decrypt"],
      );
      return cachedKey;
    }

    // No key yet — generate a fresh AES-GCM-256 key
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true /* extractable so we can persist it */,
      ["encrypt", "decrypt"],
    );

    const raw = await crypto.subtle.exportKey("raw", key);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(raw, KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    cachedKey = key;
    return key;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      "[crypto] Web Crypto or IndexedDB unavailable, falling back to plaintext storage",
      e,
    );
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Returns true when AES-GCM encryption is available. */
export async function isEncryptionAvailable(): Promise<boolean> {
  try {
    const key = await getOrCreateKey();
    return key !== null;
  } catch {
    return false;
  }
}

/**
 * Encrypt a plaintext string.
 *
 * When encryption is available the output is a base64-encoded ciphertext
 * prepended with a random 12-byte IV.  When encryption is unavailable the
 * plaintext is returned as-is (pass-through).
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  if (!key) {
    // eslint-disable-next-line no-console
    console.warn("[crypto] Encryption unavailable, storing plaintext");
    return plaintext;
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  // Prepend IV to ciphertext and base64-encode the whole blob
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a value previously produced by {@link encrypt}.
 *
 * When encryption is available but decryption fails (wrong key, corrupted
 * data, or plaintext stored before encryption was enabled) the raw input
 * is returned as a fallback so callers can attempt to use it.
 *
 * When encryption is unavailable the raw input is returned as-is.
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getOrCreateKey();
  if (!key) return ciphertext;

  try {
    const combined = Uint8Array.from(atob(ciphertext), (c) =>
      c.charCodeAt(0),
    );
    // Encrypted payload: at least 12-byte IV + 1 byte of ciphertext
    if (combined.length < 13) return ciphertext;

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      "[crypto] Decryption failed, returning raw value (may be plaintext)",
    );
    return ciphertext;
  }
}

/**
 * Delete the IndexedDB crypto store (used by {@link clearAllAuth}).
 * Also resets the in-memory cached key so the next call regenerates
 * a fresh key.
 */
export async function clearCryptoStore(): Promise<void> {
  cachedKey = null;
  try {
    // Delete the entire database so no key material remains
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore cleanup errors — the keys are already wiped from localStorage
  }
}
