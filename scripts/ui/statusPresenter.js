import { ServerLifecycleState } from '../services/serverService.js';

const STATUS_LABELS = {
  [ServerLifecycleState.UNKNOWN]: 'UNKNOWN',
  [ServerLifecycleState.ONLINE]: 'ONLINE',
  [ServerLifecycleState.OFFLINE]: 'OFFLINE',
  [ServerLifecycleState.ERROR]: 'ERROR',
};

const STATUS_CLASSES = {
  [ServerLifecycleState.UNKNOWN]: 'status-undefined',
  [ServerLifecycleState.ONLINE]: 'status-online',
  [ServerLifecycleState.OFFLINE]: 'status-offline',
  [ServerLifecycleState.ERROR]: 'status-error',
};

/**
 * Applies the visual representation of the current server status to the button and torch.
 *
 * @param {HTMLButtonElement} button Element that displays the textual status.
 * @param {SVGElement} torch Torch graphic used as visual indicator.
 * @param {SVGGElement} flame Flame graphic nested in the torch SVG.
 * @param {string} state Current lifecycle state.
 */
export function renderStatus(button, torch, flame, state) {
  const label = STATUS_LABELS[state] ?? STATUS_LABELS[ServerLifecycleState.UNKNOWN];
  button.textContent = `STATUS: ${label}`;

  button.classList.remove(...Object.values(STATUS_CLASSES));
  button.classList.add(STATUS_CLASSES[state] ?? STATUS_CLASSES[ServerLifecycleState.UNKNOWN]);

  const isOnline = state === ServerLifecycleState.ONLINE;
  torch.classList.toggle('torch-on', isOnline);
  flame.classList.toggle('flame-on', isOnline);
}

/**
 * Displays contextual feedback messages for the operator.
 *
 * @param {HTMLElement} container Element that holds the feedback text.
 * @param {string} message Message to be rendered.
 */
export function renderInfo(container, message) {
  container.textContent = message;
}

