import { ServerLifecycleState } from '../../services/serverService.js';
import { StatusViewState, InfoViewState } from '../../ui/statusPresenter.js';
import { describeError } from './errorDescriptor.js';

/**
 * Executes a lifecycle control action updating the controller state consistently.
 * @param {DashboardController} controller - Controller orchestrating the dashboard lifecycle.
 * @param {() => Promise<void>} action - Asynchronous action to control the server lifecycle.
 * @param {{ pending: string, success: string }} messageKeys - Translation keys for pending and success messages.
 * @param {{ sourceButton?: HTMLButtonElement, busyLabelKey?: string }} [options] - Optional UI configuration.
 * @returns {Promise<void>} Promise that resolves when the action has completed.
 */
export async function runControlAction(controller, action, messageKeys, options = {}) {
  controller.setBusy(true, StatusViewState.PROCESSING);
  controller.infoMessageService.render({ key: messageKeys.pending, state: InfoViewState.PENDING });

  const { sourceButton, busyLabelKey } = options;
  const restoreButtonState = sourceButton
    ? controller.controlPanelPresenter.setControlButtonBusy(sourceButton, busyLabelKey)
    : () => {};

  try {
    await action();
    controller.currentState = ServerLifecycleState.UNKNOWN;
    controller.statusEligible = false;
    controller.applyStatusView(controller.currentState);
    controller.infoMessageService.render({ key: messageKeys.success, state: InfoViewState.SUCCESS });
  } catch (error) {
    controller.currentState = ServerLifecycleState.ERROR;
    controller.statusEligible = false;
    controller.applyStatusView(StatusViewState.ERROR);
    const errorDescriptor = describeError(error);
    controller.infoMessageService.render({ ...errorDescriptor, state: InfoViewState.ERROR });
  } finally {
    restoreButtonState();
    controller.setBusy(false, controller.currentState);
  }
}
