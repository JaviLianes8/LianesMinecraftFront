const STATUS_FALLBACK_INTERVAL_MS = 30000;

/**
 * Coordinates the streaming and polling mechanisms for the server status endpoint.
 */
export function createStatusCoordinator(
  {
    subscribeToServerStatusStream,
    fetchServerStatus,
    fallbackIntervalMs = STATUS_FALLBACK_INTERVAL_MS,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    logger = console,
  },
  handlers = {},
) {
  let statusStreamSubscription = null;
  let statusSnapshotPromise = null;
  let fallbackPollingId = null;
  let reconnectTimeoutId = null;

  const handleStreamOpen = () => {
    stopFallbackPolling();
    handlers.onStreamOpen?.();
  };

  const handleStreamStatus = (payload) => {
    handlers.onStreamStatus?.(payload);
  };

  const handleStreamError = () => {
    startFallbackPolling();
    handlers.onStreamError?.();
  };

  const cleanupStream = () => {
    if (statusStreamSubscription && typeof statusStreamSubscription.close === 'function') {
      statusStreamSubscription.close();
    }
    statusStreamSubscription = null;
  };

  const cancelScheduledReconnect = () => {
    if (!reconnectTimeoutId) {
      return;
    }

    clearTimeoutFn(reconnectTimeoutId);
    reconnectTimeoutId = null;
  };

  const scheduleReconnect = (delayMs) => {
    if (!Number.isFinite(delayMs) || delayMs <= 0 || reconnectTimeoutId) {
      return;
    }

    reconnectTimeoutId = setTimeoutFn(() => {
      reconnectTimeoutId = null;
      connect();
    }, delayMs);
  };

  const connect = () => {
    cleanupStream();
    cancelScheduledReconnect();

    statusStreamSubscription = subscribeToServerStatusStream({
      onOpen: handleStreamOpen,
      onStatus: handleStreamStatus,
      onError: handleStreamError,
    });

    if (!statusStreamSubscription.source) {
      const { status, retryInMs } = statusStreamSubscription;
      startFallbackPolling();
      if (status === 'unsupported') {
        handlers.onStreamUnsupported?.();
      } else {
        scheduleReconnect(typeof retryInMs === 'number' ? retryInMs : fallbackIntervalMs);
      }
      return;
    }

    stopFallbackPolling();
  };

  const startFallbackPolling = () => {
    if (fallbackPollingId) {
      return;
    }

    handlers.onFallbackStart?.();
    fallbackPollingId = setIntervalFn(() => {
      requestSnapshot().catch((error) => {
        logger.error('Unable to refresh status snapshot during fallback polling', error);
      });
      handlers.onFallbackTick?.();
    }, fallbackIntervalMs);
  };

  const stopFallbackPolling = () => {
    if (!fallbackPollingId) {
      return;
    }

    clearIntervalFn(fallbackPollingId);
    fallbackPollingId = null;
    handlers.onFallbackStop?.();
  };

  const requestSnapshot = () => {
    if (statusSnapshotPromise) {
      return statusSnapshotPromise;
    }

    statusSnapshotPromise = (async () => {
      try {
        const { state } = await fetchServerStatus();
        handlers.onSnapshotSuccess?.({ state });
      } catch (error) {
        handlers.onSnapshotError?.(error);
      } finally {
        statusSnapshotPromise = null;
      }
    })();

    return statusSnapshotPromise;
  };

  const cleanup = () => {
    cleanupStream();
    stopFallbackPolling();
    cancelScheduledReconnect();
  };

  return Object.freeze({ connect, requestSnapshot, cleanup, startFallbackPolling, stopFallbackPolling });
}
