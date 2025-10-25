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
import { createPlayersStage } from './ui/playersStage.js';

const statusButton = document.querySelector('[data-role="status-button"]');
const startButton = document.querySelector('[data-role="start-button"]');
const stopButton = document.querySelector('[data-role="stop-button"]');
const infoPanel = document.querySelector('[data-role="info-panel"]');
const controlCard = document.querySelector('.control-card');
const torchSvg = document.querySelector('[data-role="torch"]');
const flame = document.querySelector('[data-role="flame"]');
const javaLink = document.querySelector('[data-role="download-java"]');
const installHelpButton = document.querySelector('[data-role="install-help-button"]');
const installModal = document.querySelector('[data-role="install-modal"]');
const installModalCloseButton = document.querySelector('[data-role="install-modal-close"]');
const installModalOverlay = document.querySelector('[data-role="install-modal-overlay"]');
const installModalTitle = document.querySelector('[data-role="install-modal-title"]');
const installModalBody = document.querySelector('[data-role="install-modal-body"]');
const installModalContent = document.querySelector('[data-role="install-modal-content"]');

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
let playersStage = null;

const STATUS_FALLBACK_INTERVAL_MS = 30000;
const MODAL_TRANSITION_MS = 200;
const MODAL_HORIZONTAL_OFFSET_PX = 24;

const defaultButtonLabels = new Map();

initialise();

function initialise() {
  applyLocaleToStaticContent();
  cacheDefaultButtonLabels();
  renderStatus(statusButton, torchSvg, flame, currentState);
  initialisePlayersStage();
  prepareStatusIndicator();
  prepareInstallationModal();
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

  if (javaLink) {
    javaLink.textContent = t('ui.downloads.java');
    javaLink.setAttribute('href', 'https://www.java.com/en/download/');
  }

  if (installHelpButton) {
    installHelpButton.textContent = t('ui.downloads.help');
  }

  if (installModalTitle) {
    installModalTitle.textContent = t('ui.installation.popup.title');
  }

  if (installModalBody) {
    installModalBody.innerHTML = t('ui.installation.popup.body');
  }
}

function prepareInstallationModal() {
  if (!installModal || !installHelpButton) {
    return;
  }

  installHelpButton.addEventListener('click', openInstallationModal);

  if (installModalCloseButton) {
    installModalCloseButton.addEventListener('click', closeInstallationModal);
  }

  if (installModalOverlay) {
    installModalOverlay.addEventListener('click', closeInstallationModal);
  }

  document.addEventListener('keydown', handleModalKeydown);

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleModalViewportChange);
  }
}

function handleModalKeydown(event) {
  if (event.key === 'Escape' && installModal?.classList.contains('modal--visible')) {
    closeInstallationModal();
  }
}

function openInstallationModal() {
  if (!installModal) {
    return;
  }

  installModal.removeAttribute('hidden');

  positionModalNearTorch();

  const presentModal = () => {
    installModal.classList.add('modal--visible');
    installModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    if (installModalCloseButton) {
      installModalCloseButton.focus();
    }
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(presentModal);
    return;
  }

  presentModal();
}

function closeInstallationModal() {
  if (!installModal) {
    return;
  }

  installModal.classList.remove('modal--visible');
  installModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  resetModalAnchoring();

  if (installHelpButton) {
    installHelpButton.focus();
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hideModal = () => {
    installModal.setAttribute('hidden', '');
  };

  if (prefersReducedMotion) {
    hideModal();
    return;
  }

  const scheduleHide =
    typeof window !== 'undefined' && typeof window.setTimeout === 'function'
      ? window.setTimeout.bind(window)
      : setTimeout;

  scheduleHide(() => {
    if (!installModal.classList.contains('modal--visible')) {
      hideModal();
    }
  }, MODAL_TRANSITION_MS);
}

function handleModalViewportChange() {
  if (!installModal?.classList.contains('modal--visible')) {
    return;
  }

  positionModalNearTorch();
}

function positionModalNearTorch() {
  if (!installModalContent || !torchSvg) {
    return;
  }

  installModalContent.style.removeProperty('--modal-anchored-top');
  installModalContent.style.removeProperty('--modal-anchored-left');
  installModalContent.style.removeProperty('--modal-anchored-translate-x');

  if (typeof window === 'undefined') {
    return;
  }

  const torchBounds = torchSvg.getBoundingClientRect();
  const modalBounds = installModalContent.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  if (!torchBounds || !modalBounds || !viewportHeight || !viewportWidth) {
    return;
  }

  const torchMidpoint = torchBounds.top + torchBounds.height / 2;
  let desiredTop = torchMidpoint - modalBounds.height / 2;

  const minimumOffset = 16;
  const maximumOffset = Math.max(minimumOffset, viewportHeight - modalBounds.height - minimumOffset);

  if (Number.isFinite(desiredTop)) {
    desiredTop = Math.min(Math.max(desiredTop, minimumOffset), maximumOffset);
    installModalContent.style.setProperty('--modal-anchored-top', `${desiredTop}px`);
  }

  const minimumLeft = minimumOffset;
  const maximumLeft = Math.max(minimumLeft, viewportWidth - modalBounds.width - minimumOffset);
  let desiredLeft = torchBounds.right + MODAL_HORIZONTAL_OFFSET_PX;

  if (Number.isFinite(desiredLeft)) {
    desiredLeft = Math.min(Math.max(desiredLeft, minimumLeft), maximumLeft);
    installModalContent.style.setProperty('--modal-anchored-left', `${desiredLeft}px`);
    installModalContent.style.setProperty('--modal-anchored-translate-x', '0');
  }
}

function resetModalAnchoring() {
  if (!installModalContent) {
    return;
  }

  installModalContent.style.removeProperty('--modal-anchored-top');
  installModalContent.style.removeProperty('--modal-anchored-left');
  installModalContent.style.removeProperty('--modal-anchored-translate-x');
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
  destroyPlayersStage();
}

function handlePlayersUpdate(snapshot) {
  const players = snapshot && Array.isArray(snapshot.players) ? snapshot.players : [];
  updatePlayersStage(players);
}

function initialisePlayersStage() {
  if (playersStage || !controlCard) {
    return;
  }

  playersStage = createPlayersStage({ container: controlCard });
}

function updatePlayersStage(players) {
  if (!playersStage) {
    return;
  }

  playersStage.updatePlayers(players);
}

function destroyPlayersStage() {
  if (playersStage && typeof playersStage.destroy === 'function') {
    playersStage.destroy();
  }
  playersStage = null;
}
