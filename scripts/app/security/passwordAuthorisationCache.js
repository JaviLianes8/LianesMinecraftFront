/**
 * @file Persists successful password authorisations to avoid re-prompting on reload.
 */

import { getPasswordSecrets } from '../support/passwordSecretsGateway.js';

const STORAGE_KEY = 'dashboard.password.authorisations';

function resolveStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn('Local storage is not accessible for password authorisations', error);
    return null;
  }
}

/**
 * Manages cached authorisations keyed by password scope.
 */
export class PasswordAuthorisationCache {
  /**
   * @param {Object} [options] Configuration overrides.
   * @param {Storage|null} [options.storage=resolveStorage()] Storage provider used to persist authorisations.
   * @param {string} [options.storageKey=STORAGE_KEY] Storage key used to persist authorisations.
   * @param {() => Record<string, { hash: string }>} [options.secretsGateway=getPasswordSecrets]
   * Gateway exposing the hashed secrets configuration.
   * @param {Console} [options.logger=console] Logger receiving recoverable warnings.
   */
  constructor({
    storage = resolveStorage(),
    storageKey = STORAGE_KEY,
    secretsGateway = getPasswordSecrets,
    logger = console,
  } = {}) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.secretsGateway = secretsGateway;
    this.logger = logger;
  }

  /**
   * Retrieves the list of scopes that remain authorised for the current secret set.
   *
   * @returns {Set<string>} Authorised scopes.
   */
  loadAuthorisedScopes() {
    if (!this.storage) {
      return new Set();
    }

    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) {
        return new Set();
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return new Set();
      }

      const secrets = this.resolveSecrets();
      return new Set(
        Object.entries(parsed)
          .filter(([scope, cached]) => {
            if (!cached || typeof cached !== 'object') {
              return false;
            }
            const secret = secrets[scope];
            return Boolean(secret?.hash && cached.hash === secret.hash);
          })
          .map(([scope]) => scope),
      );
    } catch (error) {
      this.logger.warn('Unable to read cached password authorisations', error);
      return new Set();
    }
  }

  /**
   * Persists that the provided scope has been authorised using the current secret configuration.
   *
   * @param {string} scope Password scope identifier.
   * @returns {void}
   */
  persistScope(scope) {
    if (!this.storage || typeof scope !== 'string' || scope.length === 0) {
      return;
    }

    const secrets = this.resolveSecrets();
    const secret = secrets[scope];
    if (!secret?.hash) {
      return;
    }

    const registry = this.readRegistry();
    registry[scope] = { hash: secret.hash };
    this.writeRegistry(registry);
  }

  /**
   * Removes the cached authorisation for the provided scope.
   *
   * @param {string} scope Password scope identifier.
   * @returns {void}
   */
  clearScope(scope) {
    if (!this.storage || typeof scope !== 'string' || scope.length === 0) {
      return;
    }

    const registry = this.readRegistry();
    if (registry[scope]) {
      delete registry[scope];
      this.writeRegistry(registry);
    }
  }

  /**
   * Removes all cached authorisations.
   *
   * @returns {void}
   */
  clearAll() {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.removeItem(this.storageKey);
    } catch (error) {
      this.logger.warn('Unable to clear cached password authorisations', error);
    }
  }

  resolveSecrets() {
    try {
      const secrets = this.secretsGateway?.();
      return secrets && typeof secrets === 'object' ? secrets : {};
    } catch (error) {
      this.logger.warn('Unable to resolve password secrets', error);
      return {};
    }
  }

  readRegistry() {
    if (!this.storage) {
      return {};
    }

    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch (error) {
      this.logger.warn('Unable to parse cached password authorisations', error);
      return {};
    }
  }

  writeRegistry(registry) {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(registry));
    } catch (error) {
      this.logger.warn('Unable to persist cached password authorisations', error);
    }
  }
}

let sharedCache;

/**
 * Resolves a shared cache instance to keep usage consistent across the app.
 *
 * @returns {PasswordAuthorisationCache} Shared cache instance.
 */
export function getPasswordAuthorisationCache() {
  if (!sharedCache) {
    sharedCache = new PasswordAuthorisationCache();
  }
  return sharedCache;
}

