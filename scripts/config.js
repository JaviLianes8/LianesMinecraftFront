/**
 * Base URL for the remote Minecraft control API.
 * @type {string}
 */
export const API_BASE_URL = 'http://naseevvee.duckdns.org:8000/api';

/**
 * Default timeout applied to HTTP requests (in milliseconds).
 * @type {number}
 */
export const REQUEST_TIMEOUT_MS = 10000;

/**
 * Minimum elapsed time between successive status checks enforced in the UI (ms).
 * @type {number}
 */
export const STATUS_MIN_INTERVAL_MS = 60000;
