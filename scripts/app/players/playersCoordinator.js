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
    logger = console,
  },
  handlers = {},
) {
  let playersStreamSubscription = null;
  let playersSnapshotPromise = null;
  let playersFallbackPollingId = null;
  let reconnectInFlight = false;

  const cleanupStream = () => {
    if (playersStreamSubscription && typeof playersStreamSubscription.close === 'function') {
      playersStreamSubscription.close();
    }
    playersStreamSubscription = null;
  };

  const connect = () => {
    cleanupStream();

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
      startFallbackPolling();
      handlers.onStreamUnsupported?.();
      requestSnapshot();
      return;
    }

    playersStreamSubscription = subscription;
    stopFallbackPolling();
  };

  const shouldAttemptReconnect = () => {
    return !playersStreamSubscription || !playersStreamSubscription.source;
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
    scheduleReconnectAttempt();
    playersFallbackPollingId = setIntervalFn(() => {
      requestSnapshot();
      scheduleReconnectAttempt();
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
  };

  return Object.freeze({ connect, requestSnapshot, startFallbackPolling, stopFallbackPolling, cleanup });
}
