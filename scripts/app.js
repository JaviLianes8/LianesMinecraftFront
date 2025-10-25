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
import { getActiveLocale, setLocale, translate as t } from './ui/i18n.js';
import { InfoViewState, renderInfo, renderStatus, StatusViewState } from './ui/statusPresenter.js';
import { createPlayersStage } from './ui/playersStage.js';

const statusButton = document.querySelector('[data-role="status-button"]');
const localeToggleButton = document.querySelector('[data-role="locale-toggle"]');
const startButton = document.querySelector('[data-role="start-button"]');
const stopButton = document.querySelector('[data-role="stop-button"]');
const infoPanel = document.querySelector('[data-role="info-panel"]');
const controlCard = document.querySelector('.control-card');
const mainTitleElement = document.querySelector('[data-role="main-title"]');
const torchSvg = document.querySelector('[data-role="torch"]');
const flame = document.querySelector('[data-role="flame"]');
const minecraftLink = document.querySelector('[data-role="download-minecraft"]');
const javaLink = document.querySelector('[data-role="download-java"]');
const installHelpButton = document.querySelector('[data-role="install-help-button"]');
const installModal = document.querySelector('[data-role="install-modal"]');
const installModalCloseButton = document.querySelector('[data-role="install-modal-close"]');
const installModalOverlay = document.querySelector('[data-role="install-modal-overlay"]');
const installModalTitle = document.querySelector('[data-role="install-modal-title"]');
const installModalBody = document.querySelector('[data-role="install-modal-body"]');
const footerElement = document.querySelector('[data-role="footer"]');

let currentState = ServerLifecycleState.UNKNOWN;
let currentStatusViewState = StatusViewState.UNKNOWN;
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
const defaultButtonLabels = new Map();

let lastInfoMessageDescriptor = null;

initialise();

function initialise() {
  applyLocaleToStaticContent();
  cacheDefaultButtonLabels();
  applyStatusView(currentStatusViewState);
  initialisePlayersStage();
  prepareStatusIndicator();
  prepareInstallationModal();
  prepareLocaleToggle();
  renderInfoMessage({ key: 'info.stream.connecting', state: InfoViewState.PENDING });
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

  if (mainTitleElement) {
    mainTitleElement.textContent = t('ui.title');
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

  if (minecraftLink) {
    minecraftLink.textContent = t('ui.downloads.minecraft');
    minecraftLink.setAttribute('href', 'https://www.minecraft.net/en-us/download');
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

  if (footerElement) {
    footerElement.textContent = t('ui.footer');
  }
}

function prepareLocaleToggle() {
  if (!localeToggleButton) {
    return;
  }

  updateLocaleToggleLabel();

  localeToggleButton.addEventListener('click', () => {
    const locale = getActiveLocale();
    const nextLocale = locale === 'es' ? 'en' : 'es';
    setLocale(nextLocale);
    applyLocaleToStaticContent();
    cacheDefaultButtonLabels();
    refreshBusyButtonLabels();
    applyStatusView(currentStatusViewState);
    refreshInfoMessage();
    updateControlAvailability();
    updateLocaleToggleLabel();
  });
}

function updateLocaleToggleLabel() {
  if (!localeToggleButton) {
    return;
  }

  const locale = getActiveLocale();
  const nextLocale = locale === 'es' ? 'en' : 'es';
  const labelKey = `ui.localeToggle.switchTo.${nextLocale}`;
  const label = t(labelKey);
  const buttonLabelKey = `ui.localeToggle.buttonLabel.${locale}`;
  const buttonLabel = t(buttonLabelKey);
  localeToggleButton.textContent = buttonLabel;
  localeToggleButton.setAttribute('data-locale', locale);
  localeToggleButton.setAttribute('aria-pressed', locale === 'es' ? 'true' : 'false');
  localeToggleButton.setAttribute('aria-label', label);
  localeToggleButton.setAttribute('title', label);
}

function prepareInstallationModal() {
  if (!installModal || !installHelpButton) {
    return;
  }

  if (!installHelpButton.hasAttribute('aria-expanded')) {
    installHelpButton.setAttribute('aria-expanded', 'false');
  }

  installHelpButton.addEventListener('click', openInstallationModal);

  if (installModalCloseButton) {
    installModalCloseButton.addEventListener('click', closeInstallationModal);
  }

  if (installModalOverlay) {
    installModalOverlay.addEventListener('click', closeInstallationModal);
  }

  document.addEventListener('keydown', handleModalKeydown);

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

  if (installHelpButton) {
    installHelpButton.setAttribute('aria-expanded', 'true');
  }

  installModal.removeAttribute('hidden');

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

  if (installHelpButton) {
    installHelpButton.setAttribute('aria-expanded', 'false');
  }

  installModal.classList.remove('modal--visible');
  installModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

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

function cacheDefaultButtonLabels() {
  defaultButtonLabels.set(startButton, startButton.textContent.trim());
  defaultButtonLabels.set(stopButton, stopButton.textContent.trim());
}

function applyStatusView(state) {
  currentStatusViewState = state;
  renderStatus(statusButton, torchSvg, flame, state);
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
    renderInfoMessage({ key: 'info.start.requireOffline', state: InfoViewState.ERROR });
    return;
  }

  await executeControlAction(() => startServer(), {
    pending: 'info.start.pending',
    success: 'info.start.success',
  }, {
    sourceButton: startButton,
    busyLabelKey: 'ui.controls.start.busy',
  });
}

async function handleStopRequest() {
  if (!statusEligible || currentState !== ServerLifecycleState.ONLINE) {
    renderInfoMessage({ key: 'info.stop.requireOnline', state: InfoViewState.ERROR });
    return;
  }

  if (!confirmStopAction()) {
    return;
  }

  await executeControlAction(() => stopServer(), {
    pending: 'info.stop.pending',
    success: 'info.stop.success',
  }, {
    sourceButton: stopButton,
    busyLabelKey: 'ui.controls.stop.busy',
  });
}

async function executeControlAction(action, messageKeys, options = {}) {
  setBusy(true, StatusViewState.PROCESSING);
  renderInfoMessage({ key: messageKeys.pending, state: InfoViewState.PENDING });

  const { sourceButton, busyLabelKey } = options;
  const restoreButtonState = sourceButton
    ? setControlButtonBusy(sourceButton, busyLabelKey)
    : null;

  try {
    await action();
    currentState = ServerLifecycleState.UNKNOWN;
    statusEligible = false;
    applyStatusView(currentState);
    renderInfoMessage({ key: messageKeys.success, state: InfoViewState.SUCCESS });
  } catch (error) {
    currentState = ServerLifecycleState.ERROR;
    statusEligible = false;
    applyStatusView(StatusViewState.ERROR);
    const errorDescriptor = describeError(error);
    renderInfoMessage({ ...errorDescriptor, state: InfoViewState.ERROR });
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
  applyStatusView(viewState);
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
    renderInfoMessage({ key: 'info.stream.unsupported', state: InfoViewState.ERROR });
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
    renderInfoMessage({ key: 'info.stream.connected', state: InfoViewState.SUCCESS });
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
  renderInfoMessage({ key: infoKey, state: infoState });

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
  applyStatusView(state);
  updateControlAvailability();

  const descriptor = resolveLifecycleInfo(state);
  renderInfoMessage(descriptor);
}

function resolveLifecycleInfo(state) {
  if (state === ServerLifecycleState.ONLINE) {
    return { key: 'info.online', state: InfoViewState.SUCCESS };
  }
  if (state === ServerLifecycleState.OFFLINE) {
    return { key: 'info.offline', state: InfoViewState.SUCCESS };
  }
  if (state === ServerLifecycleState.ERROR) {
    return { key: 'info.error', state: InfoViewState.ERROR };
  }
  return { key: 'info.unknown', state: InfoViewState.PENDING };
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
      applyStatusView(StatusViewState.ERROR);
      updateControlAvailability();
      const errorDescriptor = describeError(error);
      renderInfoMessage({ ...errorDescriptor, state: InfoViewState.ERROR });
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
    return { key: 'error.timeout' };
  }

  if (error instanceof HttpError) {
    const descriptionKey = describeHttpStatusKey(error.status);
    if (descriptionKey) {
      return {
        key: 'error.httpWithDescription',
        params: { status: error.status, descriptionKey },
      };
    }
    return { key: 'error.httpGeneric', params: { status: error.status } };
  }

  if (error instanceof TypeError) {
    return { key: 'error.network' };
  }

  return { key: 'error.generic' };
}

function describeHttpStatusKey(status) {
  if (typeof status !== 'number' || Number.isNaN(status) || status <= 0) {
    return '';
  }
  const key = `http.${status}`;
  const translation = t(key);
  return translation === key ? '' : key;
}

function renderInfoMessage(descriptor) {
  const normalised = normaliseInfoDescriptor(descriptor);
  lastInfoMessageDescriptor = normalised;
  const message = resolveInfoText(normalised);
  const state = normalised.state ?? InfoViewState.DEFAULT;
  renderInfo(infoPanel, message, state);
}

function refreshInfoMessage() {
  if (!lastInfoMessageDescriptor) {
    renderInfo(infoPanel, '', InfoViewState.DEFAULT);
    return;
  }

  const message = resolveInfoText(lastInfoMessageDescriptor);
  const state = lastInfoMessageDescriptor.state ?? InfoViewState.DEFAULT;
  renderInfo(infoPanel, message, state);
}

function normaliseInfoDescriptor(descriptor) {
  if (!descriptor) {
    return { text: '', state: InfoViewState.DEFAULT };
  }

  if (typeof descriptor === 'string') {
    return { text: descriptor, state: InfoViewState.DEFAULT };
  }

  const { key, params, text, state = InfoViewState.DEFAULT } = descriptor;

  if (key) {
    return { key, params: params ?? {}, state };
  }

  return { text: typeof text === 'string' ? text : '', state };
}

function resolveInfoText(descriptor) {
  if (descriptor.key) {
    const params = descriptor.params ? { ...descriptor.params } : undefined;
    if (params && params.descriptionKey) {
      params.description = t(params.descriptionKey);
      delete params.descriptionKey;
    }
    return t(descriptor.key, params);
  }

  return typeof descriptor.text === 'string' ? descriptor.text : '';
}

function updateButtonTooltip(button, message) {
  if (message) {
    button.title = message;
  } else {
    button.removeAttribute('title');
  }
}

function setControlButtonBusy(button, busyLabelKey) {
  const key = busyLabelKey ?? 'ui.controls.generic.busy';
  const label = t(key);
  button.dataset.loading = 'true';
  button.dataset.busyLabelKey = key;
  button.setAttribute('aria-busy', 'true');
  button.textContent = label;

  return () => {
    delete button.dataset.loading;
    delete button.dataset.busyLabelKey;
    button.setAttribute('aria-busy', 'false');
    const defaultLabel = defaultButtonLabels.get(button);
    if (defaultLabel) {
      button.textContent = defaultLabel;
      return;
    }
    button.textContent = t('ui.controls.generic.busy');
  };
}

function refreshBusyButtonLabels() {
  const updateLabel = (button) => {
    if (!button || button.dataset.loading !== 'true') {
      return;
    }
    const key = button.dataset.busyLabelKey || 'ui.controls.generic.busy';
    button.textContent = t(key);
  };

  updateLabel(startButton);
  updateLabel(stopButton);
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
