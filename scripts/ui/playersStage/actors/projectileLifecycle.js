import { clamp } from '../utils/geometry.js';
import { resolveActorCenter } from '../utils/actorMath.js';

const ARROW_SPEED = 420;
const ARROW_LIFETIME = 2.4;
const ARROW_THICKNESS = 2.2;
const ARROW_LENGTH = 16;
const ARROW_HEAD = 4.5;

/**
 * Creates a new arrow projectile travelling from the player to the enemy.
 *
 * @param {{ id: string, from: import('./actorLifecycle.js').Actor, to: import('./enemyLifecycle.js').EnemyActor }} payload Projectile source and target.
 * @returns {{ id: string, x: number, y: number, vx: number, vy: number, rotation: number, ttl: number }} Projectile instance.
 */
export function createArrowProjectile({ id, from, to }) {
  const origin = resolveActorCenter(from);
  const target = resolveActorCenter(to);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    return {
      id,
      x: origin.x,
      y: origin.y,
      vx: 0,
      vy: 0,
      rotation: 0,
      ttl: 0,
    };
  }

  const nx = dx / distance;
  const ny = dy / distance;

  return {
    id,
    x: origin.x,
    y: origin.y,
    vx: nx * ARROW_SPEED,
    vy: ny * ARROW_SPEED,
    rotation: Math.atan2(ny, nx),
    ttl: ARROW_LIFETIME,
  };
}

/**
 * Updates the projectile position, reducing its time-to-live counter.
 *
 * @param {{ x: number, y: number, vx: number, vy: number, ttl: number }} projectile Projectile instance.
 * @param {number} delta Delta time in seconds.
 */
export function stepProjectile(projectile, delta) {
  projectile.x += projectile.vx * delta;
  projectile.y += projectile.vy * delta;
  projectile.ttl -= delta;
}

/**
 * Determines whether the projectile lifetime has elapsed.
 *
 * @param {{ ttl: number }} projectile Projectile instance.
 * @returns {boolean} True when expired.
 */
export function isProjectileExpired(projectile) {
  return projectile.ttl <= 0;
}

/**
 * Determines whether the projectile travelled outside the stage bounds.
 *
 * @param {{ x: number, y: number }} projectile Projectile instance.
 * @param {{ width: number, height: number }} bounds Stage bounds.
 * @returns {boolean} True when outside.
 */
export function isProjectileOutside(projectile, bounds) {
  const margin = 16;
  return (
    projectile.x < -margin ||
    projectile.y < -margin ||
    projectile.x > bounds.width + margin ||
    projectile.y > bounds.height + margin
  );
}

/**
 * Resolves whether the projectile intersects with the provided enemy actor.
 *
 * @param {{ x: number, y: number }} projectile Projectile instance.
 * @param {import('./enemyLifecycle.js').EnemyActor} enemy Enemy actor.
 * @returns {boolean} True when the projectile hit the enemy.
 */
export function didProjectileHitEnemy(projectile, enemy) {
  const enemyCenter = resolveActorCenter(enemy);
  const width = Math.max(12, enemy.scale * 8);
  const height = Math.max(16, enemy.scale * 10);
  const dx = clamp(projectile.x, enemyCenter.x - width / 2, enemyCenter.x + width / 2) - projectile.x;
  const dy = clamp(projectile.y, enemyCenter.y - height / 2, enemyCenter.y + height / 2) - projectile.y;
  return dx * dx + dy * dy < 9;
}

export const arrowVisual = {
  thickness: ARROW_THICKNESS,
  length: ARROW_LENGTH,
  head: ARROW_HEAD,
};
