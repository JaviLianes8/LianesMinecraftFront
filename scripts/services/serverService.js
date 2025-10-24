import { buildApiUrl } from '../config.js';
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

const STATUS_STREAM_ENDPOINT = '/server/status/stream';
const PLAYERS_STREAM_ENDPOINT = '/server/players/stream';
const PLAYERS_SNAPSHOT_ENDPOINT = '/server/players';

/**
 * Creates a resilient {@link EventSource} subscription with consistent lifecycle handling.
 *
 * @param {string} endpoint Relative API endpoint to connect to.
 * @param {Object} [handlers] Optional callbacks that react to stream activity.
 * @param {(event: MessageEvent<string>) => void} [handlers.onMessage] Invoked with each non-empty message.
 * @param {() => void} [handlers.onOpen] Invoked once the stream is confirmed ready.
 * @param {(event: Event | Error) => void} [handlers.onError] Invoked when the browser reports a stream error.
 * @returns {{ close: () => void, source: EventSource | null }} Handle that terminates the subscription.
 */
function createEventSourceSubscription(endpoint, { onMessage, onOpen, onError } = {}) {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return {
      close: () => {},
      source: null,
    };
  }

  const url = buildApiUrl(endpoint);
  let source;
  try {
    source = new EventSource(url);
  } catch (error) {
    if (typeof onError === 'function') {
      onError(error);
    }
    return {
      close: () => {},
      source: null,
    };
  }

  let hasAnnouncedOpen = false;
  const announceOpen = () => {
    if (hasAnnouncedOpen) {
      return;
    }
    hasAnnouncedOpen = true;
    if (typeof onOpen === 'function') {
      onOpen();
    }
  };

  const handleMessage = (event) => {
    if (!event || typeof event.data !== 'string') {
      return;
    }

    if (event.data.length === 0 && (!event.type || event.type === 'message')) {
      announceOpen();
      return;
    }

    announceOpen();

    if (typeof onMessage === 'function') {
      onMessage(event);
    }
  };

  const handleOpen = () => {
    announceOpen();
  };

  const handleError = (event) => {
    hasAnnouncedOpen = false;
    if (typeof onError === 'function') {
      onError(event);
    }
  };

  source.addEventListener('message', handleMessage);
  source.addEventListener('open', handleOpen);
  source.addEventListener('error', handleError);

  const close = () => {
    hasAnnouncedOpen = false;
    source.removeEventListener('message', handleMessage);
    source.removeEventListener('open', handleOpen);
    source.removeEventListener('error', handleError);
    source.close();
  };

  return { close, source };
}

/**
 * Subscribes to the server status stream exposed by the backend using SSE.
 *
 * @param {Object} [handlers] Collection of callbacks invoked by stream events.
 * @param {(update: { state: string, raw: unknown }) => void} [handlers.onStatus] Invoked when a new payload is received.
 * @param {() => void} [handlers.onOpen] Invoked when the stream connection is established.
 * @param {(event: Event | Error) => void} [handlers.onError] Invoked when the browser reports a stream error.
 * @returns {{ close: () => void, source: EventSource | null }} Handle used to terminate the subscription.
 */
export function subscribeToServerStatusStream({ onStatus, onOpen, onError } = {}) {
  return createEventSourceSubscription(STATUS_STREAM_ENDPOINT, {
    onOpen,
    onError,
    onMessage: (event) => {
      if (!event || typeof event.data !== 'string' || event.data.length === 0) {
        return;
      }

      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch (error) {
        payload = event.data;
      }

      const state = normaliseServerStatusPayload(payload);
      if (typeof onStatus === 'function') {
        onStatus({ state, raw: payload });
      }
    },
  });
}

/**
 * Subscribes to the live players stream exposed by the backend using SSE.
 *
 * @param {Object} [handlers] Collection of callbacks invoked by stream events.
 * @param {(snapshot: { players: Array<{ name: string, connectedSince?: string }>, count: number }) => void} [handlers.onPlayers]
 * Updates the UI with the latest players snapshot.
 * @param {() => void} [handlers.onOpen] Invoked when the stream connection is confirmed ready.
 * @param {(event: Event | Error) => void} [handlers.onError] Invoked when the browser reports a stream error.
 * @returns {{ close: () => void, source: EventSource | null }} Handle that terminates the subscription.
 */
export function connectToPlayersStream({ onPlayers, onOpen, onError } = {}) {
  return createEventSourceSubscription(PLAYERS_STREAM_ENDPOINT, {
    onOpen,
    onError,
    onMessage: (event) => {
      if (!event || typeof event.data !== 'string' || event.data.length === 0) {
        return;
      }

      try {
        const rawPayload = JSON.parse(event.data);
        const snapshot = normalisePlayersSnapshotPayload(rawPayload);
        if (typeof onPlayers === 'function') {
          onPlayers(snapshot);
        }
      } catch (error) {
        console.warn('Unable to parse players stream payload', error);
      }
    },
  });
}

/**
 * Retrieves a one-off snapshot of the currently connected players.
 *
 * @returns {Promise<{ players: Array<{ name: string, connectedSince?: string }>, count: number }>} Normalised players snapshot.
 */
export async function fetchPlayersSnapshot() {
  const { data } = await request({ path: PLAYERS_SNAPSHOT_ENDPOINT });
  return normalisePlayersSnapshotPayload(data);
}

/**
 * Normalises payloads that describe connected players.
 *
 * @param {unknown} payload Raw payload returned by the backend.
 * @returns {{ players: Array<{ name: string, connectedSince?: string }>, count: number }} Sanitised snapshot.
 */
export function normalisePlayersSnapshotPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { players: [], count: 0 };
  }

  const rawPlayers = Array.isArray(payload.players) ? payload.players : [];
  const players = rawPlayers
    .map((entry) => {
      if (!entry) {
        return null;
      }

      if (typeof entry === 'string') {
        return { name: entry.trim() };
      }

      if (typeof entry === 'object') {
        const name = 'name' in entry && typeof entry.name === 'string'
          ? entry.name.trim()
          : '';
        if (!name) {
          return null;
        }

        const connectedSince = 'connected_since' in entry && typeof entry.connected_since === 'string'
          ? entry.connected_since
          : 'connectedSince' in entry && typeof entry.connectedSince === 'string'
            ? entry.connectedSince
            : undefined;

        return connectedSince
          ? { name, connectedSince }
          : { name };
      }

      return null;
    })
    .filter((entry) => entry && entry.name.length > 0);

  const count = typeof payload.count === 'number' && Number.isFinite(payload.count)
    ? Math.max(0, Math.trunc(payload.count))
    : players.length;

  return { players, count };
}
