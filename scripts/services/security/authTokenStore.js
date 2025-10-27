const tokenStore = new Map();

function normaliseScope(scope) {
  return typeof scope === 'string' && scope.length > 0 ? scope : '';
}

/**
 * Persists an authentication token associated with the provided scope.
 *
 * @param {string} scope Logical area that the token authorises (e.g. "start").
 * @param {string} token Bearer token issued by the backend.
 * @param {number | string | null | undefined} expiresAt Unix timestamp (ms) when the token expires.
 */
export function storeAuthToken(scope, token, expiresAt) {
  const normalisedScope = normaliseScope(scope);
  if (!normalisedScope || typeof token !== 'string' || token.length === 0) {
    return;
  }

  const expiry = Number(expiresAt);
  tokenStore.set(normalisedScope, {
    token,
    expiresAt: Number.isFinite(expiry) ? expiry : null,
  });
}

/**
 * Retrieves the active token for the provided scope if it exists and is valid.
 *
 * @param {string} scope Logical area that the token authorises.
 * @returns {string | null} Bearer token or null when not found/expired.
 */
export function getAuthToken(scope) {
  const normalisedScope = normaliseScope(scope);
  if (!normalisedScope) {
    return null;
  }

  const entry = tokenStore.get(normalisedScope);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    tokenStore.delete(normalisedScope);
    return null;
  }

  return entry.token;
}

/**
 * Removes the stored token for the provided scope.
 *
 * @param {string} scope Logical area whose token should be discarded.
 */
export function clearAuthToken(scope) {
  const normalisedScope = normaliseScope(scope);
  if (!normalisedScope) {
    return;
  }
  tokenStore.delete(normalisedScope);
}

/**
 * Removes all stored authentication tokens from the in-memory cache.
 */
export function clearAllAuthTokens() {
  tokenStore.clear();
}
