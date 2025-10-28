import { createPixelPainter } from './pixelPainter.js';

/**
 * Paints a Minecraft-inspired skeleton using pixel-perfect rectangles.
 */
export function drawMinecraftSkeletonSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const bone = '#d7d7d7';
  const shadow = '#bfbfbf';
  const dark = '#6f6f6f';

  paint(3, 2, 6, 5, bone);
  paint(3, 2, 6, 1, shadow);
  paint(3, 4, 2, 1, dark);
  paint(7, 4, 2, 1, dark);
  paint(4, 6, 4, 1, dark);

  paint(4, 7, 4, 4, bone);
  paint(3, 8, 1, 3, shadow);
  paint(8, 8, 1, 3, shadow);
  paint(4, 11, 1, 2, bone);
  paint(7, 11, 1, 2, bone);

  paint(2, 7, 1, 5, bone);
  paint(1, 7, 1, 5, shadow);
  paint(9, 7, 1, 5, bone);
  paint(10, 7, 1, 5, shadow);

  paint(3, 12, 2, 4, bone);
  paint(5, 12, 2, 1, shadow);
  paint(7, 12, 2, 4, bone);
  paint(7, 12, 2, 1, shadow);

  paint(3, 15, 2, 1, dark);
  paint(7, 15, 2, 1, dark);
}
