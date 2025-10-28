/**
 * @file Provides persistence utilities to remember authorised password scopes across sessions.
 */

const STORAGE_KEY = 'dashboard.password.authorisations';

/**
 * Persists successful password authorisations using browser storage when available.
 */
export class PasswordSession {
  constructor(storage = resolveStorage()) {
    this.storage = storage;
    this.authorisedHashes = this.loadAuthorisedHashes();
  }

  /**
   * Checks whether the provided scope is already authorised for the supplied hash.
   *
   * @param {string} scope Password scope identifier.
   * @param {string} expectedHash Hash expected for the scope in the current runtime configuration.
   * @returns {boolean} True when the stored authorisation matches the expected hash.
   */
  isAuthorised(scope, expectedHash) {
    if (!expectedHash) {
      return false;
    }

    return this.authorisedHashes[scope] === expectedHash;
  }

  /**
   * Stores the authorisation hash for the given scope when storage is available.
   *
   * @param {string} scope Password scope identifier.
   * @param {string} hash Hash corresponding to the accepted secret.
   * @returns {void}
   */
  markAuthorised(scope, hash) {
    if (!hash) {
      return;
    }

    this.authorisedHashes[scope] = hash;
    this.persistAuthorisedHashes();
  }

  loadAuthorisedHashes() {
    if (!this.storage) {
      return {};
    }

    try {
      const rawValue = this.storage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return {};
      }

      const parsed = JSON.parse(rawValue);
      if (typeof parsed !== 'object' || parsed === null) {
        return {};
      }

      return parsed;
    } catch (error) {
      console.warn('Unable to read password authorisation state', error);
      return {};
    }
  }

  persistAuthorisedHashes() {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.authorisedHashes));
    } catch (error) {
      console.warn('Unable to persist password authorisation state', error);
    }
  }
}

function resolveStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn('localStorage is not available for password session persistence', error);
    return null;
  }
}

/**
 * Factory helper creating a password session instance using browser storage.
 *
 * @returns {PasswordSession} Configured session store.
 */
export function createPasswordSession() {
  return new PasswordSession();
}
