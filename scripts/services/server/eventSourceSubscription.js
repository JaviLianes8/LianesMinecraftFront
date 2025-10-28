import { buildApiUrl } from '../../config.js';
import { getStreamSubscriptionRegistry } from './streamSubscriptionRegistry.js';

const SubscriptionStatus = Object.freeze({
  CONNECTED: 'connected',
  DEFERRED: 'deferred',
  UNSUPPORTED: 'unsupported',
  FAILED: 'failed',
});

/**
 * Creates a resilient {@link EventSource} subscription with consistent lifecycle handling.
 *
 * @param {string} endpoint Relative API endpoint to connect to.
 * @param {Object} [handlers] Optional callbacks that react to stream activity.
 * @param {(event: MessageEvent<string>) => void} [handlers.onMessage] Invoked with each non-empty message.
 * @param {() => void} [handlers.onOpen] Invoked once the stream is confirmed ready.
 * @param {(event: Event | Error) => void} [handlers.onError] Invoked when the browser reports a stream error.
 * @returns {{ close: () => void, source: EventSource | null, status: string, retryInMs: number }}
 * Handle that terminates the subscription along with subscription metadata.
 */
export function createEventSourceSubscription(endpoint, { onMessage, onOpen, onError } = {}) {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return {
      close: () => {},
      source: null,
      status: SubscriptionStatus.UNSUPPORTED,
      retryInMs: 0,
    };
  }

  const registry = getStreamSubscriptionRegistry();
  const evaluation = registry.evaluate(endpoint);
  if (!evaluation.permitted) {
    return {
      close: () => {},
      source: null,
      status: SubscriptionStatus.DEFERRED,
      retryInMs: evaluation.delayMs,
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
      status: SubscriptionStatus.FAILED,
      retryInMs: 0,
    };
  }

  let hasAnnouncedOpen = false;
  const announceOpen = () => {
    if (hasAnnouncedOpen) {
      return;
    }
    hasAnnouncedOpen = true;
    registry.recordOpen(endpoint);
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
    registry.recordClose(endpoint);
  };

  return { close, source, status: SubscriptionStatus.CONNECTED, retryInMs: 0 };
}
