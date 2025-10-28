import { ServerLifecycleState } from '../../services/serverService.js';
import { InfoViewState, StatusViewState } from '../../ui/statusPresenter.js';
import {
  attachEventListeners,
  handleStartRequest,
  handleStopRequest,
  executeControlAction,
  setBusy,
  updateControlAvailability,
  applyStatusView,
} from './dashboardControlActions.js';
import {
  handleStatusStreamOpen,
  handleStatusUpdate,
  handleStatusStreamError,
  handleStatusStreamUnsupported,
  handleStatusFallbackStart,
  handleStatusFallbackStop,
  handleSnapshotSuccess,
  handleSnapshotError,
  applyServerLifecycleState,
} from './dashboardStatusHandlers.js';
import {
  handlePlayersUpdate,
  handlePlayersStreamError,
  cleanup,
} from './dashboardPlayersHandlers.js';

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
    passwordPrompt,
    stateCache,
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
    this.passwordPrompt = passwordPrompt ?? null;
    this.stateCache = stateCache ?? {
      load: () => null,
      saveStatus: () => {},
      savePlayers: () => {},
      clear: () => {},
    };

    this.currentState = ServerLifecycleState.UNKNOWN;
    this.currentStatusViewState = StatusViewState.CHECKING;
    this.statusEligible = this.busy = false;
    this.hasReceivedStatusUpdate = this.streamHasError = false;
  }
  async initialise() {
    this.localeController.applyLocaleToStaticContent();
    this.controlPanelPresenter.cacheDefaultButtonLabels();
    this.playersStageController.initialise();
    const hasCache = this.restoreCachedState();
    if (!hasCache) {
      this.applyStatusView(this.currentStatusViewState);
    }
    this.controlPanelPresenter.prepareStatusIndicator();
    this.modalController.initialise();
    this.localeController.prepareLocaleToggle(() => {
      this.controlPanelPresenter.cacheDefaultButtonLabels();
      this.controlPanelPresenter.refreshBusyButtonLabels();
      this.applyStatusView(this.currentStatusViewState);
      this.infoMessageService.refresh();
      this.updateControlAvailability();
      this.passwordPrompt?.refreshActiveTexts();
    });
    if (!hasCache) {
      this.infoMessageService.render({ key: 'info.initial.loading', state: InfoViewState.PENDING });
    }
    this.updateControlAvailability();
    this.attachEventListeners();

    await this.loadInitialSnapshots();

    this.statusCoordinator.connect();
    this.playersCoordinator.connect();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup(), { once: true });
    }
  }
  /**
   * Retrieves the initial status and players snapshots before enabling live updates.
   *
   * @returns {Promise<void>} Completes once both snapshots have been processed.
   */
  async loadInitialSnapshots() {
    await Promise.all([
      this.statusCoordinator.requestSnapshot(),
      this.playersCoordinator.requestSnapshot(),
    ]);
  }
  /**
   * Attempts to restore the dashboard view using cached data.
   *
   * @returns {boolean} Whether any cached content was applied.
   */
  restoreCachedState() {
    const cached = this.stateCache.load?.();
    if (!cached) {
      return false;
    }

    let hasRestored = false;

    if (cached.status) {
      this.applyServerLifecycleState(cached.status);
      hasRestored = true;
    }

    if ('players' in cached) {
      const players = Array.isArray(cached.players) ? cached.players : [];
      this.playersStageController.update(players);
      hasRestored = true;
    }

    return hasRestored;
  }
}

Object.assign(DashboardController.prototype, {
  attachEventListeners,
  handleStartRequest,
  handleStopRequest,
  executeControlAction,
  setBusy,
  updateControlAvailability,
  applyStatusView,
  handleStatusStreamOpen,
  handleStatusUpdate,
  handleStatusStreamError,
  handleStatusStreamUnsupported,
  handleStatusFallbackStart,
  handleStatusFallbackStop,
  handleSnapshotSuccess,
  handleSnapshotError,
  applyServerLifecycleState,
  handlePlayersUpdate,
  handlePlayersStreamError,
  cleanup,
});

