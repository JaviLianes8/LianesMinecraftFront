import { REQUEST_TIMEOUT_MS } from '../../config.js';
import { storeAuthToken, clearAuthToken } from './authTokenStore.js';

const AUTH_BASE_PATH = '/api/auth';

/**
 * Builds an absolute URL targeting the authentication endpoints served from the same origin.
 *
 * @param {string} [path=''] Relative path within the authentication namespace.
 * @returns {string} Fully qualified URL pointing to the authentication handler.
 */
function buildAuthUrl(path = '') {
  const sanitisedPath = typeof path === 'string' ? path.replace(/^\//, '') : '';
  if (typeof window !== 'undefined' && window.location) {
    const basePath = AUTH_BASE_PATH.endsWith('/') ? AUTH_BASE_PATH : `${AUTH_BASE_PATH}/`;
    const base = new URL(basePath, window.location.origin);
    return new URL(sanitisedPath, base).toString();
  }
  const base = AUTH_BASE_PATH.endsWith('/') ? AUTH_BASE_PATH : `${AUTH_BASE_PATH}/`;
  return `${base}${sanitisedPath}`;
}

/**
 * Sends the provided password to the authentication endpoint and resolves to whether it matched
 * the configured secret.
 *
 * @param {string} endpoint Relative endpoint name (e.g. `start`, `stop`).
 * @param {string} password Password provided by the user.
 * @returns {Promise<boolean>} Resolves to `true` when the password is accepted.
 */
async function verifyPassword(endpoint, password, scope) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string.');
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(buildAuthUrl(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
      credentials: 'same-origin',
      signal: controller?.signal,
      cache: 'no-store',
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (response.status === 401 || response.status === 403) {
      clearAuthToken(scope);
      return false;
    }

    if (!response.ok) {
      const failure = new Error('Authentication request failed.');
      failure.status = response.status;
      failure.payload = payload;
      throw failure;
    }

    if (payload && payload.success === true && typeof payload.token === 'string') {
      storeAuthToken(scope, payload.token, payload.expiresAt);
      return true;
    }

    clearAuthToken(scope);
    return false;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Verifies the dashboard access password required to initialise the UI.
 *
 * @param {string} password Candidate password supplied by the user.
 * @returns {Promise<boolean>} Whether the provided password is valid.
 */
export function verifyStartupPassword(password) {
  return verifyPassword('start', password, 'start');
}

/**
 * Verifies the shutdown password required before stopping the server.
 *
 * @param {string} password Candidate password supplied by the user.
 * @returns {Promise<boolean>} Whether the provided password is valid.
 */
export function verifyShutdownPassword(password) {
  return verifyPassword('stop', password, 'stop');
}
