import { request } from '../../http/request.js';
import { createEventSourceSubscription } from './eventSourceSubscription.js';

const PLAYERS_STREAM_ENDPOINT = '/server/players/stream';
const PLAYERS_SNAPSHOT_ENDPOINT = '/server/players';
const PLAYERS_STREAM_HEARTBEAT_TIMEOUT_MS = 5000;

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
    heartbeatTimeoutMs: PLAYERS_STREAM_HEARTBEAT_TIMEOUT_MS,
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
