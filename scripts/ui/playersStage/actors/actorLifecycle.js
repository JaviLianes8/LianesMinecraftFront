import { WAVE_SPEED } from '../constants.js';
import {
  clamp,
  resolveDirectionInterval,
  resolveMovementBounds,
  resolveRandomPosition,
  resolveRandomVelocity,
  resolveScale,
} from '../utils/geometry.js';

/**
 * @typedef {Object} Actor
 * @property {string} id Unique identifier.
 * @property {string} name Sanitised player name.
 * @property {number} x Horizontal position.
 * @property {number} y Vertical position.
 * @property {number} vx Horizontal velocity.
 * @property {number} vy Vertical velocity.
 * @property {number} scale Render scale.
 * @property {number} wave Idle animation phase.
 * @property {number} nextDirectionChange Countdown to the next random direction change.
 */

/**
 * Creates a new actor using the provided player snapshot and canvas size.
 *
 * @param {{ id: string, name: string }} player Player snapshot.
 * @param {{ width: number, height: number }} size Canvas bounds.
 * @returns {Actor} Instantiated actor.
 */
export function createActor(player, size) {
  const scale = resolveScale(size.height);
  const bounds = resolveMovementBounds(size, scale);
  const position = resolveRandomPosition(bounds);
  const velocity = resolveRandomVelocity();

  return {
    id: player.id,
    name: player.name,
    x: position.x,
    y: position.y,
    vx: velocity.vx,
    vy: velocity.vy,
    scale,
    wave: Math.random() * Math.PI * 2,
    nextDirectionChange: resolveDirectionInterval(),
  };
}

/**
 * Updates an actor position and direction while respecting the movement bounds.
 *
 * @param {Actor} actor Actor instance.
 * @param {{ width: number, height: number }} bounds Canvas bounds.
 * @param {number} delta Delta time in seconds.
 */
export function stepActor(actor, bounds, delta) {
  const movementBounds = resolveMovementBounds(bounds, actor.scale);
  actor.x += actor.vx * delta;
  actor.y += actor.vy * delta;
  actor.wave += delta * WAVE_SPEED;
  actor.nextDirectionChange -= delta;

  if (actor.x < movementBounds.minX) {
    actor.x = movementBounds.minX;
    actor.vx = Math.abs(actor.vx);
    actor.nextDirectionChange = resolveDirectionInterval();
  } else if (actor.x > movementBounds.maxX) {
    actor.x = movementBounds.maxX;
    actor.vx = -Math.abs(actor.vx);
    actor.nextDirectionChange = resolveDirectionInterval();
  }

  if (actor.y < movementBounds.minY) {
    actor.y = movementBounds.minY;
    actor.vy = Math.abs(actor.vy);
    actor.nextDirectionChange = resolveDirectionInterval();
  } else if (actor.y > movementBounds.maxY) {
    actor.y = movementBounds.maxY;
    actor.vy = -Math.abs(actor.vy);
    actor.nextDirectionChange = resolveDirectionInterval();
  }

  if (actor.nextDirectionChange <= 0) {
    const velocity = resolveRandomVelocity();
    actor.vx = velocity.vx;
    actor.vy = velocity.vy;
    actor.nextDirectionChange = resolveDirectionInterval();
  }

  normaliseWavePhase(actor);
}

/**
 * Ensures the wave animation remains within a valid numeric range.
 *
 * @param {Actor} actor Actor instance.
 */
export function normaliseWavePhase(actor) {
  if (!Number.isFinite(actor.wave)) {
    actor.wave = 0;
  }
}

/**
 * Clamps an actor position after container resize events.
 *
 * @param {Actor} actor Actor instance.
 * @param {{ width: number, height: number }} bounds Canvas bounds.
 */
export function clampActorToBounds(actor, bounds) {
  const movementBounds = resolveMovementBounds(bounds, actor.scale);
  actor.x = clamp(actor.x, movementBounds.minX, movementBounds.maxX);
  actor.y = clamp(actor.y, movementBounds.minY, movementBounds.maxY);
}
