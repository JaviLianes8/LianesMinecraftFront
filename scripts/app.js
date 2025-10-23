import { STATUS_MIN_INTERVAL_MS } from './config.js';
import { HttpError, TimeoutError } from './httpClient.js';
import {
  fetchServerStatus,
  startServer,
  stopServer,
  ServerLifecycleState,
} from './services/serverService.js';
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

const defaultButtonLabels = new Map([
  [startButton, startButton.textContent.trim()],
  [stopButton, stopButton.textContent.trim()],
]);

initialise();

function initialise() {
  renderStatus(statusButton, torchSvg, flame, currentState);
  renderInfo(infoPanel, 'Press STATUS to check the server.');
  updateControlAvailability();

  statusButton.addEventListener('click', handleStatusRequest);
  startButton.addEventListener('click', handleStartRequest);
  stopButton.addEventListener('click', handleStopRequest);
}

function updateControlAvailability() {
  statusButton.toggleAttribute('disabled', busy);
  statusButton.setAttribute('aria-disabled', busy ? 'true' : 'false');

  const startDisabled = busy || !statusEligible || currentState !== ServerLifecycleState.OFFLINE;
  startButton.toggleAttribute('disabled', startDisabled);
  startButton.setAttribute('aria-disabled', startDisabled ? 'true' : 'false');

  const stopDisabled = busy || !statusEligible || currentState !== ServerLifecycleState.ONLINE;
  stopButton.toggleAttribute('disabled', stopDisabled);
  stopButton.setAttribute('aria-disabled', stopDisabled ? 'true' : 'false');
}

async function handleStatusRequest() {
  if (busy) {
    return;
  }

  const now = Date.now();
  const elapsed = now - lastStatusTimestamp;
  if (elapsed < STATUS_MIN_INTERVAL_MS) {
    const waitSeconds = Math.ceil((STATUS_MIN_INTERVAL_MS - elapsed) / 1000);
    renderInfo(infoPanel, `You must wait ${waitSeconds}s before requesting STATUS again.`);
    return;
  }

  setBusy(true, StatusViewState.CHECKING);
  renderInfo(infoPanel, 'Checking server status...', InfoViewState.PENDING);

  try {
    const { state } = await fetchServerStatus();
    currentState = state;
    statusEligible = state === ServerLifecycleState.ONLINE || state === ServerLifecycleState.OFFLINE;
    lastStatusTimestamp = Date.now();

    if (state === ServerLifecycleState.ONLINE) {
      renderInfo(
        infoPanel,
        'Server is online. You can request STOP if needed.',
        InfoViewState.SUCCESS,
      );
    } else if (state === ServerLifecycleState.OFFLINE) {
      renderInfo(
        infoPanel,
        'Server is offline. You can request START.',
        InfoViewState.SUCCESS,
      );
    } else if (state === ServerLifecycleState.ERROR) {
      renderInfo(
        infoPanel,
        'The server reported an error. Review the logs.',
        InfoViewState.ERROR,
      );
    } else {
      renderInfo(infoPanel, 'Status is unknown. Try again later.');
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
    renderInfo(infoPanel, 'You must obtain an OFFLINE status before starting.', InfoViewState.ERROR);
    return;
  }

  await executeControlAction(
    () => startServer(),
    'Requesting server startup...',
    'Startup request sent. Check STATUS to confirm.',
    {
      sourceButton: startButton,
      busyLabel: 'Starting...',
    },
  );
}

async function handleStopRequest() {
  if (!statusEligible || currentState !== ServerLifecycleState.ONLINE) {
    renderInfo(infoPanel, 'You must obtain an ONLINE status before stopping.', InfoViewState.ERROR);
    return;
  }

  await executeControlAction(
    () => stopServer(),
    'Requesting server shutdown...',
    'Shutdown request sent. Check STATUS to confirm.',
    {
      sourceButton: stopButton,
      busyLabel: 'Stopping...',
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
    return 'Timed out while contacting the server.';
  }

  if (error instanceof HttpError) {
    return `The server responded with an error (${error.status}).`;
  }

  return 'The operation could not be completed. Check the connection.';
}

function setControlButtonBusy(button, customLabel) {
  const label = customLabel ?? 'Working...';
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
