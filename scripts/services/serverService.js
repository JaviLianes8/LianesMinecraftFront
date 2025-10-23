import { request } from '../httpClient.js';

/**
 * Enumerates the possible lifecycle states of the Minecraft server as understood by the UI.
 * @readonly
 * @enum {string}
 */
export const ServerLifecycleState = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  ERROR: 'ERROR',
});

/**
 * Retrieves the latest lifecycle status from the backend API.
 *
 * @returns {Promise<{ state: string, raw: unknown }>} Normalised state and the original payload.
 */
export async function fetchServerStatus() {
  const { data } = await request({ path: '/server/status' });
  return {
    state: mapPayloadToState(data),
    raw: data,
  };
}

/**
 * Requests the backend to start the Minecraft server.
 *
 * @returns {Promise<void>} Completes when the request is successfully executed.
 */
export async function startServer() {
  await request({ path: '/server/start', method: 'POST' });
}

/**
 * Requests the backend to stop the Minecraft server.
 *
 * @returns {Promise<void>} Completes when the request is successfully executed.
 */
export async function stopServer() {
  await request({ path: '/server/stop', method: 'POST' });
}

/**
 * Converts arbitrary payloads returned by the backend into UI lifecycle states.
 *
 * @param {unknown} payload Response payload obtained from the API.
 * @returns {string} One of the {@link ServerLifecycleState} values.
 */
function mapPayloadToState(payload) {
  if (typeof payload === 'string') {
    return normaliseStatusString(payload);
  }

  if (payload && typeof payload === 'object') {
    const candidateKeys = ['status', 'state', 'message', 'detail', 'result'];
    for (const key of candidateKeys) {
      if (key in payload) {
        const value = payload[key];
        const interpreted = typeof value === 'string'
          ? normaliseStatusString(value)
          : null;
        if (interpreted && interpreted !== ServerLifecycleState.UNKNOWN) {
          return interpreted;
        }
      }
    }
  }

  return ServerLifecycleState.UNKNOWN;
}

/**
 * Normalises raw textual content into lifecycle states understood by the UI.
 *
 * @param {string} value Raw text obtained from the backend.
 * @returns {string} Matching {@link ServerLifecycleState} value.
 */
function normaliseStatusString(value) {
  const compacted = value.trim().toLowerCase();

  if (!compacted) {
    return ServerLifecycleState.UNKNOWN;
  }

  const onlineTokens = ['online', 'running', 'started', 'true', 'activo'];
  if (onlineTokens.some((token) => compacted.includes(token))) {
    return ServerLifecycleState.ONLINE;
  }

  const offlineTokens = ['offline', 'stopped', 'stopping', 'stop', 'false', 'apagado'];
  if (offlineTokens.some((token) => compacted.includes(token))) {
    return ServerLifecycleState.OFFLINE;
  }

  const errorTokens = ['error', 'failed', 'unable'];
  if (errorTokens.some((token) => compacted.includes(token))) {
    return ServerLifecycleState.ERROR;
  }

  return ServerLifecycleState.UNKNOWN;
}
