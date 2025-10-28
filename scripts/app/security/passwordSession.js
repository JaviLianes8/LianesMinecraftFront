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
    this.authorisedEntries = this.loadAuthorisedEntries();
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

    const entry = this.authorisedEntries[scope];
    return Boolean(entry?.hash) && entry.hash === expectedHash;
  }

  /**
   * Stores the authorisation hash and secret for the given scope when storage is available.
   *
   * @param {string} scope Password scope identifier.
   * @param {{ hash: string, secret: string }} payload Persisted session payload.
   * @returns {void}
   */
  markAuthorised(scope, { hash, secret }) {
    if (!scope) {
      return;
    }

    const normalisedHash = typeof hash === 'string' ? hash : '';
    const normalisedSecret = typeof secret === 'string' ? secret : '';

    if (!normalisedHash && !normalisedSecret) {
      return;
    }

    this.authorisedEntries[scope] = { hash: normalisedHash, secret: normalisedSecret };
    this.persistAuthorisedEntries();
  }

  /**
   * Provides a snapshot of the stored authorisation entries.
   *
   * @returns {Record<string, { hash: string, secret: string }>} Copy of the persisted authorisation mapping.
   */
  getAuthorisedSnapshot() {
    return Object.fromEntries(
      Object.entries(this.authorisedEntries).map(([scope, entry]) => [scope, { ...entry }]),
    );
  }

  /**
   * Retrieves the stored secret (plain password) associated with the requested scope.
   *
   * @param {string} scope Password scope identifier.
   * @returns {string} Stored secret or an empty string when unavailable.
   */
  getStoredSecret(scope) {
    return this.authorisedEntries[scope]?.secret ?? '';
  }

  /**
   * Removes the stored authorisation for the requested scope.
   *
   * @param {string} scope Password scope identifier to clear.
   * @returns {void}
   */
  clearAuthorised(scope) {
    if (!scope || !(scope in this.authorisedEntries)) {
      return;
    }

    delete this.authorisedEntries[scope];
    this.persistAuthorisedEntries();
  }

  loadAuthorisedEntries() {
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

      return normaliseEntries(parsed);
    } catch (error) {
      console.warn('Unable to read password authorisation state', error);
      return {};
    }
  }

  persistAuthorisedEntries() {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.authorisedEntries));
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

function normaliseEntries(rawEntries) {
  return Object.entries(rawEntries).reduce((accumulator, [scope, value]) => {
    const entry = normaliseEntry(value);
    if (entry) {
      accumulator[scope] = entry;
    }
    return accumulator;
  }, {});
}

function normaliseEntry(value) {
  if (typeof value === 'string') {
    return { hash: value, secret: '' };
  }

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const hash = typeof value.hash === 'string' ? value.hash : '';
  const secret = typeof value.secret === 'string' ? value.secret : '';

  if (!hash && !secret) {
    return null;
  }

  return { hash, secret };
}
