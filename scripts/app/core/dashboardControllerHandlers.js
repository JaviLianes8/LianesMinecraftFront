import { ServerLifecycleState } from '../../services/serverService.js';
import { InfoViewState, StatusViewState } from '../../ui/statusPresenter.js';
import { describeError } from './errorDescriptor.js';
import { resolveLifecycleInfo } from './lifecycleInfoResolver.js';

/**
 * Provides lifecycle and data handlers bound to a dashboard controller instance.
 * @param {DashboardController} controller - Dashboard controller to extend.
 * @returns {Record<string, Function>} Map of handler functions ready to assign.
 */
export function createDashboardControllerHandlers(controller) {
  return {
    setBusy(value, viewState = controller.currentState) {
      controller.busy = value;
      controller.updateControlAvailability(viewState);
      controller.applyStatusView(viewState);
      controller.controlPanelPresenter.setStatusBusy(value);
    },
    updateControlAvailability(viewState = controller.currentStatusViewState) {
      controller.controlPanelPresenter.updateAvailability({
        busy: controller.busy,
        statusEligible: controller.statusEligible,
        lifecycleState: viewState,
      });
    },
    applyStatusView(state) {
      controller.currentStatusViewState = state;
      controller.controlPanelPresenter.applyStatusView(state);
    },
    handleStatusStreamOpen() {
      controller.streamHasError = false;
      controller.controlPanelPresenter.refreshBusyButtonLabels();
      if (!controller.hasReceivedStatusUpdate) {
        controller.infoMessageService.render({ key: 'info.stream.connected', state: InfoViewState.SUCCESS });
      }
    },
    handleStatusUpdate({ state }) {
      controller.streamHasError = false;
      controller.applyServerLifecycleState(state);
    },
    handleStatusStreamError() {
      if (controller.streamHasError) {
        return;
      }
      controller.streamHasError = true;
      const infoKey = controller.hasReceivedStatusUpdate ? 'info.stream.reconnecting' : 'info.stream.error';
      const infoState = controller.hasReceivedStatusUpdate ? InfoViewState.PENDING : InfoViewState.ERROR;
      controller.infoMessageService.render({ key: infoKey, state: infoState });
      controller.statusCoordinator.requestSnapshot();
      controller.playersCoordinator.requestSnapshot();
    },
    handleStatusStreamUnsupported() {
      controller.infoMessageService.render({ key: 'info.stream.unsupported', state: InfoViewState.ERROR });
    },
    handleStatusFallbackStart() {
      controller.playersCoordinator.startFallbackPolling();
    },
    handleStatusFallbackStop() {
      controller.playersCoordinator.stopFallbackPolling();
    },
    handleSnapshotSuccess({ state }) {
      controller.applyServerLifecycleState(state);
    },
    handleSnapshotError(error) {
      controller.currentState = ServerLifecycleState.ERROR;
      controller.statusEligible = false;
      controller.applyStatusView(StatusViewState.ERROR);
      controller.updateControlAvailability(StatusViewState.ERROR);
      const errorDescriptor = describeError(error);
      controller.infoMessageService.render({ ...errorDescriptor, state: InfoViewState.ERROR });
    },
    applyServerLifecycleState(state) {
      controller.hasReceivedStatusUpdate = true;
      controller.currentState = state;
      controller.statusEligible =
        state === ServerLifecycleState.ONLINE || state === ServerLifecycleState.OFFLINE;
      controller.applyStatusView(state);
      controller.updateControlAvailability(state);
      controller.infoMessageService.render(resolveLifecycleInfo(state));
    },
    handlePlayersUpdate(snapshot) {
      const players = snapshot && Array.isArray(snapshot.players) ? snapshot.players : [];
      controller.playersStageController.update(players);
    },
    handlePlayersStreamError() {
      controller.playersCoordinator.startFallbackPolling();
      controller.playersCoordinator.requestSnapshot();
    },
    cleanup() {
      controller.statusCoordinator.cleanup();
      controller.playersCoordinator.cleanup();
      controller.playersStageController.destroy();
    },
  };
}
