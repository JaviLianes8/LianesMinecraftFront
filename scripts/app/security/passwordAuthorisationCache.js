/**
 * @file Persists successful password authorisations to avoid re-prompting on reload.
 */

import { getPasswordSecrets } from '../support/passwordSecretsGateway.js';
import { createPasswordAuthorisationCipher } from './passwordAuthorisationCipher.js';

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

/** Manages cached authorisations keyed by password scope. */
export class PasswordAuthorisationCache {
  /**
   * @param {Object} [options] Configuration overrides.
   * @param {Storage|null} [options.storage=resolveStorage()] Storage provider used to persist authorisations.
   * @param {string} [options.storageKey=STORAGE_KEY] Storage key used to persist authorisations.
   * @param {() => Record<string, { hash: string }>} [options.secretsGateway=getPasswordSecrets]
   * Gateway exposing the hashed secrets configuration.
   * @param {Console} [options.logger=console] Logger receiving recoverable warnings.
   * @param {import('./passwordAuthorisationCipher.js').PasswordAuthorisationCipher} [options.cipher]
   * Cipher responsible for encrypting cached credentials.
   */
  constructor({
    storage = resolveStorage(),
    storageKey = STORAGE_KEY,
    secretsGateway = getPasswordSecrets,
    logger = console,
    cipher = createPasswordAuthorisationCipher(),
  } = {}) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.secretsGateway = secretsGateway;
    this.logger = logger;
    this.cipher = cipher;
  }

  /** Retrieves decrypted password entries compatible with the current secret set. */
  async loadAuthorisedScopes() {
    if (!this.storage) return new Map();
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return new Map();
      const secrets = this.resolveSecrets();
      const result = new Map();
      for (const [scope, cached] of Object.entries(parsed)) {
        if (!cached || typeof cached !== 'object') continue;
        const secret = secrets[scope];
        if (!this.cipher?.isCompatible?.(secret, cached)) continue;
        try {
          if (!this.cipher?.isAvailable?.()) break;
          const password = await this.cipher.decrypt({
            scope,
            payload: cached,
            secret,
          });
          if (typeof password === 'string' && password.length > 0) {
            result.set(scope, password);
          }
        } catch (error) {
          this.logger.warn('Unable to decrypt cached password authorisation', error);
          this.clearScope(scope);
        }
      }

      return result;
    } catch (error) {
      this.logger.warn('Unable to read cached password authorisations', error);
      return new Map();
    }
  }

  /** Persists a scope as authorised using the supplied password. */
  async persistScope(scope, password) {
    if (!this.storage || typeof scope !== 'string' || scope.length === 0 || typeof password !== 'string' || password.length === 0) return;
    const secrets = this.resolveSecrets();
    const secret = secrets[scope];
    if (!this.canPersistSecret(secret)) return;

    try {
      if (!this.cipher?.isAvailable?.()) return;
      const payload = await this.cipher.encrypt({ scope, password, secret });
      const registry = this.readRegistry();
      registry[scope] = {
        hash: secret.hash,
        salt: secret.salt,
        iv: payload.iv,
        data: payload.data,
      };
      this.writeRegistry(registry);
    } catch (error) {
      this.logger.warn('Unable to persist cached password authorisation', error);
    }
  }

  /** Removes the cached authorisation for the provided scope. */
  clearScope(scope) {
    if (!this.storage || typeof scope !== 'string' || scope.length === 0) return;
    const registry = this.readRegistry();
    if (registry[scope]) {
      delete registry[scope];
      this.writeRegistry(registry);
    }
  }

  /** Removes all cached authorisations. */
  clearAll() {
    if (!this.storage) return;
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

  canPersistSecret(secret) {
    return Boolean(secret?.hash && secret?.salt);
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


