import { drawDeadpoolSkin } from './deadpoolSkin.js';
import { drawDefaultSkin } from './defaultSkin.js';
import { drawEzioSkin } from './ezioSkin.js';
import { drawGeoOperatorSkin } from './geoOperatorSkin.js';
import { drawLuffySkin } from './luffySkin.js';
import { drawPandaSkin } from './pandaSkin.js';
import { drawPeakyBlindersSkin } from './peakyBlindersSkin.js';
import { drawMinecraftSkeletonSkin } from './minecraftSkeletonSkin.js';
import { drawMinecraftZombieSkin } from './minecraftZombieSkin.js';

const PLAYER_SKINS = new Map([
  ['lianes8', drawLuffySkin],
  ['pozofer11', drawPandaSkin],
  ['bruyan', drawDeadpoolSkin],
  ['wladymir14', drawPeakyBlindersSkin],
  ['alexethe', drawGeoOperatorSkin],
  ['alexconsta', drawEzioSkin],
  ['skeleton', drawMinecraftSkeletonSkin],
  ['zombie', drawMinecraftZombieSkin],
]);

const ENEMY_SKINS = new Map([
  ['skeleton', drawMinecraftSkeletonSkin],
  ['zombie', drawMinecraftZombieSkin],
]);

/**
 * Resolves the appropriate skin renderer for a given player name.
 *
 * @param {string} name Player name.
 * @returns {(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => void} Skin renderer.
 */
export function resolvePlayerSkinRenderer(name) {
  if (typeof name !== 'string') {
    return drawDefaultSkin;
  }

  const key = name.trim().toLowerCase();
  if (!key) {
    return drawDefaultSkin;
  }

  return PLAYER_SKINS.get(key) ?? drawDefaultSkin;
}

/**
 * Resolves the appropriate skin renderer for a given enemy variant.
 *
 * @param {string | undefined} variant Enemy variant identifier.
 * @returns {(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => void} Skin renderer.
 */
export function resolveEnemySkinRenderer(variant) {
  if (typeof variant !== 'string') {
    return drawMinecraftZombieSkin;
  }

  const key = variant.trim().toLowerCase();
  if (!key) {
    return drawMinecraftZombieSkin;
  }

  return ENEMY_SKINS.get(key) ?? drawMinecraftZombieSkin;
}
