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
 * @param {{ state?: string, canStart?: boolean, canStop?: boolean }} snapshot Status snapshot.
 */
export function handleStatusUpdate(snapshot) {
  this.streamHasError = false;
  this.applyServerStatusSnapshot(snapshot);
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
 * @param {{ state?: string, canStart?: boolean, canStop?: boolean }} snapshot Normalised snapshot payload.
 */
export function handleSnapshotSuccess(snapshot) {
  this.applyServerStatusSnapshot(snapshot);
}

/**
 * Handles snapshot errors by notifying the user.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {Error} error Encountered error.
 */
export function handleSnapshotError(error) {
  this.currentState = ServerLifecycleState.ERROR;
  this.canStart = false;
  this.canStop = false;
  this.pendingStartConfirmation = false;
  this.pendingStopConfirmation = false;
  this.applyStatusView(StatusViewState.ERROR);
  this.updateControlAvailability(StatusViewState.ERROR);
  this.controlPanelPresenter.setStatusBusy(false);
  const errorDescriptor = describeError(error);
  this.infoMessageService.render({ ...errorDescriptor, state: InfoViewState.ERROR });
}

/**
 * Applies the provided server status snapshot to the UI and cache.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {{ state?: string, canStart?: boolean, canStop?: boolean } | string | null | undefined} snapshot
 * Server status snapshot or lifecycle state.
 */
export function applyServerStatusSnapshot(snapshot) {
  this.hasReceivedStatusUpdate = true;

  const isObject = snapshot && typeof snapshot === 'object';
  const resolvedState = isObject && typeof snapshot.state === 'string'
    ? snapshot.state
    : typeof snapshot === 'string'
      ? snapshot
      : ServerLifecycleState.UNKNOWN;

  const canStart = Boolean(isObject && snapshot.canStart === true);
  const canStop = Boolean(isObject && snapshot.canStop === true);

  if (!isObject) {
    this.pendingStartConfirmation = false;
    this.pendingStopConfirmation = false;
  } else {
    if (this.pendingStartConfirmation && (canStop || canStart)) {
      this.pendingStartConfirmation = false;
    }
    if (this.pendingStopConfirmation && canStart) {
      this.pendingStopConfirmation = false;
    }
  }

  this.currentState = resolvedState;
  this.canStart = canStart;
  this.canStop = canStop;

  this.applyStatusView(resolvedState);
  this.updateControlAvailability(resolvedState);
  this.controlPanelPresenter.setStatusBusy(
    this.busy || this.pendingStartConfirmation || this.pendingStopConfirmation,
  );
  this.infoMessageService.render(resolveLifecycleInfo(resolvedState));
  this.stateCache.saveStatus?.(resolvedState);
}
