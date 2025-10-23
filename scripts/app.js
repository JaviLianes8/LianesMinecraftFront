import { buildApiUrl } from './config.js';
import { HttpError, TimeoutError } from './httpClient.js';
import {
  fetchServerStatus,
  startServer,
  stopServer,
  ServerLifecycleState,
  subscribeToServerStatusStream,
} from './services/serverService.js';
import { getActiveLocale, translate as t } from './ui/i18n.js';
import { InfoViewState, renderInfo, renderStatus, StatusViewState } from './ui/statusPresenter.js';

const statusButton = document.querySelector('[data-role="status-button"]');
const startButton = document.querySelector('[data-role="start-button"]');
const stopButton = document.querySelector('[data-role="stop-button"]');
const infoPanel = document.querySelector('[data-role="info-panel"]');
const torchSvg = document.querySelector('[data-role="torch"]');
const flame = document.querySelector('[data-role="flame"]');

let currentState = ServerLifecycleState.UNKNOWN;
let statusEligible = false;
let busy = false;
let statusStreamSubscription = null;
let hasReceivedStatusUpdate = false;
let streamHasError = false;
let statusSnapshotPromise = null;
let fallbackPollingId = null;

const STATUS_FALLBACK_INTERVAL_MS = 30000;

const defaultButtonLabels = new Map();

initialise();

function initialise() {
  applyLocaleToStaticContent();
  cacheDefaultButtonLabels();
  renderStatus(statusButton, torchSvg, flame, currentState);
  prepareStatusIndicator();
  renderInfo(infoPanel, t('info.stream.connecting'), InfoViewState.PENDING);
  updateControlAvailability();

  startButton.addEventListener('click', handleStartRequest);
  stopButton.addEventListener('click', handleStopRequest);

  connectToStatusStream();
  requestStatusSnapshot();

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanupStatusStream, { once: true });
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

function handleStreamOpen() {
  streamHasError = false;
  if (!hasReceivedStatusUpdate) {
    renderInfo(infoPanel, t('info.stream.connected'), InfoViewState.SUCCESS);
  }
}

function handleStreamStatusUpdate({ state }) {
  streamHasError = false;
  applyServerLifecycleState(state);
}

function handleStreamError() {
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
}

function cleanupStatusStream() {
  if (statusStreamSubscription && typeof statusStreamSubscription.close === 'function') {
    statusStreamSubscription.close();
  }
  statusStreamSubscription = null;
  stopFallbackPolling();
}

function startFallbackPolling() {
  stopFallbackPolling();
  fallbackPollingId = setInterval(() => {
    requestStatusSnapshot();
  }, STATUS_FALLBACK_INTERVAL_MS);
}

function stopFallbackPolling() {
  if (fallbackPollingId) {
    clearInterval(fallbackPollingId);
    fallbackPollingId = null;
  }
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
