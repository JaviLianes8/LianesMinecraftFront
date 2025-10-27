import { drawDeadpoolSkin } from './deadpoolSkin.js';
import { drawDefaultSkin } from './defaultSkin.js';
import { drawEzioSkin } from './ezioSkin.js';
import { drawGeoOperatorSkin } from './geoOperatorSkin.js';
import { drawLuffySkin } from './luffySkin.js';
import { drawPandaSkin } from './pandaSkin.js';
import { drawPeakyBlindersSkin } from './peakyBlindersSkin.js';

const PLAYER_SKINS = new Map([
  ['lianes8', drawLuffySkin],
  ['pozofer11', drawPandaSkin],
  ['bruyan', drawDeadpoolSkin],
  ['wladymir14', drawPeakyBlindersSkin],
  ['alexethe', drawGeoOperatorSkin],
  ['alexconsta', drawEzioSkin],
]);

/**
 * Resolves the appropriate skin renderer for a given player name.
 *
 * @param {string} name Player name.
 * @returns {(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => void} Skin renderer.
 */
export function resolveSkinRenderer(name) {
  if (typeof name !== 'string') {
    return drawDefaultSkin;
  }

  const key = name.trim().toLowerCase();
  if (!key) {
    return drawDefaultSkin;
  }

  return PLAYER_SKINS.get(key) ?? drawDefaultSkin;
}
