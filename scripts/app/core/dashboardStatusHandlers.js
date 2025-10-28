import { ServerLifecycleState } from '../../services/serverService.js';
import { InfoViewState, StatusViewState } from '../../ui/statusPresenter.js';
import { resolveLifecycleInfo } from './lifecycleInfoResolver.js';
import { describeError } from './errorDescriptor.js';

/**
 * Handles successful stream connection events.
 *
 * @this {import('./dashboardController.js').DashboardController}
 */
export function handleStatusStreamOpen() {
  this.streamHasError = false;
  this.controlPanelPresenter.refreshBusyButtonLabels();
  if (!this.hasReceivedStatusUpdate) {
    this.infoMessageService.render({ key: 'info.stream.connected', state: InfoViewState.SUCCESS });
  }
}

/**
 * Processes incoming status updates.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {{ state: string }} payload Status payload.
 */
export function handleStatusUpdate({ state }) {
  this.streamHasError = false;
  this.applyServerLifecycleState(state);
}

/**
 * Handles stream errors by notifying the user and requesting snapshots.
 *
 * @this {import('./dashboardController.js').DashboardController}
 */
export function handleStatusStreamError() {
  if (this.streamHasError) {
    return;
  }
  this.streamHasError = true;
  const infoKey = this.hasReceivedStatusUpdate ? 'info.stream.reconnecting' : 'info.stream.error';
  const infoState = this.hasReceivedStatusUpdate ? InfoViewState.PENDING : InfoViewState.ERROR;
  this.infoMessageService.render({ key: infoKey, state: infoState });
  this.statusCoordinator.requestSnapshot();
  this.playersCoordinator.requestSnapshot();
}

/**
 * Handles unsupported stream scenarios.
 *
 * @this {import('./dashboardController.js').DashboardController}
 */
export function handleStatusStreamUnsupported() {
  this.infoMessageService.render({ key: 'info.stream.unsupported', state: InfoViewState.ERROR });
}

/**
 * Activates fallback polling for the players stream.
 *
 * @this {import('./dashboardController.js').DashboardController}
 */
export function handleStatusFallbackStart() {
  this.playersCoordinator.startFallbackPolling();
}

/**
 * Stops fallback polling for the players stream.
 *
 * @this {import('./dashboardController.js').DashboardController}
 */
export function handleStatusFallbackStop() {
  this.playersCoordinator.stopFallbackPolling();
}

/**
 * Handles successful status snapshot retrieval.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {{ state: string }} payload Normalised snapshot payload.
 */
export function handleSnapshotSuccess({ state }) {
  this.applyServerLifecycleState(state);
}

/**
 * Handles snapshot errors by notifying the user.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {Error} error Encountered error.
 */
export function handleSnapshotError(error) {
  this.currentState = ServerLifecycleState.ERROR;
  this.statusEligible = false;
  this.applyStatusView(StatusViewState.ERROR);
  this.updateControlAvailability(StatusViewState.ERROR);
  const errorDescriptor = describeError(error);
  this.infoMessageService.render({ ...errorDescriptor, state: InfoViewState.ERROR });
}

/**
 * Applies the provided server lifecycle state to the UI and cache.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {string} state Server lifecycle state.
 */
export function applyServerLifecycleState(state) {
  this.hasReceivedStatusUpdate = true;
  this.currentState = state;
  this.statusEligible =
    state === ServerLifecycleState.ONLINE || state === ServerLifecycleState.OFFLINE;
  this.applyStatusView(state);
  this.updateControlAvailability(state);
  this.infoMessageService.render(resolveLifecycleInfo(state));
  this.stateCache.saveStatus?.(state);
}
