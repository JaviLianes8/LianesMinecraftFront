/**
 * Keeps the enemy population balanced relative to the active player count.
 */
export class EnemyPopulationBalancer {
  /**
   * @param {{
   *   spawnRules: ReadonlyArray<{ type: string, respawnDelay: number }>,
   *   store: import('./enemyStore.js').EnemyStore,
   *   scheduler: import('./enemyRespawnScheduler.js').EnemyRespawnScheduler,
   *   spawnEnemy: (rule: { type: string }) => void,
   * }} dependencies Injected dependencies.
   */
  constructor({ spawnRules, store, scheduler, spawnEnemy }) {
    this.spawnRules = spawnRules;
    this.store = store;
    this.scheduler = scheduler;
    this.spawnEnemy = spawnEnemy;
  }

  /**
   * Ensures the desired population of each enemy type.
   * @param {number} desired Desired amount per type.
   */
  ensure(desired) {
    if (!Number.isFinite(desired) || desired <= 0) {
      this.removeAll();
      return;
    }

    const normalized = Math.max(0, Math.floor(desired));
    for (const rule of this.spawnRules) {
      this.trimExcess(rule.type, normalized);
      const activeCount = this.store.countByType(rule.type);
      const queuedCount = this.scheduler.count(rule.type);
      const deficit = normalized - (activeCount + queuedCount);
      for (let i = 0; i < deficit; i += 1) {
        this.spawnEnemy(rule);
      }
    }
  }

  /**
   * Clears all enemies and scheduled respawns.
   */
  removeAll() {
    for (const rule of this.spawnRules) {
      const active = this.store.listByType(rule.type);
      for (const enemy of active) {
        this.store.remove(enemy.id);
      }
      this.scheduler.clear(rule.type);
    }
  }

  /**
   * Removes enemies exceeding the desired count for a type.
   * @param {string} type Enemy type identifier.
   * @param {number} desired Desired amount for the type.
   * @private
   */
  trimExcess(type, desired) {
    const active = this.store.listByType(type);
    const excess = active.length - desired;
    if (excess <= 0) {
      if (desired === 0) {
        this.scheduler.clear(type);
      }
      return;
    }
    const toRemove = active.slice(0, excess);
    for (const enemy of toRemove) {
      this.store.remove(enemy.id);
    }
    this.scheduler.clear(type);
  }
}
