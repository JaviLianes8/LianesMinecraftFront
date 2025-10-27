import { request } from '../../http/request.js';
import { getAuthToken } from '../security/authTokenStore.js';
import { ServerLifecycleState, normaliseServerStatusPayload } from './lifecycle.js';

const STATUS_ENDPOINT = '/server/status';
const START_ENDPOINT = '/control/start';
const STOP_ENDPOINT = '/control/stop';
const START_SCOPE = 'start';
const STOP_SCOPE = 'stop';

function resolveAuthHeaders(scope) {
  const token = getAuthToken(scope);
  if (!token) {
    const error = new Error('Missing authentication token.');
    error.code = 'AUTH_MISSING_TOKEN';
    error.scope = scope;
    throw error;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Retrieves the latest lifecycle status from the backend API.
 *
 * @returns {Promise<{ state: string, raw: unknown }>} Normalised state and the original payload.
 */
export async function fetchServerStatus() {
  const { data } = await request({ path: STATUS_ENDPOINT });
  return {
    state: normaliseServerStatusPayload(data),
    raw: data,
  };
}

/**
 * Requests the backend to start the Minecraft server.
 *
 * @returns {Promise<void>} Completes when the request is successfully executed.
 */
export async function startServer() {
  const headers = resolveAuthHeaders(START_SCOPE);
  await request({ path: START_ENDPOINT, method: 'POST', headers });
}

/**
 * Requests the backend to stop the Minecraft server.
 *
 * @returns {Promise<void>} Completes when the request is successfully executed.
 */
export async function stopServer() {
  const headers = resolveAuthHeaders(STOP_SCOPE);
  await request({ path: STOP_ENDPOINT, method: 'POST', headers });
}

export { ServerLifecycleState, normaliseServerStatusPayload };
