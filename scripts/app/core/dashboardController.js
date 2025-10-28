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

DashboardController.prototype.attachEventListeners = attachEventListeners;
DashboardController.prototype.handleStartRequest = handleStartRequest;
DashboardController.prototype.handleStopRequest = handleStopRequest;
DashboardController.prototype.executeControlAction = executeControlAction;
DashboardController.prototype.setBusy = setBusy;
DashboardController.prototype.updateControlAvailability = updateControlAvailability;
DashboardController.prototype.applyStatusView = applyStatusView;
DashboardController.prototype.handleStatusStreamOpen = handleStatusStreamOpen;
DashboardController.prototype.handleStatusUpdate = handleStatusUpdate;
DashboardController.prototype.handleStatusStreamError = handleStatusStreamError;
DashboardController.prototype.handleStatusStreamUnsupported = handleStatusStreamUnsupported;
DashboardController.prototype.handleStatusFallbackStart = handleStatusFallbackStart;
DashboardController.prototype.handleStatusFallbackStop = handleStatusFallbackStop;
DashboardController.prototype.handleSnapshotSuccess = handleSnapshotSuccess;
DashboardController.prototype.handleSnapshotError = handleSnapshotError;
DashboardController.prototype.applyServerLifecycleState = applyServerLifecycleState;
DashboardController.prototype.handlePlayersUpdate = handlePlayersUpdate;
DashboardController.prototype.handlePlayersStreamError = handlePlayersStreamError;
DashboardController.prototype.cleanup = cleanup;

/**
 * Wires DOM events to controller actions.
 *
 * @this {DashboardController}
 */
function attachEventListeners() {
  const { startButton, stopButton } = this.dom;
  startButton?.addEventListener('click', () => this.handleStartRequest());
  stopButton?.addEventListener('click', () => this.handleStopRequest());
}

/**
 * Initiates the start server flow when allowed.
 *
 * @this {DashboardController}
 * @returns {Promise<void>} Resolves when handling completes.
 */
async function handleStartRequest() {
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

/**
 * Initiates the stop server flow when allowed.
 *
 * @this {DashboardController}
 * @returns {Promise<void>} Resolves when handling completes.
 */
async function handleStopRequest() {
  if (!this.statusEligible || this.currentState !== ServerLifecycleState.ONLINE) {
    this.infoMessageService.render({ key: 'info.stop.requireOnline', state: InfoViewState.ERROR });
    return;
  }
  if (!confirmStopAction() || (await this.passwordPrompt?.ensureStopAccess?.()) === false) {
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

/**
 * Executes a control action while keeping the UI in sync.
 *
 * @this {DashboardController}
 * @param {() => Promise<void>} action Action to execute.
 * @param {{ pending: string, success: string }} messageKeys Localisation keys.
 * @param {{ sourceButton?: HTMLButtonElement, busyLabelKey?: string }} [options] Presenter hints.
 * @returns {Promise<void>} Resolves when the action flow completes.
 */
async function executeControlAction(action, messageKeys, options = {}) {
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

/**
 * Updates busy state, propagating the view state to presenters.
 *
 * @this {DashboardController}
 * @param {boolean} value Busy flag.
 * @param {string} [viewState] View state to apply.
 */
function setBusy(value, viewState = this.currentState) {
  this.busy = value;
  this.updateControlAvailability(viewState);
  this.applyStatusView(viewState);
  this.controlPanelPresenter.setStatusBusy(value);
}

/**
 * Synchronises the control buttons availability with the current state.
 *
 * @this {DashboardController}
 * @param {string} [viewState] View state to evaluate.
 */
function updateControlAvailability(viewState = this.currentStatusViewState) {
  this.controlPanelPresenter.updateAvailability({
    busy: this.busy,
    statusEligible: this.statusEligible,
    lifecycleState: viewState,
  });
}

/**
 * Applies the given view state to the status presenter.
 *
 * @this {DashboardController}
 * @param {string} state Status view state.
 */
function applyStatusView(state) {
  this.currentStatusViewState = state;
  this.controlPanelPresenter.applyStatusView(state);
}

/**
 * Handles successful stream connection events.
 *
 * @this {DashboardController}
 */
function handleStatusStreamOpen() {
  this.streamHasError = false;
  this.controlPanelPresenter.refreshBusyButtonLabels();
  if (!this.hasReceivedStatusUpdate) {
    this.infoMessageService.render({ key: 'info.stream.connected', state: InfoViewState.SUCCESS });
  }
}

/**
 * Processes incoming status updates.
 *
 * @this {DashboardController}
 * @param {{ state: string }} payload Status payload.
 */
function handleStatusUpdate({ state }) {
  this.streamHasError = false;
  this.applyServerLifecycleState(state);
}

/**
 * Handles stream errors by notifying the user and requesting snapshots.
 *
 * @this {DashboardController}
 */
function handleStatusStreamError() {
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
 * @this {DashboardController}
 */
function handleStatusStreamUnsupported() {
  this.infoMessageService.render({ key: 'info.stream.unsupported', state: InfoViewState.ERROR });
}

/**
 * Activates fallback polling for the players stream.
 *
 * @this {DashboardController}
 */
function handleStatusFallbackStart() {
  this.playersCoordinator.startFallbackPolling();
}

/**
 * Stops fallback polling for the players stream.
 *
 * @this {DashboardController}
 */
function handleStatusFallbackStop() {
  this.playersCoordinator.stopFallbackPolling();
}

/**
 * Handles successful status snapshot retrieval.
 *
 * @this {DashboardController}
 * @param {{ state: string }} payload Normalised snapshot payload.
 */
function handleSnapshotSuccess({ state }) {
  this.applyServerLifecycleState(state);
}

/**
 * Handles snapshot errors by notifying the user.
 *
 * @this {DashboardController}
 * @param {Error} error Encountered error.
 */
function handleSnapshotError(error) {
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
 * @this {DashboardController}
 * @param {string} state Server lifecycle state.
 */
function applyServerLifecycleState(state) {
  this.hasReceivedStatusUpdate = true;
  this.currentState = state;
  this.statusEligible =
    state === ServerLifecycleState.ONLINE || state === ServerLifecycleState.OFFLINE;
  this.applyStatusView(state);
  this.updateControlAvailability(state);
  this.infoMessageService.render(resolveLifecycleInfo(state));
  this.stateCache.saveStatus?.(state);
}

/**
 * Applies players updates to the stage and cache.
 *
 * @this {DashboardController}
 * @param {{ players?: Array<unknown> }} snapshot Players payload.
 */
function handlePlayersUpdate(snapshot) {
  const players = snapshot && Array.isArray(snapshot.players) ? snapshot.players : [];
  this.playersStageController.update(players);
  this.stateCache.savePlayers?.(players);
}

/**
 * Handles players stream errors by starting fallback polling and requesting a snapshot.
 *
 * @this {DashboardController}
 */
function handlePlayersStreamError() {
  this.playersCoordinator.startFallbackPolling();
  this.playersCoordinator.requestSnapshot();
}

/**
 * Cleans up resources on page unload.
 *
 * @this {DashboardController}
 */
function cleanup() {
  this.statusCoordinator.cleanup();
  this.playersCoordinator.cleanup();
  this.playersStageController.destroy();
}

