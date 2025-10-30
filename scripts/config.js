const REMOTE_API_BASE_URL = 'http://jlianesminipc.ddns.net:8000/api';
const PROXY_API_BASE_PATH = '/api';

/**
 * Base URL for the remote Minecraft control API. When the application is served
 * over HTTPS (e.g. on Vercel), requests are routed through a same-origin proxy
 * to avoid mixed-content restrictions.
 * @type {string}
 */
export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Resolves the effective API base URL taking the current execution environment
 * into account.
 *
 * @returns {string} Either a same-origin proxy path or the remote endpoint.
 */
function resolveApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') {
    return PROXY_API_BASE_PATH;
  }
  return REMOTE_API_BASE_URL;
}

/**
 * Builds an absolute URL for the provided API path based on the active base URL.
 *
 * @param {string} [path=''] Relative API path, with or without leading slash.
 * @returns {string} Fully qualified URL that can be requested by the client.
 */
export function buildApiUrl(path = '') {
  const sanitisedPath = typeof path === 'string' ? path.replace(/^\//, '') : '';
  const normalisedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;

  const contextBase = typeof window !== 'undefined' && window.location
    ? window.location.href
    : REMOTE_API_BASE_URL;

  const absoluteBase = new URL(normalisedBase, contextBase).toString();
  return new URL(sanitisedPath, absoluteBase).toString();
}

/**
 * Default timeout applied to HTTP requests (in milliseconds).
 * @type {number}
 */
export const REQUEST_TIMEOUT_MS = 200000;

/**
 * Minimum elapsed time between successive status checks enforced in the UI (ms).
 * @type {number}
 */
export const STATUS_MIN_INTERVAL_MS = 60000;
