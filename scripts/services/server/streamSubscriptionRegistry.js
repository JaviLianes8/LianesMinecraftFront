/**
 * @file Provides a persistence-backed registry used to throttle SSE subscriptions across reloads.
 */

const STORAGE_KEY = 'dashboard.streamSubscriptions';
export const DEFAULT_RETRY_DELAY_MS = 20000;
const NO_SUBSCRIPTION = Object.freeze({ permitted: true, delayMs: 0 });
/**
 * Safely resolves the storage instance if the environment supports it.
 *
 * @returns {Storage | null} Browser storage implementation or null when unavailable.
 */
function resolveStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn('Local storage is not accessible for stream registry usage', error);
    return null;
  }
}

/** Tracks the lifecycle of SSE connections to avoid reconnect storms on reloads. */
export class StreamSubscriptionRegistry {
  /**
   * @param {Object} [options] Configuration overrides for the registry.
   * @param {Storage|null} [options.storage=resolveStorage()] Storage used to persist the registry state.
   * @param {string} [options.storageKey=STORAGE_KEY] Identifier used to persist the registry state.
   * @param {() => number} [options.now=() => Date.now()] Clock used to produce timestamps.
   * @param {number} [options.retryDelayMs=DEFAULT_RETRY_DELAY_MS] Cooldown applied before reconnect attempts.
   * @param {Console} [options.logger=console] Logger receiving non-critical warnings.
   */
  constructor({
    storage = resolveStorage(),
    storageKey = STORAGE_KEY,
    now = () => Date.now(),
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    logger = console,
  } = {}) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.now = now;
    this.retryDelayMs = retryDelayMs;
    this.logger = logger;
  }

  /**
   * Determines whether a new subscription should be established immediately.
   *
   * @param {string} endpoint Endpoint used to distinguish different streams.
   * @returns {{ permitted: boolean, delayMs: number }} Decision describing whether the caller should proceed.
   */
  evaluate(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
      return NO_SUBSCRIPTION;
    }

    const registry = this.readRegistry();
    const record = registry[endpoint];
    if (!record) {
      return NO_SUBSCRIPTION;
    }

    const { closedAt = null } = record;
    if (closedAt === null || typeof closedAt !== 'number') {
      return { permitted: false, delayMs: this.retryDelayMs };
    }

    const elapsed = this.now() - closedAt;
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      return { permitted: false, delayMs: this.retryDelayMs };
    }

    if (elapsed >= this.retryDelayMs) {
      return NO_SUBSCRIPTION;
    }

    return { permitted: false, delayMs: this.retryDelayMs - elapsed };
  }

  /**
   * Stores that a subscription is currently active for the provided endpoint.
   *
   * @param {string} endpoint Endpoint identifier.
   * @returns {void}
   */
  recordOpen(endpoint) {
    if (!this.canPersist(endpoint)) {
      return;
    }

    const registry = this.readRegistry();
    registry[endpoint] = { openedAt: this.now(), closedAt: null };
    this.writeRegistry(registry);
  }

  /**
   * Records that a subscription has been terminated so future reconnects honour the cooldown.
   *
   * @param {string} endpoint Endpoint identifier.
   * @returns {void}
   */
  recordClose(endpoint) {
    if (!this.canPersist(endpoint)) {
      return;
    }

    const registry = this.readRegistry();
    const existing = registry[endpoint] ?? {};
    registry[endpoint] = { ...existing, closedAt: this.now() };
    this.writeRegistry(registry);
  }

  /**
   * Removes all persisted data for the provided endpoint.
   *
   * @param {string} endpoint Endpoint identifier.
   * @returns {void}
   */
  clear(endpoint) {
    if (!this.canPersist(endpoint)) {
      return;
    }

    const registry = this.readRegistry();
    if (registry[endpoint]) {
      delete registry[endpoint];
      this.writeRegistry(registry);
    }
  }

  /**
   * Checks whether persistence is available for the provided endpoint identifier.
   *
   * @param {string} endpoint Endpoint identifier.
   * @returns {boolean} True when persistence is possible.
   */
  canPersist(endpoint) {
    return Boolean(endpoint && typeof endpoint === 'string' && this.storage);
  }

  /**
   * Reads the registry data from persistence.
   *
   * @returns {Record<string, { openedAt?: number|null, closedAt?: number|null }>} Stored registry snapshot.
   */
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
      this.logger.warn('Unable to read stream subscription registry', error);
      return {};
    }
  }

  /**
   * Persists the registry snapshot, suppressing recoverable errors.
   *
   * @param {Record<string, { openedAt?: number|null, closedAt?: number|null }>} registry Registry snapshot.
   * @returns {void}
   */
  writeRegistry(registry) {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(registry));
    } catch (error) {
      this.logger.warn('Unable to persist stream subscription registry', error);
    }
  }
}

let sharedRegistry;

/**
 * Provides a shared registry instance reused by all subscription factories.
 *
 * @returns {StreamSubscriptionRegistry} Shared registry.
 */
export function getStreamSubscriptionRegistry() {
  if (!sharedRegistry) {
    sharedRegistry = new StreamSubscriptionRegistry();
  }
  return sharedRegistry;
}

