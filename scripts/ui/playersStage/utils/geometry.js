import {
  BOUNDS_PADDING,
  MAX_DIRECTION_INTERVAL,
  MAX_SPEED,
  MIN_DIRECTION_INTERVAL,
  MIN_SPEED,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
} from '../constants.js';

/**
 * Clamps a numeric value within the provided range.
 *
 * @param {number} value Candidate value.
 * @param {number} min Minimum accepted value.
 * @param {number} max Maximum accepted value.
 * @returns {number} Clamped value.
 */
export function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/**
 * Resolves a scale factor based on the container height.
 *
 * @param {number} height Height of the canvas container.
 * @returns {number} Sprite scale factor.
 */
export function resolveScale(height) {
  if (!Number.isFinite(height) || height <= 0) {
    return 3;
  }
  const reference = Math.max(120, Math.min(height, 420));
  return Math.max(2.6, Math.min(4.2, reference / 80));
}

/**
 * Generates a random number between two limits, inclusive of the minimum.
 *
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @returns {number} Randomised value.
 */
export function randomBetween(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }
  if (max <= min) {
    return min;
  }
  return min + Math.random() * (max - min);
}

/**
 * Computes the movement bounds for an actor given the canvas size and scale.
 *
 * @param {{ width: number, height: number }} size Canvas dimensions.
 * @param {number} scale Actor scale.
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number }}
 */
export function resolveMovementBounds(size, scale) {
  const minX = BOUNDS_PADDING;
  const maxX = Math.max(minX, size.width - SPRITE_WIDTH * scale - BOUNDS_PADDING);
  const minY = Math.max(BOUNDS_PADDING * 0.5, size.height * 0.35);
  const maxY = Math.max(minY, size.height - SPRITE_HEIGHT * scale - BOUNDS_PADDING * 0.4);
  return { minX, maxX, minY, maxY };
}

/**
 * Resolves a random position within the provided bounds.
 *
 * @param {{ minX: number, maxX: number, minY: number, maxY: number }} bounds Movement bounds.
 * @returns {{ x: number, y: number }} Randomised coordinates.
 */
export function resolveRandomPosition(bounds) {
  return {
    x: randomBetween(bounds.minX, bounds.maxX),
    y: randomBetween(bounds.minY, bounds.maxY),
  };
}

/**
 * Resolves a random velocity vector that respects the configured speed range.
 *
 * @returns {{ vx: number, vy: number }} Velocity vector.
 */
export function resolveRandomVelocity() {
  const speed = randomBetween(MIN_SPEED, MAX_SPEED);
  const angle = Math.random() * Math.PI * 2;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

/**
 * Resolves the interval until the next actor direction change.
 *
 * @returns {number} Interval in seconds.
 */
export function resolveDirectionInterval() {
  return randomBetween(MIN_DIRECTION_INTERVAL, MAX_DIRECTION_INTERVAL);
}
