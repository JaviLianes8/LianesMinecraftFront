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

function interpretBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const compacted = value.trim().toLowerCase();
    if (!compacted) {
      return null;
    }
    if (['true', '1', 'yes', 'running', 'online', 'started'].includes(compacted)) {
      return true;
    }
    if (['false', '0', 'no', 'offline', 'stopped', 'stopping'].includes(compacted)) {
      return false;
    }
  }

  return null;
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
    const runningValue = interpretBoolean(resolveKey(payload, 'running', 'is_running', 'online'));
    if (runningValue !== null) {
      return runningValue ? ServerLifecycleState.ONLINE : ServerLifecycleState.OFFLINE;
    }

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

function coerceInteger(value) {
  if (typeof value !== 'number') {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.trunc(value);
}

function coerceString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveKey(payload, ...candidates) {
  for (const key of candidates) {
    if (key in payload) {
      return payload[key];
    }
  }
  return undefined;
}

/**
 * Produces a normalised status snapshot enriched with lifecycle metadata.
 *
 * @param {unknown} payload Raw payload returned by the backend.
 * @returns {{
 *   state: string,
 *   running: boolean | null,
 *   status: string | null,
 *   pid: number | null,
 *   stateSince: string | null,
 *   stateDurationSeconds: number | null,
 *   canStart: boolean,
 *   canStop: boolean,
 *   raw: unknown,
 * }} Canonical representation of the server status snapshot.
 */
export function normaliseServerStatusSnapshot(payload) {
  if (!payload || typeof payload !== 'object') {
    const state = normaliseServerStatusPayload(payload);
    return {
      state,
      running: interpretBoolean(payload),
      status: coerceString(payload),
      pid: null,
      stateSince: null,
      stateDurationSeconds: null,
      canStart: state === ServerLifecycleState.OFFLINE,
      canStop: state === ServerLifecycleState.ONLINE,
      raw: payload,
    };
  }

  const runningRaw = resolveKey(payload, 'running', 'is_running', 'online');
  const running = interpretBoolean(runningRaw);
  const state = normaliseServerStatusPayload(payload);

  const statusText = resolveKey(payload, 'status', 'state', 'message', 'detail');
  const pidValue = resolveKey(payload, 'pid', 'process_id');
  const sinceValue = resolveKey(payload, 'state_since', 'stateSince');
  const durationValue = resolveKey(payload, 'state_duration_seconds', 'stateDurationSeconds');
  const canStartValue = resolveKey(payload, 'can_start', 'canStart');
  const canStopValue = resolveKey(payload, 'can_stop', 'canStop');

  const duration = typeof durationValue === 'number' && Number.isFinite(durationValue)
    ? Math.max(0, durationValue)
    : null;

  return {
    state,
    running,
    status: coerceString(statusText),
    pid: coerceInteger(pidValue),
    stateSince: coerceString(sinceValue),
    stateDurationSeconds: duration,
    canStart: interpretBoolean(canStartValue) === true,
    canStop: interpretBoolean(canStopValue) === true,
    raw: payload,
  };
}
