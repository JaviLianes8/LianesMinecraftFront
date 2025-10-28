/**
 * @file Supplies encryption helpers for cached password authorisations.
 */

const DEFAULT_ITERATIONS = 100_000;
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

/**
 * Encrypts and decrypts cached password credentials using the Web Crypto API.
 */
export class PasswordAuthorisationCipher {
  /**
   * @param {Crypto|undefined} cryptoProvider Global crypto provider.
   */
  constructor(cryptoProvider = globalThis.crypto) {
    this.crypto = cryptoProvider;
  }

  /**
   * Indicates whether the current environment can perform encryption tasks.
   *
   * @returns {boolean} True when Web Crypto is available.
   */
  isAvailable() {
    return Boolean(this.crypto?.subtle);
  }

  /**
   * Encrypts the provided password using AES-GCM with a derived key.
   *
   * @param {Object} options Encryption options.
   * @param {string} options.scope Password scope identifier.
   * @param {string} options.password Plain text password.
   * @param {{ hash: string, salt: string }} options.secret Secret configuration.
   * @returns {Promise<{ iv: string, data: string }>} Cipher payload encoded in base64.
   */
  async encrypt({ scope, password, secret }) {
    const iv = this.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(scope, secret);
    const encrypted = await this.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      ENCODER.encode(password),
    );

    return {
      iv: bufferToBase64(iv.buffer),
      data: bufferToBase64(encrypted),
    };
  }

  /**
   * Decrypts the provided cipher payload and returns the original password.
   *
   * @param {Object} options Decryption options.
   * @param {string} options.scope Password scope identifier.
   * @param {{ iv: string, data: string }} options.payload Stored cipher payload.
   * @param {{ hash: string, salt: string }} options.secret Secret configuration.
   * @returns {Promise<string>} Decrypted password string.
   */
  async decrypt({ scope, payload, secret }) {
    const key = await this.deriveKey(scope, secret);
    const iv = base64ToUint8Array(payload.iv);
    const data = base64ToUint8Array(payload.data);
    const decrypted = await this.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );
    return DECODER.decode(decrypted);
  }

  /**
   * Checks whether the cached payload matches the current secret definition.
   *
   * @param {{ hash?: string, salt?: string }} secret Secret definition to validate against.
   * @param {{ hash?: string, salt?: string, iv?: string, data?: string }} payload Cached payload.
   * @returns {boolean} True when the payload can be decrypted with the provided secret.
   */
  isCompatible(secret, payload) {
    return Boolean(
      secret?.hash &&
        secret?.salt &&
        typeof payload?.hash === 'string' &&
        payload.hash === secret.hash &&
        typeof payload?.salt === 'string' &&
        payload.salt === secret.salt &&
        typeof payload?.iv === 'string' &&
        typeof payload?.data === 'string',
    );
  }

  async deriveKey(scope, secret) {
    const baseKey = await this.crypto.subtle.importKey(
      'raw',
      ENCODER.encode(`${scope}:${secret.hash}`),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );

    return this.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: ENCODER.encode(secret.salt),
        iterations: DEFAULT_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }
}

/**
 * Factory helper returning a cipher instance backed by the global crypto provider.
 *
 * @returns {PasswordAuthorisationCipher} Cipher instance.
 */
export function createPasswordAuthorisationCipher() {
  return new PasswordAuthorisationCipher();
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

function base64ToUint8Array(value) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
