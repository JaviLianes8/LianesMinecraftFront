import { STATUS_MIN_INTERVAL_MS, buildApiUrl } from './config.js';
import { HttpError, TimeoutError } from './httpClient.js';
import {
  fetchServerStatus,
  startServer,
  stopServer,
  ServerLifecycleState,
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
let lastStatusTimestamp = 0;
let busy = false;

const defaultButtonLabels = new Map();

initialise();

function initialise() {
  applyLocaleToStaticContent();
  cacheDefaultButtonLabels();
  renderStatus(statusButton, torchSvg, flame, currentState);
  renderInfo(infoPanel, t('info.initialPrompt'));
  updateControlAvailability();

  statusButton.addEventListener('click', handleStatusRequest);
  startButton.addEventListener('click', handleStartRequest);
  stopButton.addEventListener('click', handleStopRequest);
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

function updateControlAvailability() {
  statusButton.toggleAttribute('disabled', busy);
  statusButton.setAttribute('aria-disabled', busy ? 'true' : 'false');
  updateButtonTooltip(statusButton, busy ? t('info.busy') : null);

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

async function handleStatusRequest() {
  if (busy) {
    return;
  }

  const now = Date.now();
  const elapsed = now - lastStatusTimestamp;
  if (elapsed < STATUS_MIN_INTERVAL_MS) {
    const waitSeconds = Math.ceil((STATUS_MIN_INTERVAL_MS - elapsed) / 1000);
    renderInfo(infoPanel, t('info.wait', { seconds: waitSeconds }));
    return;
  }

  setBusy(true, StatusViewState.CHECKING);
  renderInfo(infoPanel, t('info.checking'), InfoViewState.PENDING);

  try {
    const { state } = await fetchServerStatus();
    currentState = state;
    statusEligible = state === ServerLifecycleState.ONLINE || state === ServerLifecycleState.OFFLINE;
    lastStatusTimestamp = Date.now();

    if (state === ServerLifecycleState.ONLINE) {
      renderInfo(infoPanel, t('info.online'), InfoViewState.SUCCESS);
    } else if (state === ServerLifecycleState.OFFLINE) {
      renderInfo(infoPanel, t('info.offline'), InfoViewState.SUCCESS);
    } else if (state === ServerLifecycleState.ERROR) {
      renderInfo(infoPanel, t('info.error'), InfoViewState.ERROR);
    } else {
      renderInfo(infoPanel, t('info.unknown'));
    }
  } catch (error) {
    currentState = ServerLifecycleState.ERROR;
    statusEligible = false;
    renderInfo(infoPanel, describeError(error), InfoViewState.ERROR);
  } finally {
    setBusy(false);
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
