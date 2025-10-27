import {
  connectToPlayersStream,
  fetchPlayersSnapshot,
  fetchServerStatus,
  startServer,
  stopServer,
  subscribeToServerStatusStream,
} from '../services/serverService.js';
import { translate as t } from '../ui/i18n.js';
import { renderInfo } from '../ui/statusPresenter.js';
import { ControlPanelPresenter } from './control/controlPanelPresenter.js';
import { DashboardController } from './core/dashboardController.js';
import { createDomReferences } from './dom/domReferences.js';
import { createInfoMessageService } from './info/infoMessageService.js';
import { LocaleController } from './locale/localeController.js';
import { InstallationModalController } from './modal/installationModalController.js';
import { createPlayersCoordinator } from './players/playersCoordinator.js';
import { PlayersStageController } from './players/playersStageController.js';
import { createStatusCoordinator } from './status/statusCoordinator.js';

/**
 * Creates a fully wired dashboard controller ready for initialisation.
 *
 * @returns {DashboardController} Configured dashboard controller.
 */
export function createDashboardApp() {
  const dom = createDomReferences();
  const controlPanelPresenter = new ControlPanelPresenter(dom);
  const localeController = new LocaleController(dom);
  const modalController = new InstallationModalController(dom);
  const playersStageController = new PlayersStageController(dom.controlCard);
  const infoMessageService = createInfoMessageService({ infoPanel: dom.infoPanel }, {
    render: renderInfo,
    translate: t,
  });

  const services = { startServer, stopServer };

  const controller = new DashboardController({
    dom,
    controlPanelPresenter,
    localeController,
    modalController,
    infoMessageService,
    playersStageController,
    statusCoordinator: null,
    playersCoordinator: null,
    services,
  });

  const statusCoordinator = createStatusCoordinator(
    {
      subscribeToServerStatusStream,
      fetchServerStatus,
    },
    {
      onStreamOpen: () => controller.handleStatusStreamOpen(),
      onStreamStatus: (payload) => controller.handleStatusUpdate(payload),
      onStreamError: () => controller.handleStatusStreamError(),
      onStreamUnsupported: () => controller.handleStatusStreamUnsupported(),
      onFallbackStart: () => controller.handleStatusFallbackStart(),
      onFallbackStop: () => controller.handleStatusFallbackStop(),
      onSnapshotSuccess: (payload) => controller.handleSnapshotSuccess(payload),
      onSnapshotError: (error) => controller.handleSnapshotError(error),
    },
  );

  const playersCoordinator = createPlayersCoordinator(
    {
      connectToPlayersStream,
      fetchPlayersSnapshot,
    },
    {
      onStreamOpen: () => controller.playersCoordinator?.stopFallbackPolling(),
      onPlayers: (snapshot) => controller.handlePlayersUpdate(snapshot),
      onStreamError: () => controller.handlePlayersStreamError(),
    },
  );

  controller.statusCoordinator = statusCoordinator;
  controller.playersCoordinator = playersCoordinator;

  return controller;
}
