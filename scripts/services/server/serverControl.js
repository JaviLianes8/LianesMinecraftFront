import { request } from '../../http/request.js';
import {
  ServerLifecycleState,
  normaliseServerStatusPayload,
  normaliseServerStatusSnapshot,
} from './lifecycle.js';

const STATUS_ENDPOINT = '/server/status';
const START_ENDPOINT = '/server/start';
const STOP_ENDPOINT = '/server/stop';

/**
 * Retrieves the latest lifecycle status from the backend API.
 *
 * @returns {Promise<{ state: string, raw: unknown }>} Normalised state and the original payload.
 */
export async function fetchServerStatus() {
  const { data } = await request({ path: STATUS_ENDPOINT });
  return normaliseServerStatusSnapshot(data);
}

/**
 * Requests the backend to start the Minecraft server.
 *
 * @returns {Promise<void>} Completes when the request is successfully executed.
 */
export async function startServer() {
  await request({ path: START_ENDPOINT, method: 'POST' });
}

/**
 * Requests the backend to stop the Minecraft server.
 *
 * @returns {Promise<void>} Completes when the request is successfully executed.
 */
export async function stopServer() {
  await request({ path: STOP_ENDPOINT, method: 'POST' });
}

export { ServerLifecycleState, normaliseServerStatusPayload, normaliseServerStatusSnapshot };
