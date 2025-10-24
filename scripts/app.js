import { buildApiUrl } from './config.js';
import { HttpError, TimeoutError } from './httpClient.js';
import {
  fetchServerStatus,
  fetchPlayersSnapshot,
  startServer,
  stopServer,
  ServerLifecycleState,
  subscribeToServerStatusStream,
  connectToPlayersStream,
} from './services/serverService.js';
import { getActiveLocale, translate as t } from './ui/i18n.js';
import { InfoViewState, renderInfo, renderStatus, StatusViewState } from './ui/statusPresenter.js';
import { createPlayerMascot } from './ui/playerMascot.js';
import { createPlayersPanel } from './ui/playersPresenter.js';

const statusButton = document.querySelector('[data-role="status-button"]');
const startButton = document.querySelector('[data-role="start-button"]');
const stopButton = document.querySelector('[data-role="stop-button"]');
const infoPanel = document.querySelector('[data-role="info-panel"]');
const controlCard = document.querySelector('.control-card');
const torchSvg = document.querySelector('[data-role="torch"]');
const flame = document.querySelector('[data-role="flame"]');
const playersPanelRoot = document.querySelector('[data-role="players-panel"]');
const playersTitle = document.querySelector('[data-role="players-title"]');
const playersCount = document.querySelector('[data-role="players-count"]');
const playersEmpty = document.querySelector('[data-role="players-empty"]');
const playersList = document.querySelector('[data-role="players-list"]');

let currentState = ServerLifecycleState.UNKNOWN;
let statusEligible = false;
let busy = false;
let statusStreamSubscription = null;
let hasReceivedStatusUpdate = false;
let streamHasError = false;
let statusSnapshotPromise = null;
let fallbackPollingId = null;
let playersStreamSubscription = null;
let playersSnapshotPromise = null;
let playersFallbackPollingId = null;
let playerMascot = null;
let currentMascotName = null;
let playersPanelView = null;

const STATUS_FALLBACK_INTERVAL_MS = 30000;

const defaultButtonLabels = new Map();

initialise();

function initialise() {
  initialisePlayersPanel();
  applyLocaleToStaticContent();
  cacheDefaultButtonLabels();
  renderStatus(statusButton, torchSvg, flame, currentState);
  initialisePlayerMascot();
  prepareStatusIndicator();
  renderInfo(infoPanel, t('info.stream.connecting'), InfoViewState.PENDING);
  updateControlAvailability();

  startButton.addEventListener('click', handleStartRequest);
  stopButton.addEventListener('click', handleStopRequest);

  connectToStatusStream();
  connectToPlayersStreamChannel();
  requestStatusSnapshot();
  requestPlayersSnapshot();

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanupAllStreams, { once: true });
  }
}

function applyLocaleToStaticContent() {
  const locale = getActiveLocale();
  document.documentElement.lang = locale;
  document.title = t('ui.title');

  const mainTitle = document.querySelector('[data-role="main-title"]');
  if (mainTitle) {
    mainTitle.textContent = t('ui.title');
  }

  startButton.textContent = t('ui.controls.start');
  startButton.setAttribute('aria-label', startButton.textContent);

  stopButton.textContent = t('ui.controls.stop');
  stopButton.setAttribute('aria-label', stopButton.textContent);

  const downloadsLabel = document.querySelector('[data-role="downloads-label"]');
  if (downloadsLabel) {
    downloadsLabel.textContent = t('ui.downloads.label');
  }

  const modsLink = document.querySelector('[data-role="download-mods"]');
  if (modsLink) {
    modsLink.textContent = t('ui.downloads.mods');
    updateDownloadLinkHref(modsLink, 'mods/download');
  }

  const neoforgeLink = document.querySelector('[data-role="download-neoforge"]');
  if (neoforgeLink) {
    neoforgeLink.textContent = t('ui.downloads.neoforge');
    updateDownloadLinkHref(neoforgeLink, 'neoforge/download');
  }

  applyLocaleToPlayersPanel();
}

function cacheDefaultButtonLabels() {
  defaultButtonLabels.set(startButton, startButton.textContent.trim());
  defaultButtonLabels.set(stopButton, stopButton.textContent.trim());
}

function prepareStatusIndicator() {
  statusButton.setAttribute('type', 'button');
  statusButton.setAttribute('disabled', 'true');
  statusButton.setAttribute('aria-disabled', 'true');
  updateButtonTooltip(statusButton, t('info.status.readOnly'));
}

function updateControlAvailability() {
  statusButton.setAttribute('disabled', 'true');
  statusButton.setAttribute('aria-disabled', 'true');
  updateButtonTooltip(statusButton, t('info.status.readOnly'));

  const startDisabled = busy || !statusEligible || currentState !== ServerLifecycleState.OFFLINE;
  startButton.toggleAttribute('disabled', startDisabled);
  startButton.setAttribute('aria-disabled', startDisabled ? 'true' : 'false');
  updateButtonTooltip(
    startButton,
    busy
      ? t('info.busy')
      : !statusEligible || currentState !== ServerLifecycleState.OFFLINE
        ? t('info.start.requireOffline')
        : null,
  );

  const stopDisabled = busy || !statusEligible || currentState !== ServerLifecycleState.ONLINE;
  stopButton.toggleAttribute('disabled', stopDisabled);
  stopButton.setAttribute('aria-disabled', stopDisabled ? 'true' : 'false');
  updateButtonTooltip(
    stopButton,
    busy
      ? t('info.busy')
      : !statusEligible || currentState !== ServerLifecycleState.ONLINE
        ? t('info.stop.requireOnline')
        : null,
  );
}

function updateDownloadLinkHref(anchor, resourcePath) {
  try {
    anchor.href = buildApiUrl(resourcePath);
  } catch (error) {
    console.error('Unable to resolve download URL for', resourcePath, error);
  }
}

async function handleStartRequest() {
  if (!statusEligible || currentState !== ServerLifecycleState.OFFLINE) {
    renderInfo(infoPanel, t('info.start.requireOffline'), InfoViewState.ERROR);
    return;
  }

  await executeControlAction(
    () => startServer(),
    t('info.start.pending'),
    t('info.start.success'),
    {
      sourceButton: startButton,
      busyLabel: t('ui.controls.start.busy'),
    },
  );
}

async function handleStopRequest() {
  if (!statusEligible || currentState !== ServerLifecycleState.ONLINE) {
    renderInfo(infoPanel, t('info.stop.requireOnline'), InfoViewState.ERROR);
    return;
  }

  if (!confirmStopAction()) {
    return;
  }

  await executeControlAction(
    () => stopServer(),
    t('info.stop.pending'),
    t('info.stop.success'),
    {
      sourceButton: stopButton,
      busyLabel: t('ui.controls.stop.busy'),
    },
  );
}

async function executeControlAction(
  action,
  pendingMessage,
  successMessage,
  options = {},
) {
  setBusy(true, StatusViewState.PROCESSING);
  renderInfo(infoPanel, pendingMessage, InfoViewState.PENDING);

  const { sourceButton, busyLabel } = options;
  const restoreButtonState = sourceButton
    ? setControlButtonBusy(sourceButton, busyLabel)
    : null;

  try {
    await action();
    currentState = ServerLifecycleState.UNKNOWN;
    statusEligible = false;
    renderStatus(statusButton, torchSvg, flame, currentState);
    renderInfo(infoPanel, successMessage, InfoViewState.SUCCESS);
  } catch (error) {
    currentState = ServerLifecycleState.ERROR;
    statusEligible = false;
    renderInfo(infoPanel, describeError(error), InfoViewState.ERROR);
  } finally {
    if (restoreButtonState) {
      restoreButtonState();
    }
    setBusy(false);
  }
}

function setBusy(value, viewState = currentState) {
  busy = value;
  updateControlAvailability();
  renderStatus(statusButton, torchSvg, flame, viewState);
  statusButton.setAttribute('aria-busy', value ? 'true' : 'false');
}

function connectToStatusStream() {
  cleanupStatusStream();
  streamHasError = false;
  hasReceivedStatusUpdate = false;

  statusStreamSubscription = subscribeToServerStatusStream({
    onOpen: handleStreamOpen,
    onStatus: handleStreamStatusUpdate,
    onError: handleStreamError,
  });

  if (!statusStreamSubscription.source) {
    renderInfo(infoPanel, t('info.stream.unsupported'), InfoViewState.ERROR);
    startFallbackPolling();
    return;
  }

  stopFallbackPolling();
}

function connectToPlayersStreamChannel() {
  cleanupPlayersStream();

  const subscription = connectToPlayersStream({
    onOpen: handlePlayersStreamOpen,
    onPlayers: handlePlayersUpdate,
    onError: handlePlayersStreamError,
  });

  if (!subscription.source) {
    startPlayersFallbackPolling();
    requestPlayersSnapshot();
    return;
  }

  playersStreamSubscription = subscription;
  stopPlayersFallbackPolling();
}

function handleStreamOpen() {
  streamHasError = false;
  stopFallbackPolling();
  if (!hasReceivedStatusUpdate) {
    renderInfo(infoPanel, t('info.stream.connected'), InfoViewState.SUCCESS);
  }
}

function handleStreamStatusUpdate({ state }) {
  streamHasError = false;
  applyServerLifecycleState(state);
}

function handleStreamError() {
  startFallbackPolling();
  if (streamHasError) {
    return;
  }

  streamHasError = true;
  const infoKey = hasReceivedStatusUpdate ? 'info.stream.reconnecting' : 'info.stream.error';
  const infoState = hasReceivedStatusUpdate ? InfoViewState.PENDING : InfoViewState.ERROR;
  renderInfo(infoPanel, t(infoKey), infoState);

  requestStatusSnapshot().catch((error) => {
    console.error('Unable to refresh status snapshot after stream error', error);
  });

  requestPlayersSnapshot().catch((error) => {
    console.error('Unable to refresh players snapshot after stream error', error);
  });
}

function cleanupStatusStream() {
  if (statusStreamSubscription && typeof statusStreamSubscription.close === 'function') {
    statusStreamSubscription.close();
  }
  statusStreamSubscription = null;
  stopFallbackPolling();
}

function cleanupPlayersStream() {
  if (playersStreamSubscription && typeof playersStreamSubscription.close === 'function') {
    playersStreamSubscription.close();
  }
  playersStreamSubscription = null;
  stopPlayersFallbackPolling();
}

function startFallbackPolling() {
  stopFallbackPolling();
  fallbackPollingId = setInterval(() => {
    requestStatusSnapshot();
  }, STATUS_FALLBACK_INTERVAL_MS);

  startPlayersFallbackPolling();
}

function stopFallbackPolling() {
  if (fallbackPollingId) {
    clearInterval(fallbackPollingId);
    fallbackPollingId = null;
  }
}

function startPlayersFallbackPolling() {
  if (playersFallbackPollingId) {
    return;
  }

  playersFallbackPollingId = setInterval(() => {
    requestPlayersSnapshot();
  }, STATUS_FALLBACK_INTERVAL_MS);
}

function stopPlayersFallbackPolling() {
  if (!playersFallbackPollingId) {
    return;
  }

  clearInterval(playersFallbackPollingId);
  playersFallbackPollingId = null;
}

function applyServerLifecycleState(state) {
  hasReceivedStatusUpdate = true;
  currentState = state;
  statusEligible = state === ServerLifecycleState.ONLINE || state === ServerLifecycleState.OFFLINE;
  renderStatus(statusButton, torchSvg, flame, state);
  updateControlAvailability();

  const { message, viewState } = resolveLifecycleInfo(state);
  renderInfo(infoPanel, message, viewState);
}

function resolveLifecycleInfo(state) {
  if (state === ServerLifecycleState.ONLINE) {
    return { message: t('info.online'), viewState: InfoViewState.SUCCESS };
  }
  if (state === ServerLifecycleState.OFFLINE) {
    return { message: t('info.offline'), viewState: InfoViewState.SUCCESS };
  }
  if (state === ServerLifecycleState.ERROR) {
    return { message: t('info.error'), viewState: InfoViewState.ERROR };
  }
  return { message: t('info.unknown'), viewState: InfoViewState.PENDING };
}

function requestStatusSnapshot() {
  if (statusSnapshotPromise) {
    return statusSnapshotPromise;
  }

  statusSnapshotPromise = (async () => {
    try {
      const { state } = await fetchServerStatus();
      applyServerLifecycleState(state);
    } catch (error) {
      currentState = ServerLifecycleState.ERROR;
      statusEligible = false;
      renderStatus(statusButton, torchSvg, flame, StatusViewState.ERROR);
      updateControlAvailability();
      renderInfo(infoPanel, describeError(error), InfoViewState.ERROR);
    } finally {
      statusSnapshotPromise = null;
    }
  })();

  return statusSnapshotPromise;
}

function requestPlayersSnapshot() {
  if (playersSnapshotPromise) {
    return playersSnapshotPromise;
  }

  playersSnapshotPromise = (async () => {
    try {
      const snapshot = await fetchPlayersSnapshot();
      handlePlayersUpdate(snapshot);
    } catch (error) {
      console.error('Unable to fetch players snapshot', error);
    } finally {
      playersSnapshotPromise = null;
    }
  })();

  return playersSnapshotPromise;
}

function confirmStopAction() {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    return true;
  }

  const firstConfirmation = window.confirm(t('confirm.stop.first'));
  if (!firstConfirmation) {
    return false;
  }

  return window.confirm(t('confirm.stop.second'));
}

function describeError(error) {
  if (error instanceof TimeoutError) {
    return t('error.timeout');
  }

  if (error instanceof HttpError) {
    const description = describeHttpStatus(error.status);
    if (description) {
      return t('error.httpWithDescription', { status: error.status, description });
    }
    return t('error.httpGeneric', { status: error.status });
  }

  if (error instanceof TypeError) {
    return t('error.network');
  }

  return t('error.generic');
}

function describeHttpStatus(status) {
  if (typeof status !== 'number' || Number.isNaN(status) || status <= 0) {
    return '';
  }
  const key = `http.${status}`;
  const translation = t(key);
  return translation === key ? '' : translation;
}

function updateButtonTooltip(button, message) {
  if (message) {
    button.title = message;
  } else {
    button.removeAttribute('title');
  }
}

function setControlButtonBusy(button, customLabel) {
  const label = customLabel ?? t('ui.controls.generic.busy');
  button.dataset.loading = 'true';
  button.setAttribute('aria-busy', 'true');
  button.textContent = label;

  return () => {
    delete button.dataset.loading;
    button.setAttribute('aria-busy', 'false');
    const defaultLabel = defaultButtonLabels.get(button);
    if (defaultLabel) {
      button.textContent = defaultLabel;
    }
  };
}

function handlePlayersStreamOpen() {
  stopPlayersFallbackPolling();
}

function handlePlayersStreamError() {
  startPlayersFallbackPolling();
  requestPlayersSnapshot().catch((error) => {
    console.error('Unable to refresh players snapshot after stream error', error);
  });
}

function cleanupAllStreams() {
  cleanupStatusStream();
  cleanupPlayersStream();
  destroyPlayerMascot();
}

function handlePlayersUpdate(snapshot) {
  const players = snapshot && Array.isArray(snapshot.players) ? snapshot.players : [];
  updatePlayerMascot(players);
  if (playersPanelView) {
    playersPanelView.renderSnapshot(snapshot);
  }
}

function initialisePlayerMascot() {
  if (playerMascot || !controlCard) {
    return;
  }

  playerMascot = createPlayerMascot({ container: controlCard });
  if (currentMascotName) {
    playerMascot.updateName(currentMascotName);
  }
}

function updatePlayerMascot(players) {
  const resolvedName = resolvePreferredPlayerName(players);
  if (resolvedName === currentMascotName) {
    return;
  }

  currentMascotName = resolvedName;
  if (playerMascot && typeof playerMascot.updateName === 'function') {
    playerMascot.updateName(currentMascotName);
  }
}

function resolvePreferredPlayerName(players) {
  if (!Array.isArray(players)) {
    return null;
  }

  for (const player of players) {
    if (!player || typeof player.name !== 'string') {
      continue;
    }

    const trimmed = player.name.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
}

function destroyPlayerMascot() {
  if (playerMascot && typeof playerMascot.destroy === 'function') {
    playerMascot.destroy();
  }
  playerMascot = null;
}

function initialisePlayersPanel() {
  if (playersPanelView || !playersPanelRoot) {
    return;
  }

  playersPanelView = createPlayersPanel({
    root: playersPanelRoot,
    titleElement: playersTitle,
    countElement: playersCount,
    emptyElement: playersEmpty,
    listElement: playersList,
  });
}

function applyLocaleToPlayersPanel() {
  if (!playersPanelView) {
    if (playersTitle) {
      playersTitle.textContent = t('ui.players.title');
    }
    if (playersCount) {
      playersCount.textContent = t('ui.players.loading');
    }
    if (playersEmpty) {
      playersEmpty.textContent = t('ui.players.loading');
    }
    return;
  }

  playersPanelView.applyCopy({
    title: t('ui.players.title'),
    loading: t('ui.players.loading'),
    empty: t('ui.players.empty'),
    count: (count) => formatPlayersCountLabel(count),
    connectedSince: (connectedSince) => formatConnectedSinceLabel(connectedSince),
  });
}

function formatPlayersCountLabel(count) {
  if (typeof count !== 'number' || Number.isNaN(count) || count < 0) {
    return t('ui.players.count.zero');
  }

  if (count === 0) {
    return t('ui.players.count.zero');
  }

  if (count === 1) {
    return t('ui.players.count.one');
  }

  return t('ui.players.count.other', { count });
}

function formatConnectedSinceLabel(connectedSince) {
  if (!connectedSince || typeof connectedSince !== 'string') {
    return '';
  }

  const parsed = new Date(connectedSince);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const locale = getActiveLocale();
  const now = new Date();

  let timeLabel = '';
  try {
    timeLabel = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(parsed);
  } catch (error) {
    console.warn('Unable to format player time using Intl API', error);
    timeLabel = parsed.toLocaleTimeString(locale);
  }

  if (isSameCalendarDay(parsed, now)) {
    return t('ui.players.connectedSince', { time: timeLabel });
  }

  let dateLabel = '';
  try {
    dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed);
  } catch (error) {
    console.warn('Unable to format player date using Intl API', error);
    dateLabel = parsed.toLocaleDateString(locale);
  }

  return t('ui.players.connectedSinceWithDate', { date: dateLabel, time: timeLabel });
}

function isSameCalendarDay(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}
