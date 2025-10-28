const PLAYERS_FALLBACK_INTERVAL_MS = 30000;

/**
 * Manages the player stream connection and fallback polling logic.
 */
export function createPlayersCoordinator(
  {
    connectToPlayersStream,
    fetchPlayersSnapshot,
    fallbackIntervalMs = PLAYERS_FALLBACK_INTERVAL_MS,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    logger = console,
  },
  handlers = {},
) {
  let playersStreamSubscription = null;
  let playersSnapshotPromise = null;
  let playersFallbackPollingId = null;
  let reconnectTimeoutId = null;

  const cleanupStream = () => {
    if (playersStreamSubscription && typeof playersStreamSubscription.close === 'function') {
      playersStreamSubscription.close();
    }
    playersStreamSubscription = null;
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

    const subscription = connectToPlayersStream({
      onOpen: () => {
        stopFallbackPolling();
        handlers.onStreamOpen?.();
      },
      onPlayers: (snapshot) => {
        handlers.onPlayers?.(snapshot);
      },
      onError: () => {
        startFallbackPolling();
        handlers.onStreamError?.();
      },
    });

    if (!subscription.source) {
      const { status, retryInMs } = subscription;
      startFallbackPolling();
      if (status === 'unsupported') {
        handlers.onStreamUnsupported?.();
      } else {
        scheduleReconnect(typeof retryInMs === 'number' ? retryInMs : fallbackIntervalMs);
      }
      requestSnapshot();
      return;
    }

    playersStreamSubscription = subscription;
    stopFallbackPolling();
  };

  const requestSnapshot = () => {
    if (playersSnapshotPromise) {
      return playersSnapshotPromise;
    }

    playersSnapshotPromise = (async () => {
      try {
        const snapshot = await fetchPlayersSnapshot();
        handlers.onPlayers?.(snapshot);
      } catch (error) {
        logger.error('Unable to fetch players snapshot', error);
        handlers.onSnapshotError?.(error);
      } finally {
        playersSnapshotPromise = null;
      }
    })();

    return playersSnapshotPromise;
  };

  const startFallbackPolling = () => {
    if (playersFallbackPollingId) {
      return;
    }

    handlers.onFallbackStart?.();
    playersFallbackPollingId = setIntervalFn(() => {
      requestSnapshot();
    }, fallbackIntervalMs);
  };

  const stopFallbackPolling = () => {
    if (!playersFallbackPollingId) {
      return;
    }

    clearIntervalFn(playersFallbackPollingId);
    playersFallbackPollingId = null;
    handlers.onFallbackStop?.();
  };

  const cleanup = () => {
    cleanupStream();
    stopFallbackPolling();
    cancelScheduledReconnect();
  };

  return Object.freeze({ connect, requestSnapshot, startFallbackPolling, stopFallbackPolling, cleanup });
}
