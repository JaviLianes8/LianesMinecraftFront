import { createEventSourceSubscription } from './eventSourceSubscription.js';
import { normaliseServerStatusPayload } from './lifecycle.js';

const STATUS_STREAM_ENDPOINT = '/server/status/stream';

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
