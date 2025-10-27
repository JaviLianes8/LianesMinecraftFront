import { createPlayersStage } from '../../ui/playersStage/stageFactory.js';

/**
 * Handles lifecycle of the players stage UI widget.
 */
export class PlayersStageController {
  /**
   * @param {HTMLElement} container Card element holding the players stage.
   */
  constructor(container) {
    this.container = container;
    this.stage = null;
  }

  /**
   * Initialises the stage if the container is available.
   */
  initialise() {
    if (this.stage || !this.container) {
      return;
    }
    this.stage = createPlayersStage({ container: this.container });
  }

  /**
   * Updates the rendered players list.
   *
   * @param {Array<unknown>} players List of players.
   */
  update(players) {
    if (!this.stage) {
      return;
    }
    this.stage.updatePlayers(players);
  }

  /**
   * Destroys the stage, releasing any internal resources.
   */
  destroy() {
    if (this.stage && typeof this.stage.destroy === 'function') {
      this.stage.destroy();
    }
    this.stage = null;
  }
}
