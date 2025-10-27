/**
 * Provides utilities to interpret server lifecycle information exposed by the backend.
 */

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

/**
 * Converts arbitrary payloads returned by the backend into UI lifecycle states.
 *
 * @param {unknown} payload Response payload obtained from the API.
 * @returns {string} One of the {@link ServerLifecycleState} values.
 */
export function normaliseServerStatusPayload(payload) {
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
