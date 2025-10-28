import { ENEMY_TYPES } from './enemyLifecycle.js';

/**
 * Default spawn configuration applied to ambient enemies.
 * @type {ReadonlyArray<{ type: string, speed: number, attackRange: number, attackCooldown: number, respawnDelay: number }>}
 */
export const DEFAULT_ENEMY_SPAWN_RULES = Object.freeze([
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
]);
