/**
 * @file Supplies a password verification service based on hashed secrets provided at build time.
 */

import { getPasswordSecrets } from '../support/passwordSecretsGateway.js';

/**
 * Performs password validation by hashing the provided value and comparing it against the stored hash.
 */
export class PasswordVerifier {
  constructor(secretsGateway = getPasswordSecrets) {
    this.secretsGateway = secretsGateway;
    this.cachedSecrets = null;
  }

  /**
   * Checks whether the supplied password matches the configured secret for the provided scope.
   *
   * @param {Object} options Verification options.
   * @param {string} options.scope Identifier of the password scope. Supported: "start" | "stop".
   * @param {string} options.password Plain text password provided by the user.
   * @returns {Promise<{ authorised: boolean, scopeHash: string }>} Result describing whether the password is valid
   * and the hash associated with the authorised scope.
   */
  async verify({ scope, password }) {
    const entry = this.getSecret(scope);
    if (!entry?.hash || !entry?.salt) {
      console.warn(`Missing password configuration for scope: ${scope}`);
      return { authorised: false };
    }

    const hash = await this.hashPassword(password, entry.salt);
    const authorised = this.timingSafeEqual(hash, entry.hash);
    return { authorised, scopeHash: entry.hash };
  }

  /**
   * Provides the configured hash for the requested scope.
   *
   * @param {string} scope Password scope identifier.
   * @returns {string} Hash associated with the scope or an empty string when missing.
   */
  getExpectedHash(scope) {
    const entry = this.getSecret(scope);
    return entry?.hash ?? '';
  }

  getSecret(scope) {
    const secrets = this.getSecrets();
    return secrets?.[scope];
  }

  getSecrets() {
    if (!this.cachedSecrets) {
      this.cachedSecrets = this.secretsGateway();
    }

    return this.cachedSecrets;
  }

  async hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${salt}:${password}`);
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error('Web Crypto API is unavailable.');
    }

    const digest = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  timingSafeEqual(left, right) {
    if (typeof left !== 'string' || typeof right !== 'string') {
      return false;
    }

    if (left.length !== right.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < left.length; i += 1) {
      result |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }

    return result === 0;
  }
}

/**
 * Factory helper constructing a password verifier instance with the default gateway.
 *
 * @returns {PasswordVerifier} Configured verifier.
 */
export function createPasswordVerifier() {
  return new PasswordVerifier();
}
