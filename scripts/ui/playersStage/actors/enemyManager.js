import { ENEMY_TYPES, createEnemy, stepEnemy } from './enemyLifecycle.js';

/**
 * Manages the lifecycle and respawn timings for ambient enemy actors.
 */
export class EnemyManager {
  /**
   * @param {{ bounds: { width: number, height: number } }} options Stage bounds.
   */
  constructor({ bounds }) {
    this.bounds = bounds;
    /** @type {Map<string, import('./enemyLifecycle.js').EnemyActor>} */
    this.enemies = new Map();
    /** @type {Map<string, Array<{ delay: number }>>} */
    this.respawnQueues = new Map();
    this.spawnRules = [
      {
        type: ENEMY_TYPES.SKELETON,
        speed: 36,
        attackRange: 110,
        attackCooldown: 3.4,
        respawnDelay: 6.5,
      },
      {
        type: ENEMY_TYPES.ZOMBIE,
        speed: 24,
        attackRange: 95,
        attackCooldown: 2.6,
        respawnDelay: 5.2,
      },
      {
        type: ENEMY_TYPES.CREEPER,
        speed: 30,
        attackRange: 88,
        attackCooldown: 3.8,
        respawnDelay: 7.1,
      },
    ];
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
    const playerCount = Array.isArray(players) ? players.length : 0;

    this.handleRespawns(delta, playerCount);
    this.ensurePopulation(playerCount);

    for (const enemy of this.enemies.values()) {
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
    return Array.from(this.enemies.values());
  }

  /**
   * Removes an enemy from the stage and schedules a future respawn for its type.
   *
   * @param {string} id Enemy identifier.
   */
  handleDefeat(id) {
    const enemy = this.enemies.get(id);
    if (!enemy) {
      return;
    }
    this.enemies.delete(id);
    const rule = this.spawnRules.find((item) => item.type === enemy.variant);
    if (!rule) {
      return;
    }
    const queue = this.respawnQueues.get(rule.type) ?? [];
    queue.push({ delay: rule.respawnDelay });
    this.respawnQueues.set(rule.type, queue);
  }

  /**
   * Finds an enemy intersecting with the provided predicate.
   *
   * @param {(enemy: import('./enemyLifecycle.js').EnemyActor) => boolean} predicate Intersection test.
   * @returns {import('./enemyLifecycle.js').EnemyActor | null} Matching enemy.
   */
  findEnemy(predicate) {
    for (const enemy of this.enemies.values()) {
      if (predicate(enemy)) {
        return enemy;
      }
    }
    return null;
  }

  /**
   * Adjusts the population to maintain one enemy of each type per active player.
   *
   * @param {number} playerCount Total number of active players.
   */
  ensurePopulation(playerCount = 0) {
    if (!this.bounds || this.bounds.width === 0 || this.bounds.height === 0) {
      return;
    }

    const desired = this.resolveDesiredCount(playerCount);

    for (const rule of this.spawnRules) {
      this.trimExcess(rule.type, desired);

      const activeCount = this.countActive(rule.type);
      const queued = this.respawnQueues.get(rule.type)?.length ?? 0;
      const deficit = desired - (activeCount + queued);
      if (deficit <= 0) {
        continue;
      }
      for (let i = 0; i < deficit; i += 1) {
        this.spawnEnemy(rule);
      }
    }
  }

  /**
   * Processes respawn queues while respecting the desired population cap.
   *
   * @param {number} delta Delta time in seconds.
   * @param {number} playerCount Total number of active players.
   * @private
   */
  handleRespawns(delta, playerCount) {
    const desired = this.resolveDesiredCount(playerCount);

    for (const [type, queue] of this.respawnQueues.entries()) {
      if (!queue.length) {
        continue;
      }
      const remaining = [];
      for (const item of queue) {
        const nextDelay = item.delay - delta;
        const canSpawn = nextDelay <= 0 && this.countActive(type) < desired;
        if (canSpawn) {
          const rule = this.spawnRules.find((entry) => entry.type === type);
          if (rule) {
            this.spawnEnemy(rule);
          }
          continue;
        }
        remaining.push({ delay: Math.max(nextDelay, 0) });
      }
      this.respawnQueues.set(type, remaining);
    }
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
    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  /** @private */
  countActive(type) {
    let count = 0;
    for (const enemy of this.enemies.values()) {
      if (enemy.variant === type) {
        count += 1;
      }
    }
    return count;
  }

  /** @private */
  trimExcess(type, desired) {
    const active = [];
    for (const enemy of this.enemies.values()) {
      if (enemy.variant === type) {
        active.push(enemy);
      }
    }

    const excess = active.length - desired;
    if (excess <= 0) {
      if (desired === 0) {
        this.respawnQueues.set(type, []);
      }
      return;
    }

    const toRemove = active.slice(0, excess);
    for (const enemy of toRemove) {
      this.enemies.delete(enemy.id);
    }
    this.respawnQueues.set(type, []);
  }

  /** @private */
  resolveDesiredCount(playerCount) {
    if (!Number.isFinite(playerCount) || playerCount <= 0) {
      return 0;
    }
    return Math.max(0, Math.floor(playerCount));
  }
}
