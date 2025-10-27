import { ServerLifecycleState } from '../../services/serverService.js';
import { InfoViewState, StatusViewState } from '../../ui/statusPresenter.js';
import { confirmStopAction } from './stopConfirmation.js';
import { runControlAction } from './controlActionRunner.js';
import { requestPasswordAuthorisation } from './passwordPromptFlow.js';
import { createDashboardControllerHandlers } from './dashboardControllerHandlers.js';

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

    Object.assign(this, createDashboardControllerHandlers(this));
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

    await runControlAction(this, async () => this.services.startServer(), {
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

    await runControlAction(this, async () => this.services.stopServer(), {
      pending: 'info.stop.pending',
      success: 'info.stop.success',
    }, {
      sourceButton: this.dom.stopButton,
      busyLabelKey: 'ui.controls.stop.busy',
    });
  }

  async requestStartupAccess() {
    const outcome = await requestPasswordAuthorisation({
      verifyPassword: this.services.verifyStartupPassword,
      promptKeys: { initial: 'auth.start.prompt', retry: 'auth.start.retry' },
      invalidMessageKey: 'auth.start.invalid',
      loggerContext: 'startup password',
    });

    return outcome === 'granted' || outcome === 'skipped';
  }

  async requestShutdownAuthorisation() {
    const outcome = await requestPasswordAuthorisation({
      verifyPassword: this.services.verifyShutdownPassword,
      promptKeys: { initial: 'auth.stop.prompt', retry: 'auth.stop.retry' },
      invalidMessageKey: 'auth.stop.invalid',
      loggerContext: 'shutdown password',
    });

    if (outcome === 'skipped') {
      return 'granted';
    }

    return outcome;
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
}
