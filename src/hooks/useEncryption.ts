import { useState, useEffect, useCallback, useRef } from 'react';
import {
  deriveKey,
  encrypt,
  decrypt,
  getKeyFromIndexedDB,
  storeKeyInIndexedDB,
  hashKeyForVerification,
  generateSalt,
} from '../lib/encryption';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../lib/encryption-utils';

/**
 * React hook providing client-side encryption for the active twin pair.
 *
 * On mount it attempts to load an existing CryptoKey from IndexedDB.
 * If no key is found, `isEncryptionReady` will be false and the UI should
 * prompt the user for the encryption passphrase via `setupEncryption`.
 */

interface UseEncryptionOptions {
  /** The active pair ID — encryption keys are scoped per pair. */
  pairId: string | null;
}

interface UseEncryptionReturn {
  /** True once a valid CryptoKey is loaded and ready for use. */
  isEncryptionReady: boolean;
  /** True while the key is being loaded from IndexedDB on mount. */
  isLoading: boolean;
  /** Encrypt a plaintext string. Throws if encryption is not ready. */
  encryptField: (text: string) => Promise<string>;
  /** Decrypt a ciphertext string. Throws if encryption is not ready. */
  decryptField: (ciphertext: string) => Promise<string>;
  /**
   * Derive a key from the passphrase + salt, store it in IndexedDB, and
   * return the key-verification hash (to persist server-side).
   *
   * @param passphrase  The user-provided passphrase.
   * @param salt        Base64-encoded salt. Pass an empty string to generate
   *                    a new salt (returned alongside the hash).
   */
  setupEncryption: (
    passphrase: string,
    salt: string,
  ) => Promise<{ keyHash: string; salt: string }>;
}

export function useEncryption({ pairId }: UseEncryptionOptions): UseEncryptionReturn {
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const keyRef = useRef<CryptoKey | null>(null);

  // -----------------------------------------------------------------------
  // Load key from IndexedDB on mount / pair change
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadKey(): Promise<void> {
      setIsLoading(true);
      setIsEncryptionReady(false);
      keyRef.current = null;

      if (!pairId) {
        setIsLoading(false);
        return;
      }

      try {
        const storedKey = await getKeyFromIndexedDB(pairId);
        if (!cancelled && storedKey) {
          keyRef.current = storedKey;
          setIsEncryptionReady(true);
        }
      } catch (err: unknown) {
        // IndexedDB may be unavailable (e.g. private browsing in some browsers).
        // We swallow the error; the user will be prompted to enter a passphrase.
        console.error('[useEncryption] Failed to load key from IndexedDB:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadKey();

    return () => {
      cancelled = true;
    };
  }, [pairId]);

  // -----------------------------------------------------------------------
  // encryptField
  // -----------------------------------------------------------------------
  const encryptField = useCallback(async (text: string): Promise<string> => {
    if (!keyRef.current) {
      throw new Error('Encryption key is not available. Set up encryption first.');
    }
    return encrypt(text, keyRef.current);
  }, []);

  // -----------------------------------------------------------------------
  // decryptField
  // -----------------------------------------------------------------------
  const decryptField = useCallback(async (ciphertext: string): Promise<string> => {
    if (!keyRef.current) {
      throw new Error('Encryption key is not available. Set up encryption first.');
    }
    return decrypt(ciphertext, keyRef.current);
  }, []);

  // -----------------------------------------------------------------------
  // setupEncryption
  // -----------------------------------------------------------------------
  const setupEncryption = useCallback(
    async (
      passphrase: string,
      saltBase64: string,
    ): Promise<{ keyHash: string; salt: string }> => {
      if (!pairId) {
        throw new Error('No active pair ID. Cannot set up encryption.');
      }

      // If no salt provided, generate a fresh one
      const salt: Uint8Array =
        saltBase64.length > 0
          ? base64ToUint8Array(saltBase64)
          : generateSalt();

      const key = await deriveKey(passphrase, salt);

      // Persist key locally
      await storeKeyInIndexedDB(key, pairId);
      keyRef.current = key;
      setIsEncryptionReady(true);

      // Produce verification hash for server-side storage
      const keyHash = await hashKeyForVerification(key);
      const resultSalt = uint8ArrayToBase64(salt);

      return { keyHash, salt: resultSalt };
    },
    [pairId],
  );

  return {
    isEncryptionReady,
    isLoading,
    encryptField,
    decryptField,
    setupEncryption,
  };
}
