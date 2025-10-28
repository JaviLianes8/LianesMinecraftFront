import { createEnemy, stepEnemy } from './enemyLifecycle.js';
import { DEFAULT_ENEMY_SPAWN_RULES } from './enemySpawnRules.js';
import { EnemyPopulationBalancer } from './enemyPopulationBalancer.js';
import { EnemyRespawnScheduler } from './enemyRespawnScheduler.js';
import { EnemyStore } from './enemyStore.js';

/**
 * Manages the lifecycle and respawn timings for ambient enemy actors.
 */
export class EnemyManager {
  /**
   * @param {{ bounds: { width: number, height: number } }} options Stage bounds.
   */
  constructor({ bounds }) {
    this.bounds = bounds;
    this.store = new EnemyStore();
    this.respawnScheduler = new EnemyRespawnScheduler();
    this.spawnRules = DEFAULT_ENEMY_SPAWN_RULES;
    this.populationBalancer = new EnemyPopulationBalancer({
      spawnRules: this.spawnRules,
      store: this.store,
      scheduler: this.respawnScheduler,
      spawnEnemy: (rule) => {
        this.spawnEnemy(rule);
      },
    });
  }

  /**
   * Updates the stage bounds after container resize events.
   *
   * @param {{ width: number, height: number }} bounds Stage bounds.
   */
  setBounds(bounds) {
    this.bounds = bounds;
  }

  /**
   * Steps the enemy population ensuring respawn timers and attack callbacks run.
   *
   * @param {{
   *   delta: number,
   *   players: import('./actorLifecycle.js').Actor[],
   *   onAttack: (payload: { enemy: import('./enemyLifecycle.js').EnemyActor, player: import('./actorLifecycle.js').Actor }) => void,
   * }} payload Frame update payload.
   */
  update({ delta, players, onAttack }) {
    if (!this.hasValidBounds()) {
      return;
    }

    const playerCount = Array.isArray(players) ? players.length : 0;
    const desired = this.resolveDesiredCount(playerCount);

    this.processRespawns(delta, desired);
    this.populationBalancer.ensure(desired);

    for (const enemy of this.store.list()) {
      const attack = stepEnemy(enemy, players, this.bounds, delta);
      if (attack && typeof onAttack === 'function') {
        onAttack({ enemy, player: attack.target });
      }
    }
  }

  /**
   * Provides the current active enemy list.
   *
   * @returns {import('./enemyLifecycle.js').EnemyActor[]} Enemy collection.
   */
  getEnemies() {
    return this.store.list();
  }

  /**
   * Removes an enemy from the stage and schedules a future respawn for its type.
   *
   * @param {string} id Enemy identifier.
   */
  handleDefeat(id) {
    const enemy = this.store.remove(id);
    if (!enemy) {
      return;
    }
    const rule = this.resolveRule(enemy.variant);
    if (!rule) {
      return;
    }
    this.respawnScheduler.enqueue(rule.type, rule.respawnDelay);
  }

  /**
   * Finds an enemy intersecting with the provided predicate.
   *
   * @param {(enemy: import('./enemyLifecycle.js').EnemyActor) => boolean} predicate Intersection test.
   * @returns {import('./enemyLifecycle.js').EnemyActor | null} Matching enemy.
   */
  findEnemy(predicate) {
    return this.store.find(predicate);
  }

  /**
   * Adjusts the population to maintain one enemy of each type per active player.
   *
   * @param {number} playerCount Total number of active players.
   */
  ensurePopulation(playerCount = 0) {
    if (!this.hasValidBounds()) {
      return;
    }
    const desired = this.resolveDesiredCount(playerCount);
    this.populationBalancer.ensure(desired);
  }

  /**
   * Processes respawn queues while respecting the desired population cap.
   *
   * @param {number} delta Delta time in seconds.
   * @param {number} desired Desired amount per enemy type.
   * @private
   */
  processRespawns(delta, desired) {
    this.respawnScheduler.process({
      delta,
      desiredCount: desired,
      countActive: (type) => this.store.countByType(type),
      spawn: (type) => {
        const rule = this.resolveRule(type);
        if (rule) {
          this.spawnEnemy(rule);
        }
      },
    });
  }

  /** @private */
  spawnEnemy(rule) {
    const enemy = createEnemy(
      {
        id: `${rule.type}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
        variant: rule.type,
        speed: rule.speed,
        attackRange: rule.attackRange,
        attackCooldown: rule.attackCooldown,
      },
      this.bounds,
    );
    this.store.add(enemy);
    return enemy;
  }

  /** @private */
  resolveRule(type) {
    return this.spawnRules.find((entry) => entry.type === type) ?? null;
  }

  /** @private */
  hasValidBounds() {
    return Boolean(this.bounds && this.bounds.width > 0 && this.bounds.height > 0);
  }

  /** @private */
  resolveDesiredCount(playerCount) {
    if (!Number.isFinite(playerCount) || playerCount <= 0) {
      return 0;
    }
    return Math.max(0, Math.floor(playerCount));
  }
}
