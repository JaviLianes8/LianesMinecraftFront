import { SPRITE_HEIGHT, SPRITE_WIDTH } from '../constants.js';

/**
 * Resolves the sprite width taking the scale factor into account.
 *
 * @param {{ scale: number }} actor Actor instance with scale.
 * @returns {number} Sprite width in pixels.
 */
export function resolveSpriteWidth(actor) {
  return SPRITE_WIDTH * (actor.scale ?? 1);
}

/**
 * Resolves the sprite height taking the scale factor into account.
 *
 * @param {{ scale: number }} actor Actor instance with scale.
 * @returns {number} Sprite height in pixels.
 */
export function resolveSpriteHeight(actor) {
  return SPRITE_HEIGHT * (actor.scale ?? 1);
}

/**
 * Determines the sprite centre position in canvas coordinates.
 *
 * @param {{ x: number, y: number, scale: number }} actor Actor instance.
 * @returns {{ x: number, y: number }} Centre coordinates.
 */
export function resolveActorCenter(actor) {
  const width = resolveSpriteWidth(actor);
  const height = resolveSpriteHeight(actor);
  return {
    x: actor.x + width / 2,
    y: actor.y + height / 2,
  };
}
