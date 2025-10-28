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
    logger = console,
  },
  handlers = {},
) {
  let statusStreamSubscription = null;
  let statusSnapshotPromise = null;
  let fallbackPollingId = null;
  let reconnectInFlight = false;

  const handleStreamOpen = () => {
    stopFallbackPolling();
    handlers.onStreamOpen?.();
  };

  const handleStreamStatus = (payload) => {
    handlers.onStreamStatus?.(payload);
  };

  const handleStreamError = () => {
    cleanupStream();
    startFallbackPolling();
    handlers.onStreamError?.();
  };

  const cleanupStream = () => {
    if (statusStreamSubscription && typeof statusStreamSubscription.close === 'function') {
      statusStreamSubscription.close();
    }
    statusStreamSubscription = null;
  };

  const connect = () => {
    cleanupStream();

    statusStreamSubscription = subscribeToServerStatusStream({
      onOpen: handleStreamOpen,
      onStatus: handleStreamStatus,
      onError: handleStreamError,
    });

    if (!statusStreamSubscription.source) {
      startFallbackPolling();
      handlers.onStreamUnsupported?.();
      return;
    }

    stopFallbackPolling();
  };

  const shouldAttemptReconnect = () => {
    return !statusStreamSubscription || !statusStreamSubscription.source;
  };

  const scheduleReconnectAttempt = () => {
    if (!shouldAttemptReconnect() || reconnectInFlight) {
      return;
    }

    reconnectInFlight = true;
    Promise.resolve()
      .then(() => {
        if (shouldAttemptReconnect()) {
          connect();
        }
      })
      .finally(() => {
        reconnectInFlight = false;
      });
  };

  const startFallbackPolling = () => {
    if (fallbackPollingId) {
      return;
    }

    handlers.onFallbackStart?.();
    scheduleReconnectAttempt();
    requestSnapshot().catch((error) => {
      logger.error('Unable to refresh status snapshot during fallback start', error);
    });
    fallbackPollingId = setIntervalFn(() => {
      requestSnapshot().catch((error) => {
        logger.error('Unable to refresh status snapshot during fallback polling', error);
      });
      scheduleReconnectAttempt();
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
  };

  return Object.freeze({ connect, requestSnapshot, cleanup, startFallbackPolling, stopFallbackPolling });
}
