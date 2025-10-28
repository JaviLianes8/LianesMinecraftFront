const DEFAULT_CACHE_KEY = 'dashboard.snapshot';

/**
 * Persists and restores dashboard data using Web Storage.
 */
export function createDashboardStateCache(storage) {
  const isStorageAvailable = Boolean(storage && typeof storage.getItem === 'function');

  const readCache = () => {
    if (!isStorageAvailable) {
      return null;
    }
    try {
      const raw = storage.getItem(DEFAULT_CACHE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  };

  const writeCache = (payload) => {
    if (!isStorageAvailable) {
      return;
    }
    try {
      storage.setItem(DEFAULT_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      storage.removeItem(DEFAULT_CACHE_KEY);
    }
  };

  const mergeWithExisting = (patch) => {
    const current = readCache() || {};
    writeCache({ ...current, ...patch, updatedAt: Date.now() });
  };

  return Object.freeze({
    /**
     * Loads the cached dashboard snapshot.
     *
     * @returns {{ status?: string, players?: Array<unknown>, updatedAt?: number }|null} Cached data.
     */
    load() {
      return readCache();
    },
    /**
     * Persists the latest lifecycle state.
     *
     * @param {string} state Server lifecycle state.
     */
    saveStatus(state) {
      if (!state) {
        return;
      }
      mergeWithExisting({ status: state });
    },
    /**
     * Persists the latest players snapshot.
     *
     * @param {Array<unknown>} players Players list.
     */
    savePlayers(players) {
      if (!Array.isArray(players)) {
        return;
      }
      mergeWithExisting({ players });
    },
    /**
     * Clears the persisted snapshot.
     */
    clear() {
      if (!isStorageAvailable) {
        return;
      }
      storage.removeItem(DEFAULT_CACHE_KEY);
    },
  });
}
