/**
 * Stores and retrieves enemy actors by identifier and type.
 */
export class EnemyStore {
  constructor() {
    /** @type {Map<string, import('./enemyLifecycle.js').EnemyActor>} */
    this.items = new Map();
  }

  /**
   * Registers an enemy instance.
   * @param {import('./enemyLifecycle.js').EnemyActor} enemy Enemy to store.
   */
  add(enemy) {
    this.items.set(enemy.id, enemy);
  }

  /**
   * Removes an enemy by identifier.
   * @param {string} id Enemy identifier.
   * @returns {import('./enemyLifecycle.js').EnemyActor | null} Removed enemy.
   */
  remove(id) {
    const enemy = this.items.get(id) ?? null;
    if (enemy) {
      this.items.delete(id);
    }
    return enemy;
  }

  /**
   * Lists all stored enemies.
   * @returns {import('./enemyLifecycle.js').EnemyActor[]} Enemy collection.
   */
  list() {
    return Array.from(this.items.values());
  }

  /**
   * Counts how many enemies of the provided type are stored.
   * @param {string} type Enemy type identifier.
   * @returns {number} Active count.
   */
  countByType(type) {
    let count = 0;
    for (const enemy of this.items.values()) {
      if (enemy.variant === type) {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Lists all enemies matching the provided type.
   * @param {string} type Enemy type identifier.
   * @returns {import('./enemyLifecycle.js').EnemyActor[]} Matching enemies.
   */
  listByType(type) {
    const matches = [];
    for (const enemy of this.items.values()) {
      if (enemy.variant === type) {
        matches.push(enemy);
      }
    }
    return matches;
  }

  /**
   * Finds the first enemy that satisfies the predicate.
   * @param {(enemy: import('./enemyLifecycle.js').EnemyActor) => boolean} predicate Predicate to test.
   * @returns {import('./enemyLifecycle.js').EnemyActor | null} Matching enemy.
   */
  find(predicate) {
    for (const enemy of this.items.values()) {
      if (predicate(enemy)) {
        return enemy;
      }
    }
    return null;
  }
}
