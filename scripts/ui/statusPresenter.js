import { ServerLifecycleState } from '../services/serverService.js';

/**
 * Enumerates the visual states supported by the status button.
 * @readonly
 * @enum {string}
 */
export const StatusViewState = Object.freeze({
  ...ServerLifecycleState,
  CHECKING: 'CHECKING',
});

const STATUS_LABELS = {
  [StatusViewState.UNKNOWN]: 'UNKNOWN',
  [StatusViewState.ONLINE]: 'ONLINE',
  [StatusViewState.OFFLINE]: 'OFFLINE',
  [StatusViewState.ERROR]: 'ERROR',
  [StatusViewState.CHECKING]: 'CHECKING...',
};

const STATUS_CLASSES = {
  [StatusViewState.UNKNOWN]: 'status-undefined',
  [StatusViewState.ONLINE]: 'status-online',
  [StatusViewState.OFFLINE]: 'status-offline',
  [StatusViewState.ERROR]: 'status-error',
  [StatusViewState.CHECKING]: 'status-checking',
};

/**
 * Applies the visual representation of the current server status to the button and torch.
 *
 * @param {HTMLButtonElement} button Element that displays the textual status.
 * @param {SVGElement} torch Torch graphic used as visual indicator.
 * @param {SVGGElement} flame Flame graphic nested in the torch SVG.
 * @param {string} state Current status view state.
 */
export function renderStatus(button, torch, flame, state) {
  const label = STATUS_LABELS[state] ?? STATUS_LABELS[StatusViewState.UNKNOWN];
  button.textContent = `STATUS: ${label}`;

  button.classList.remove(...Object.values(STATUS_CLASSES));
  button.classList.add(STATUS_CLASSES[state] ?? STATUS_CLASSES[StatusViewState.UNKNOWN]);

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

