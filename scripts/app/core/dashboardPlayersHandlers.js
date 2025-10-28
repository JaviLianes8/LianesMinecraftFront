/**
 * Applies players updates to the stage and cache.
 *
 * @this {import('./dashboardController.js').DashboardController}
 * @param {{ players?: Array<unknown> }} snapshot Players payload.
 */
export function handlePlayersUpdate(snapshot) {
  const players = snapshot && Array.isArray(snapshot.players) ? snapshot.players : [];
  this.playersStageController.update(players);
  this.stateCache.savePlayers?.(players);
}

/**
 * Handles players stream errors by starting fallback polling and requesting a snapshot.
 *
 * @this {import('./dashboardController.js').DashboardController}
 */
export function handlePlayersStreamError() {
  this.playersCoordinator.startFallbackPolling();
  this.playersCoordinator.requestSnapshot();
}

/**
 * Cleans up resources on page unload.
 *
 * @this {import('./dashboardController.js').DashboardController}
 */
export function cleanup() {
  this.statusCoordinator.cleanup();
  this.playersCoordinator.cleanup();
  this.playersStageController.destroy();
}
