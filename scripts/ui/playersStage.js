import { createPlayersStage as createPlayersStageFactory } from './playersStage/stageFactory.js';

/**
 * Public entry point that delegates to the stage factory implementation.
 * The wrapper exists to keep the original module path stable for consumers.
 *
 * @param {{ container: HTMLElement | null, initialPlayers?: any[] }} options Stage configuration.
 * @returns {{ updatePlayers: (players?: any[] | null) => void, destroy: () => void }} Stage lifecycle controls.
 */
export function createPlayersStage(options = {}) {
  return createPlayersStageFactory(options);
}
