/**
 * Client-side encryption service using Web Crypto API (SubtleCrypto).
 *
 * - AES-256-GCM for symmetric encryption
 * - PBKDF2 with 600,000 iterations for key derivation
 * - Keys stored in IndexedDB, NEVER in localStorage or sent to the server
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const DB_NAME = 'twintrack-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'encryption-keys';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`IndexedDB open failed: ${String(request.error)}`));
  });
}

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

/**
 * Derive an AES-256-GCM CryptoKey from a passphrase and salt using PBKDF2.
 * Uses 600,000 iterations of SHA-256 per OWASP recommendations.
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // extractable – needed for hashKeyForVerification
    ['encrypt', 'decrypt'],
  );
}

// ---------------------------------------------------------------------------
// Salt generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random 16-byte salt.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns a base64-encoded string containing the 12-byte IV prepended to the ciphertext.
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );

  // Combine IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.byteLength);

  return bufferToBase64(combined.buffer);
}

/**
 * Decrypt a base64-encoded (IV + ciphertext) string produced by `encrypt`.
 */
export async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
  const combined = base64ToBuffer(ciphertext);

  if (combined.byteLength <= IV_LENGTH) {
    throw new Error('Ciphertext is too short to contain a valid IV');
  }

  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  const decoder = new TextDecoder();
  return decoder.decode(plainBuffer);
}

// ---------------------------------------------------------------------------
// Key verification hash
// ---------------------------------------------------------------------------

/**
 * Produce a hex-encoded SHA-256 hash of the raw key material.
 * Used to verify the correct passphrase was entered without storing the key
 * itself on the server.
 */
export async function hashKeyForVerification(key: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKey);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// IndexedDB key storage
// ---------------------------------------------------------------------------

/**
 * Store the derived CryptoKey in IndexedDB, keyed by pair ID.
 * The key is stored as a non-extractable CryptoKey object by the browser's
 * structured clone algorithm — it never leaves the IndexedDB as raw bytes.
 */
export async function storeKeyInIndexedDB(
  key: CryptoKey,
  pairId: string,
): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(key, pairId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to store key: ${String(request.error)}`));

    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieve a stored CryptoKey for the given pair ID, or null if not found.
 */
export async function getKeyFromIndexedDB(
  pairId: string,
): Promise<CryptoKey | null> {
  const db = await openDB();
  return new Promise<CryptoKey | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(pairId);

    request.onsuccess = () => {
      const result = request.result as CryptoKey | undefined;
      resolve(result ?? null);
    };
    request.onerror = () => reject(new Error(`Failed to retrieve key: ${String(request.error)}`));

    tx.oncomplete = () => db.close();
  });
}

/**
 * Remove the stored CryptoKey for the given pair ID.
 */
export async function clearKeyFromIndexedDB(
  pairId: string,
): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(pairId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to clear key: ${String(request.error)}`));

    tx.oncomplete = () => db.close();
  });
}
