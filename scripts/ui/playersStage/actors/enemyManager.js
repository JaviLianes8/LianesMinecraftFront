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
        displayName: 'Skeleton',
        speed: 36,
        attackRange: 110,
        attackCooldown: 3.4,
        respawnDelay: 6.5,
      },
      {
        type: ENEMY_TYPES.ZOMBIE,
        displayName: 'Zombie',
        speed: 24,
        attackRange: 95,
        attackCooldown: 2.6,
        respawnDelay: 5.2,
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
    this.handleRespawns(delta);
    this.ensurePopulation();

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
   * Ensures at least one instance for every configured enemy type is present.
   */
  ensurePopulation() {
    if (!this.bounds || this.bounds.width === 0 || this.bounds.height === 0) {
      return;
    }

    for (const rule of this.spawnRules) {
      const activeCount = this.countActive(rule.type);
      const queued = this.respawnQueues.get(rule.type)?.length ?? 0;
      if (activeCount + queued > 0) {
        continue;
      }
      this.spawnEnemy(rule);
    }
  }

  /** @private */
  handleRespawns(delta) {
    for (const [type, queue] of this.respawnQueues.entries()) {
      if (!queue.length) {
        continue;
      }
      queue.forEach((item) => {
        item.delay -= delta;
      });
      const ready = queue.filter((item) => item.delay <= 0);
      const pending = queue.filter((item) => item.delay > 0);
      this.respawnQueues.set(type, pending);
      if (ready.length > 0) {
        const rule = this.spawnRules.find((entry) => entry.type === type);
        if (rule) {
          this.spawnEnemy(rule);
        }
      }
    }
  }

  /** @private */
  spawnEnemy(rule) {
    const enemy = createEnemy(
      {
        id: `${rule.type}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
        name: rule.displayName,
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
}
