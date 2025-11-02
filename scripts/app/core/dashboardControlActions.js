import { ServerLifecycleState } from '../../services/serverService.js';
import { InfoViewState, StatusViewState } from '../../ui/statusPresenter.js';
import { describeError } from './errorDescriptor.js';
import { confirmStopAction } from './stopConfirmation.js';

/**
 * Wires DOM events to controller actions.
 *
 * @this {import('./dashboardController.js').DashboardController}
 */
export function attachEventListeners() {
  const { startButton, stopButton } = this.dom;
  startButton?.addEventListener('click', () => this.handleStartRequest());
  stopButton?.addEventListener('click', () => this.handleStopRequest());
}

/**
 * Initiates the start server flow when allowed.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @returns {Promise<void>} Resolves when handling completes.
 */
export async function handleStartRequest() {
  if (!this.canStart) {
    this.infoMessageService.render({ key: 'info.start.requireOffline', state: InfoViewState.ERROR });
    return;
  }
  const succeeded = await this.executeControlAction(async () => this.services.startServer(), {
    pending: 'info.start.pending',
    success: 'info.start.success',
  }, {
    sourceButton: this.dom.startButton,
    busyLabelKey: 'ui.controls.start.busy',
  });
  if (succeeded) {
    this.pendingStartConfirmation = true;
    this.controlPanelPresenter.setStatusBusy(true);
    this.updateControlAvailability();
  }
}

/**
 * Initiates the stop server flow when allowed.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @returns {Promise<void>} Resolves when handling completes.
 */
export async function handleStopRequest() {
  if (!this.canStop) {
    this.infoMessageService.render({ key: 'info.stop.requireOnline', state: InfoViewState.ERROR });
    return;
  }
  if (!confirmStopAction() || (await this.passwordPrompt?.ensureStopAccess?.()) === false) {
    return;
  }
  const succeeded = await this.executeControlAction(async () => this.services.stopServer(), {
    pending: 'info.stop.pending',
    success: 'info.stop.success',
  }, {
    sourceButton: this.dom.stopButton,
    busyLabelKey: 'ui.controls.stop.busy',
  });
  if (succeeded) {
    this.pendingStopConfirmation = true;
    this.controlPanelPresenter.setStatusBusy(true);
    this.updateControlAvailability();
  }
}

/**
 * Executes a control action while keeping the UI in sync.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {() => Promise<void>} action Action to execute.
 * @param {{ pending: string, success: string }} messageKeys Localisation keys.
 * @param {{ sourceButton?: HTMLButtonElement, busyLabelKey?: string }} [options] Presenter hints.
 * @returns {Promise<void>} Resolves when the action flow completes.
 */
export async function executeControlAction(action, messageKeys, options = {}) {
  this.setBusy(true, StatusViewState.PROCESSING);
  this.infoMessageService.render({ key: messageKeys.pending, state: InfoViewState.PENDING });
  const { sourceButton, busyLabelKey } = options;
  const restoreButtonState = sourceButton
    ? this.controlPanelPresenter.setControlButtonBusy(sourceButton, busyLabelKey)
    : () => {};

  let succeeded = false;
  try {
    await action();
    this.currentState = ServerLifecycleState.UNKNOWN;
    this.canStart = false;
    this.canStop = false;
    this.pendingStartConfirmation = false;
    this.pendingStopConfirmation = false;
    this.applyStatusView(this.currentState);
    this.infoMessageService.render({ key: messageKeys.success, state: InfoViewState.SUCCESS });
    succeeded = true;
  } catch (error) {
    this.currentState = ServerLifecycleState.ERROR;
    this.canStart = false;
    this.canStop = false;
    this.pendingStartConfirmation = false;
    this.pendingStopConfirmation = false;
    this.applyStatusView(StatusViewState.ERROR);
    const errorDescriptor = describeError(error);
    this.infoMessageService.render({ ...errorDescriptor, state: InfoViewState.ERROR });
  } finally {
    restoreButtonState();
    this.setBusy(false, this.currentState);
  }
  return succeeded;
}

/**
 * Updates busy state, propagating the view state to presenters.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {boolean} value Busy flag.
 * @param {string} [viewState] View state to apply.
 */
export function setBusy(value, viewState = this.currentState) {
  this.busy = value;
  this.updateControlAvailability(viewState);
  this.applyStatusView(viewState);
  const effectiveBusy = value || this.pendingStartConfirmation || this.pendingStopConfirmation;
  this.controlPanelPresenter.setStatusBusy(effectiveBusy);
}

/**
 * Synchronises the control buttons availability with the current state.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {string} [viewState] View state to evaluate.
 */
export function updateControlAvailability(viewState = this.currentStatusViewState) {
  this.controlPanelPresenter.updateAvailability({
    busy: this.busy,
    lifecycleState: viewState,
    canStart: this.canStart,
    canStop: this.canStop,
    pendingStart: this.pendingStartConfirmation,
    pendingStop: this.pendingStopConfirmation,
  });
}

/**
 * Applies the given view state to the status presenter.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {string} state Status view state.
 */
export function applyStatusView(state) {
  this.currentStatusViewState = state;
  this.controlPanelPresenter.applyStatusView(state);
}
