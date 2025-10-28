import { WAVE_SPEED } from '../constants.js';
import { clamp, randomBetween, resolveMovementBounds, resolveRandomPosition } from '../utils/geometry.js';
import { resolveActorCenter } from '../utils/actorMath.js';

/**
 * Enumerates the supported enemy variants available on the stage.
 */
export const ENEMY_TYPES = {
  SKELETON: 'skeleton',
  ZOMBIE: 'zombie',
};

/**
 * @typedef {import('./actorLifecycle.js').Actor & {
 *   variant: keyof typeof ENEMY_TYPES,
 *   speed: number,
 *   attackRange: number,
 *   attackCooldown: number,
 *   cooldownRemaining: number,
 *   wanderTarget?: { x: number, y: number },
 *   wanderTimer?: number,
 * }} EnemyActor
 */

/**
 * Creates a new enemy actor using the provided spawn rule and canvas size.
 *
 * @param {{
 *   id: string,
 *   name: string,
 *   variant: keyof typeof ENEMY_TYPES,
 *   speed: number,
 *   attackRange: number,
 *   attackCooldown: number,
 * }} rule Enemy spawn configuration.
 * @param {{ width: number, height: number }} size Canvas bounds.
 * @returns {EnemyActor} Instantiated enemy actor.
 */
export function createEnemy(rule, size) {
  const scale = resolveEnemyScale(size.height, rule.variant);
  const movementBounds = resolveMovementBounds(size, scale);
  const position = resolveSpawnPosition(movementBounds);

  return {
    id: rule.id,
    name: rule.name,
    type: 'enemy',
    variant: rule.variant,
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    scale,
    wave: Math.random() * Math.PI * 2,
    nextDirectionChange: 0,
    speed: rule.speed,
    attackRange: rule.attackRange,
    attackCooldown: rule.attackCooldown,
    cooldownRemaining: 0,
  };
}

/**
 * Updates an enemy actor behaviour relative to the available players.
 *
 * @param {EnemyActor} enemy Enemy actor instance.
 * @param {import('./actorLifecycle.js').Actor[]} players Player actors.
 * @param {{ width: number, height: number }} bounds Canvas bounds.
 * @param {number} delta Delta time in seconds.
 * @returns {{ target: import('./actorLifecycle.js').Actor } | null} Attack request when the enemy is close enough.
 */
export function stepEnemy(enemy, players, bounds, delta) {
  const movementBounds = resolveMovementBounds(bounds, enemy.scale);
  enemy.wave += delta * WAVE_SPEED * 0.85;
  enemy.cooldownRemaining = Math.max(0, enemy.cooldownRemaining - delta);

  if (!Array.isArray(players) || players.length === 0) {
    applyWanderBehaviour(enemy, movementBounds, delta);
    clampEnemyToBounds(enemy, movementBounds);
    return null;
  }

  const target = resolveNearestPlayer(enemy, players);
  moveTowardsTarget(enemy, target, delta);
  clampEnemyToBounds(enemy, movementBounds);

  if (enemy.cooldownRemaining > 0) {
    return null;
  }

  const enemyCenter = resolveActorCenter(enemy);
  const targetCenter = resolveActorCenter(target);
  const distance = Math.hypot(targetCenter.x - enemyCenter.x, targetCenter.y - enemyCenter.y);

  if (distance <= enemy.attackRange) {
    enemy.cooldownRemaining = enemy.attackCooldown;
    return { target };
  }

  return null;
}

function applyWanderBehaviour(enemy, movementBounds, delta) {
  if (!enemy.wanderTarget || enemy.wanderTimer === undefined || enemy.wanderTimer <= 0) {
    enemy.wanderTarget = resolveRandomPosition(movementBounds);
    enemy.wanderTimer = randomBetween(2.5, 5.5);
  }

  const { wanderTarget } = enemy;
  const dx = wanderTarget.x - enemy.x;
  const dy = wanderTarget.y - enemy.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 4) {
    enemy.wanderTimer = 0;
    return;
  }

  const speed = enemy.speed * 0.4;
  const step = Math.min(distance, speed * delta);
  if (distance > 0) {
    enemy.x += (dx / distance) * step;
    enemy.y += (dy / distance) * step;
  }
  enemy.wanderTimer -= delta;
}

function moveTowardsTarget(enemy, target, delta) {
  const enemyCenter = resolveActorCenter(enemy);
  const targetCenter = resolveActorCenter(target);
  const dx = targetCenter.x - enemyCenter.x;
  const dy = targetCenter.y - enemyCenter.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return;
  }

  const step = Math.min(distance, enemy.speed * delta);
  enemy.x += (dx / distance) * step;
  enemy.y += (dy / distance) * step;
}

function clampEnemyToBounds(enemy, bounds) {
  enemy.x = clamp(enemy.x, bounds.minX, bounds.maxX);
  enemy.y = clamp(enemy.y, bounds.minY, bounds.maxY);
}

function resolveEnemyScale(height, variant) {
  const base = resolveScale(height);
  if (variant === ENEMY_TYPES.SKELETON) {
    return Math.max(2.8, base - 0.2);
  }
  if (variant === ENEMY_TYPES.ZOMBIE) {
    return Math.min(4.4, base + 0.15);
  }
  return base;
}

function resolveSpawnPosition(bounds) {
  const spawnEdge = Math.random() < 0.5 ? 'horizontal' : 'vertical';
  if (spawnEdge === 'horizontal') {
    const y = Math.random() < 0.5 ? bounds.minY : bounds.maxY;
    return { x: randomBetween(bounds.minX, bounds.maxX), y };
  }
  const x = Math.random() < 0.5 ? bounds.minX : bounds.maxX;
  return { x, y: randomBetween(bounds.minY, bounds.maxY) };
}

function resolveNearestPlayer(enemy, players) {
  let nearest = players[0];
  let shortestDistance = Number.POSITIVE_INFINITY;
  const enemyCenter = resolveActorCenter(enemy);

  for (const player of players) {
    if (player.type !== 'player') {
      continue;
    }
    const playerCenter = resolveActorCenter(player);
    const distance = Math.hypot(playerCenter.x - enemyCenter.x, playerCenter.y - enemyCenter.y);
    if (distance < shortestDistance) {
      nearest = player;
      shortestDistance = distance;
    }
  }

  return nearest;
}

function resolveScale(height) {
  if (!Number.isFinite(height) || height <= 0) {
    return 3.1;
  }
  const reference = Math.max(140, Math.min(height, 480));
  return Math.max(2.6, Math.min(4.6, reference / 78));
}
