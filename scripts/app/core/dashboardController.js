import { ServerLifecycleState } from '../../services/serverService.js';
import { InfoViewState, StatusViewState } from '../../ui/statusPresenter.js';
import { resolveLifecycleInfo } from './lifecycleInfoResolver.js';
import { describeError } from './errorDescriptor.js';
import { confirmStopAction } from './stopConfirmation.js';

/**
 * High-level orchestrator connecting UI presenters with backend services.
 */
export class DashboardController {
  constructor({
    dom,
    controlPanelPresenter,
    localeController,
    modalController,
    infoMessageService,
    playersStageController,
    statusCoordinator,
    playersCoordinator,
    services,
  }) {
    this.dom = dom;
    this.controlPanelPresenter = controlPanelPresenter;
    this.localeController = localeController;
    this.modalController = modalController;
    this.infoMessageService = infoMessageService;
    this.playersStageController = playersStageController;
    this.statusCoordinator = statusCoordinator;
    this.playersCoordinator = playersCoordinator;
    this.services = services;

    this.currentState = ServerLifecycleState.UNKNOWN;
    this.currentStatusViewState = StatusViewState.UNKNOWN;
    this.statusEligible = false;
    this.busy = false;
    this.hasReceivedStatusUpdate = false;
    this.streamHasError = false;
  }

  initialise() {
    this.localeController.applyLocaleToStaticContent();
    this.controlPanelPresenter.cacheDefaultButtonLabels();
    this.applyStatusView(this.currentStatusViewState);
    this.playersStageController.initialise();
    this.controlPanelPresenter.prepareStatusIndicator();
    this.modalController.initialise();
    this.localeController.prepareLocaleToggle(() => {
      this.controlPanelPresenter.cacheDefaultButtonLabels();
      this.controlPanelPresenter.refreshBusyButtonLabels();
      this.applyStatusView(this.currentStatusViewState);
      this.infoMessageService.refresh();
      this.updateControlAvailability();
    });
    this.infoMessageService.render({ key: 'info.stream.connecting', state: InfoViewState.PENDING });
    this.updateControlAvailability();
    this.attachEventListeners();

    this.statusCoordinator.connect();
    this.playersCoordinator.connect();
    this.statusCoordinator.requestSnapshot();
    this.playersCoordinator.requestSnapshot();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup(), { once: true });
    }
  }
  attachEventListeners() {
    const { startButton, stopButton } = this.dom;
    startButton?.addEventListener('click', () => this.handleStartRequest());
    stopButton?.addEventListener('click', () => this.handleStopRequest());
  }
  async handleStartRequest() {
    if (!this.statusEligible || this.currentState !== ServerLifecycleState.OFFLINE) {
      this.infoMessageService.render({ key: 'info.start.requireOffline', state: InfoViewState.ERROR });
      return;
    }

    await this.executeControlAction(async () => this.services.startServer(), {
      pending: 'info.start.pending',
      success: 'info.start.success',
    }, {
      sourceButton: this.dom.startButton,
      busyLabelKey: 'ui.controls.start.busy',
    });
  }
  async handleStopRequest() {
    if (!this.statusEligible || this.currentState !== ServerLifecycleState.ONLINE) {
      this.infoMessageService.render({ key: 'info.stop.requireOnline', state: InfoViewState.ERROR });
      return;
    }
    if (!confirmStopAction()) {
      return;
    }
    await this.executeControlAction(async () => this.services.stopServer(), {
      pending: 'info.stop.pending',
      success: 'info.stop.success',
    }, {
      sourceButton: this.dom.stopButton,
      busyLabelKey: 'ui.controls.stop.busy',
    });
  }
  async executeControlAction(action, messageKeys, options = {}) {
    this.setBusy(true, StatusViewState.PROCESSING);
    this.infoMessageService.render({ key: messageKeys.pending, state: InfoViewState.PENDING });

    const { sourceButton, busyLabelKey } = options;
    const restoreButtonState = sourceButton
      ? this.controlPanelPresenter.setControlButtonBusy(sourceButton, busyLabelKey)
      : () => {};

    try {
      await action();
      this.currentState = ServerLifecycleState.UNKNOWN;
      this.statusEligible = false;
      this.applyStatusView(this.currentState);
      this.infoMessageService.render({ key: messageKeys.success, state: InfoViewState.SUCCESS });
    } catch (error) {
      this.currentState = ServerLifecycleState.ERROR;
      this.statusEligible = false;
      this.applyStatusView(StatusViewState.ERROR);
      const errorDescriptor = describeError(error);
      this.infoMessageService.render({ ...errorDescriptor, state: InfoViewState.ERROR });
    } finally {
      restoreButtonState();
      this.setBusy(false, this.currentState);
    }
  }
  setBusy(value, viewState = this.currentState) {
    this.busy = value;
    this.updateControlAvailability(viewState);
    this.applyStatusView(viewState);
    this.controlPanelPresenter.setStatusBusy(value);
  }
  updateControlAvailability(viewState = this.currentStatusViewState) {
    this.controlPanelPresenter.updateAvailability({
      busy: this.busy,
      statusEligible: this.statusEligible,
      lifecycleState: viewState,
    });
  }
  applyStatusView(state) {
    this.currentStatusViewState = state;
    this.controlPanelPresenter.applyStatusView(state);
  }
  handleStatusStreamOpen() {
    this.streamHasError = false;
    this.controlPanelPresenter.refreshBusyButtonLabels();
    if (!this.hasReceivedStatusUpdate) {
      this.infoMessageService.render({ key: 'info.stream.connected', state: InfoViewState.SUCCESS });
    }
  }
  handleStatusUpdate({ state }) {
    this.streamHasError = false;
    this.applyServerLifecycleState(state);
  }
  handleStatusStreamError() {
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
  handleStatusStreamUnsupported() {
    this.infoMessageService.render({ key: 'info.stream.unsupported', state: InfoViewState.ERROR });
  }
  handleStatusFallbackStart() { this.playersCoordinator.startFallbackPolling(); }
  handleStatusFallbackStop() { this.playersCoordinator.stopFallbackPolling(); }
  handleSnapshotSuccess({ state }) { this.applyServerLifecycleState(state); }
  handleSnapshotError(error) {
    this.currentState = ServerLifecycleState.ERROR;
    this.statusEligible = false;
    this.applyStatusView(StatusViewState.ERROR);
    this.updateControlAvailability(StatusViewState.ERROR);
    const errorDescriptor = describeError(error);
    this.infoMessageService.render({ ...errorDescriptor, state: InfoViewState.ERROR });
  }
  applyServerLifecycleState(state) {
    this.hasReceivedStatusUpdate = true;
    this.currentState = state;
    this.statusEligible =
      state === ServerLifecycleState.ONLINE || state === ServerLifecycleState.OFFLINE;
    this.applyStatusView(state);
    this.updateControlAvailability(state);
    this.infoMessageService.render(resolveLifecycleInfo(state));
  }
  handlePlayersUpdate(snapshot) {
    const players = snapshot && Array.isArray(snapshot.players) ? snapshot.players : [];
    this.playersStageController.update(players);
  }
  handlePlayersStreamError() {
    this.playersCoordinator.startFallbackPolling(); this.playersCoordinator.requestSnapshot();
  }
  cleanup() {
    this.statusCoordinator.cleanup(); this.playersCoordinator.cleanup(); this.playersStageController.destroy();
  }
}
