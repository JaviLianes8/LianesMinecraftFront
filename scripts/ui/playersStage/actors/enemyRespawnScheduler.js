/**
 * Manages delayed respawn queues per enemy type.
 */
export class EnemyRespawnScheduler {
  constructor() {
    /** @type {Map<string, Array<{ delay: number }>>} */
    this.queues = new Map();
  }

  /**
   * Schedules a respawn for the provided enemy type.
   * @param {string} type Enemy type identifier.
   * @param {number} delay Seconds to wait before spawning.
   */
  enqueue(type, delay) {
    const queue = this.queues.get(type) ?? [];
    queue.push({ delay });
    this.queues.set(type, queue);
  }

  /**
   * Returns how many enemies of the provided type are queued for respawn.
   * @param {string} type Enemy type identifier.
   * @returns {number} Amount queued.
   */
  count(type) {
    return this.queues.get(type)?.length ?? 0;
  }

  /**
   * Removes all scheduled respawns for the provided type.
   * @param {string} type Enemy type identifier.
   */
  clear(type) {
    this.queues.set(type, []);
  }

  /**
   * Advances all queues and spawns enemies whose timers expired.
   * @param {{
   *   delta: number,
   *   desiredCount: number,
   *   countActive: (type: string) => number,
   *   spawn: (type: string) => void,
   * }} payload Processing payload.
   */
  process({ delta, desiredCount, countActive, spawn }) {
    for (const [type, queue] of this.queues.entries()) {
      if (!queue.length) {
        continue;
      }
      const remaining = [];
      for (const item of queue) {
        const nextDelay = item.delay - delta;
        const shouldSpawn = nextDelay <= 0 && countActive(type) < desiredCount;
        if (shouldSpawn) {
          spawn(type);
          continue;
        }
        remaining.push({ delay: Math.max(nextDelay, 0) });
      }
      this.queues.set(type, remaining);
    }
  }
}
