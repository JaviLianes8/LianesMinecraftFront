import { createPixelPainter } from './pixelPainter.js';

/**
 * Draws the Ezio inspired skin.
 */
export function drawEzioSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const hood = '#f3f4f6';
  const hoodShadow = '#d1d5db';
  const skin = '#f5d0c5';
  const beard = '#4b5563';
  const eye = '#111827';
  const armor = '#9ca3af';
  const armorShadow = '#6b7280';
  const leather = '#7c3f2c';
  const sash = '#b91c1c';
  const sashShadow = '#7f1d1d';
  const belt = '#374151';
  const cloth = '#e5e7eb';
  const boot = '#1f2937';
  const blade = '#cbd5f5';

  paint(3, 0, 6, 1, hoodShadow);
  paint(2, 1, 8, 1, hood);
  paint(2, 2, 1, 4, hoodShadow);
  paint(9, 2, 1, 4, hoodShadow);
  paint(3, 2, 6, 2, hood);
  paint(3, 4, 6, 3, skin);
  paint(4, 5, 1, 1, eye);
  paint(7, 5, 1, 1, eye);
  paint(5, 6, 2, 1, beard);
  paint(4, 6, 1, 1, beard);
  paint(7, 6, 1, 1, beard);
  paint(2, 6, 1, 1, hoodShadow);
  paint(9, 6, 1, 1, hoodShadow);

  paint(1, 7, 1, 4, cloth);
  paint(10, 7, 1, 4, cloth);
  paint(1, 10, 1, 1, armorShadow);
  paint(10, 10, 1, 1, armorShadow);
  paint(1, 11, 1, 1, blade);
  paint(10, 11, 1, 1, leather);
  paint(1, 12, 1, 1, blade);
  paint(1, 13, 1, 1, blade);

  paint(2, 7, 8, 3, armor);
  paint(2, 7, 1, 3, armorShadow);
  paint(9, 7, 1, 3, armorShadow);
  paint(3, 9, 6, 1, armorShadow);
  paint(4, 8, 4, 1, armor);

  paint(2, 10, 8, 1, sash);
  paint(5, 10, 2, 1, sashShadow);
  paint(2, 11, 8, 1, belt);

  paint(2, 12, 2, 1, cloth);
  paint(8, 12, 2, 1, cloth);
  paint(4, 12, 4, 1, leather);
  paint(10, 12, 1, 1, leather);
  paint(4, 13, 4, 1, sash);
  paint(5, 12, 2, 2, sashShadow);
  paint(3, 13, 1, 2, armorShadow);
  paint(8, 13, 1, 2, armorShadow);
  paint(2, 13, 1, 3, cloth);
  paint(9, 13, 1, 3, cloth);

  paint(3, 14, 3, 1, armorShadow);
  paint(6, 14, 3, 1, armorShadow);
  paint(3, 15, 3, 1, boot);
  paint(6, 15, 3, 1, boot);
}
