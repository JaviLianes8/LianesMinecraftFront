import { createPixelPainter } from './pixelPainter.js';

/**
 * Draws the Deadpool inspired skin.
 */
export function drawDeadpoolSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const suitRed = '#991b1b';
  const suitShadow = '#7f1d1d';
  const black = '#111827';
  const eyeWhite = '#f9fafb';
  const belt = '#facc15';

  paint(3, 2, 6, 5, suitRed);
  paint(3, 2, 1, 5, suitShadow);
  paint(8, 2, 1, 5, suitShadow);
  paint(4, 3, 2, 2, black);
  paint(6, 3, 2, 2, black);
  paint(4, 4, 1, 1, eyeWhite);
  paint(7, 4, 1, 1, eyeWhite);
  paint(2, 7, 8, 5, suitRed);
  paint(1, 7, 1, 5, suitShadow);
  paint(10, 7, 1, 5, suitShadow);
  paint(2, 10, 1, 2, suitShadow);
  paint(9, 10, 1, 2, suitShadow);
  paint(2, 11, 8, 1, black);
  paint(5, 11, 2, 1, belt);
  paint(3, 12, 3, 4, suitRed);
  paint(6, 12, 3, 4, suitRed);
  paint(3, 15, 3, 1, black);
  paint(6, 15, 3, 1, black);
}
