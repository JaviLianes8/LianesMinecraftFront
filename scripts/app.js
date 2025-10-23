import { STATUS_MIN_INTERVAL_MS } from './config.js';
import { HttpError, TimeoutError } from './httpClient.js';
import {
  fetchServerStatus,
  startServer,
  stopServer,
  ServerLifecycleState,
} from './services/serverService.js';
import { renderInfo, renderStatus, StatusViewState } from './ui/statusPresenter.js';

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

initialise();

function initialise() {
  renderStatus(statusButton, torchSvg, flame, currentState);
  renderInfo(infoPanel, 'Pulsa STATUS para comprobar el servidor.');
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
    renderInfo(infoPanel, `Debes esperar ${waitSeconds}s antes de volver a consultar.`);
    return;
  }

  setBusy(true, StatusViewState.CHECKING);
  renderInfo(infoPanel, 'Consultando estado del servidor...');

  try {
    const { state } = await fetchServerStatus();
    currentState = state;
    statusEligible = state === ServerLifecycleState.ONLINE || state === ServerLifecycleState.OFFLINE;
    lastStatusTimestamp = Date.now();

    if (state === ServerLifecycleState.ONLINE) {
      renderInfo(infoPanel, 'Servidor en línea. Puedes solicitar STOP si lo necesitas.');
    } else if (state === ServerLifecycleState.OFFLINE) {
      renderInfo(infoPanel, 'Servidor detenido. Puedes solicitar START.');
    } else if (state === ServerLifecycleState.ERROR) {
      renderInfo(infoPanel, 'El servidor informó de un error. Revisa los registros.');
    } else {
      renderInfo(infoPanel, 'Estado desconocido. Intenta de nuevo más tarde.');
    }
  } catch (error) {
    currentState = ServerLifecycleState.ERROR;
    statusEligible = false;
    renderInfo(infoPanel, describeError(error));
  } finally {
    setBusy(false);
  }
}

async function handleStartRequest() {
  if (!statusEligible || currentState !== ServerLifecycleState.OFFLINE) {
    renderInfo(infoPanel, 'Debes obtener un estado OFFLINE antes de iniciar.');
    return;
  }

  await executeControlAction(
    () => startServer(),
    'Solicitando el arranque del servidor...',
    'Petición de arranque enviada. Consulta STATUS para confirmarlo.',
  );
}

async function handleStopRequest() {
  if (!statusEligible || currentState !== ServerLifecycleState.ONLINE) {
    renderInfo(infoPanel, 'Debes obtener un estado ONLINE antes de detener.');
    return;
  }

  await executeControlAction(
    () => stopServer(),
    'Solicitando la detención del servidor...',
    'Petición de parada enviada. Consulta STATUS para confirmarlo.',
  );
}

async function executeControlAction(action, pendingMessage, successMessage) {
  setBusy(true);
  renderInfo(infoPanel, pendingMessage);

  try {
    await action();
    currentState = ServerLifecycleState.UNKNOWN;
    statusEligible = false;
    renderStatus(statusButton, torchSvg, flame, currentState);
    renderInfo(infoPanel, successMessage);
  } catch (error) {
    currentState = ServerLifecycleState.ERROR;
    statusEligible = false;
    renderInfo(infoPanel, describeError(error));
  } finally {
    setBusy(false);
  }
}

function setBusy(value, viewState = currentState) {
  busy = value;
  updateControlAvailability();
  renderStatus(statusButton, torchSvg, flame, viewState);
}

function describeError(error) {
  if (error instanceof TimeoutError) {
    return 'Tiempo de espera agotado al contactar con el servidor.';
  }

  if (error instanceof HttpError) {
    return `El servidor respondió con un error (${error.status}).`;
  }

  return 'No se pudo completar la operación. Revisa la conexión.';
}
