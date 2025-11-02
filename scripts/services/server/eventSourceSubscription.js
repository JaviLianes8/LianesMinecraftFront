import { buildApiUrl } from '../../config.js';

/**
 * Creates a resilient {@link EventSource} subscription with consistent lifecycle handling.
 *
 * @param {string} endpoint Relative API endpoint to connect to.
 * @param {Object} [handlers] Optional callbacks that react to stream activity.
 * @param {(event: MessageEvent<string>) => void} [handlers.onMessage] Invoked with each non-empty message.
 * @param {() => void} [handlers.onOpen] Invoked once the stream is confirmed ready.
 * @param {(event: Event | Error) => void} [handlers.onError] Invoked when the browser reports a stream error.
 * @param {number} [handlers.heartbeatTimeoutMs] Milliseconds to wait for the next heartbeat before aborting.
 * @returns {{ close: () => void, source: EventSource | null }} Handle that terminates the subscription.
 */
export function createEventSourceSubscription(endpoint, {
  onMessage,
  onOpen,
  onError,
  heartbeatTimeoutMs,
} = {}) {
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
  const shouldTrackHeartbeat = Number.isFinite(heartbeatTimeoutMs) && heartbeatTimeoutMs > 0;
  let heartbeatTimeoutId = null;
  const resetHeartbeat = () => {
    if (!shouldTrackHeartbeat) {
      return;
    }
    if (heartbeatTimeoutId !== null) {
      clearTimeout(heartbeatTimeoutId);
    }
    heartbeatTimeoutId = setTimeout(() => {
      heartbeatTimeoutId = null;
      close();
      handleError(new Error(`Stream heartbeat timeout after ${heartbeatTimeoutMs}ms`));
    }, heartbeatTimeoutMs);
  };

  const announceOpen = () => {
    if (hasAnnouncedOpen) {
      return;
    }
    hasAnnouncedOpen = true;
    resetHeartbeat();
    if (typeof onOpen === 'function') {
      onOpen();
    }
  };

  const handleMessage = (event) => {
    if (!event || typeof event.data !== 'string') {
      return;
    }

    resetHeartbeat();
    if (event.data.length === 0 && (!event.type || event.type === 'message')) {
      announceOpen();
      return;
    }

    if (event.data.trim().toLowerCase() === 'ping') {
      announceOpen();
      return;
    }

    announceOpen();

    if (typeof onMessage === 'function') {
      onMessage(event);
    }
  };

  const handlePing = () => {
    announceOpen();
    resetHeartbeat();
  };

  const handleOpen = () => {
    announceOpen();
  };

  const handleError = (event) => {
    hasAnnouncedOpen = false;
    if (heartbeatTimeoutId !== null) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }
    if (typeof onError === 'function') {
      onError(event);
    }
  };

  source.addEventListener('message', handleMessage);
  source.addEventListener('ping', handlePing);
  source.addEventListener('open', handleOpen);
  source.addEventListener('error', handleError);

  const close = () => {
    hasAnnouncedOpen = false;
    if (heartbeatTimeoutId !== null) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }
    source.removeEventListener('message', handleMessage);
    source.removeEventListener('ping', handlePing);
    source.removeEventListener('open', handleOpen);
    source.removeEventListener('error', handleError);
    source.close();
  };

  return { close, source };
}
