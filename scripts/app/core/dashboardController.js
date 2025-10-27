import { ServerLifecycleState } from '../../services/serverService.js';
import { translate as t } from '../../ui/i18n.js';
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

  async initialise() {
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
    this.updateControlAvailability();
    this.attachEventListeners();

    const requiresStartupPassword = typeof this.services.verifyStartupPassword === 'function';
    if (requiresStartupPassword) {
      this.infoMessageService.render({ key: 'info.auth.start.enterPassword', state: InfoViewState.PENDING });
      const hasAccess = await this.requestStartupAccess();
      if (!hasAccess) {
        this.handleStartupDenied();
        return;
      }
    }

    this.infoMessageService.render({ key: 'info.stream.connecting', state: InfoViewState.PENDING });

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

    const shutdownAuthResult = await this.requestShutdownAuthorisation();
    if (shutdownAuthResult !== 'granted') {
      const infoKey = shutdownAuthResult === 'cancelled'
        ? 'info.auth.stop.cancelled'
        : 'info.auth.stop.error';
      this.infoMessageService.render({ key: infoKey, state: InfoViewState.ERROR });
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

  async requestStartupAccess() {
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
      return true;
    }

    const { verifyStartupPassword } = this.services;
    if (typeof verifyStartupPassword !== 'function') {
      return true;
    }

    let attempts = 0;
    while (true) {
      const promptKey = attempts === 0 ? 'auth.start.prompt' : 'auth.start.retry';
      const input = window.prompt(t(promptKey), '');
      if (input === null) {
        return false;
      }

      const candidate = input.trim();
      if (!candidate) {
        if (typeof window.alert === 'function') {
          window.alert(t('auth.error.empty'));
        }
        attempts += 1;
        continue;
      }

      try {
        const verified = await verifyStartupPassword(candidate);
        if (verified) {
          return true;
        }
        if (typeof window.alert === 'function') {
          window.alert(t('auth.start.invalid'));
        }
      } catch (error) {
        console.error('Unable to verify startup password', error);
        if (typeof window.alert === 'function') {
          window.alert(t('auth.error.unavailable'));
        }
        return false;
      }

      attempts += 1;
    }
  }

  async requestShutdownAuthorisation() {
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
      return 'granted';
    }

    const { verifyShutdownPassword } = this.services;
    if (typeof verifyShutdownPassword !== 'function') {
      return 'granted';
    }

    let attempts = 0;
    while (true) {
      const promptKey = attempts === 0 ? 'auth.stop.prompt' : 'auth.stop.retry';
      const input = window.prompt(t(promptKey), '');
      if (input === null) {
        return 'cancelled';
      }

      const candidate = input.trim();
      if (!candidate) {
        if (typeof window.alert === 'function') {
          window.alert(t('auth.error.empty'));
        }
        attempts += 1;
        continue;
      }

      try {
        const verified = await verifyShutdownPassword(candidate);
        if (verified) {
          return 'granted';
        }
        if (typeof window.alert === 'function') {
          window.alert(t('auth.stop.invalid'));
        }
      } catch (error) {
        console.error('Unable to verify shutdown password', error);
        if (typeof window.alert === 'function') {
          window.alert(t('auth.error.unavailable'));
        }
        return 'error';
      }

      attempts += 1;
    }
  }

  handleStartupDenied() {
    this.busy = true;
    this.statusEligible = false;
    this.applyStatusView(StatusViewState.UNKNOWN);
    this.controlPanelPresenter.updateAvailability({
      busy: true,
      statusEligible: false,
      lifecycleState: StatusViewState.UNKNOWN,
    });
    this.infoMessageService.render({ key: 'info.auth.start.denied', state: InfoViewState.ERROR });
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
