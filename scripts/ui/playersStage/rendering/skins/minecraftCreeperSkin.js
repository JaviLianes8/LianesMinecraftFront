import { createPixelPainter } from './pixelPainter.js';

/**
 * Paints a Minecraft-inspired creeper preserving the classic pixel art face.
 */
export function drawMinecraftCreeperSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const light = '#6dc15b';
  const mid = '#4f9a4c';
  const dark = '#2f6b2f';
  const shadow = '#1f4d1f';
  const accent = '#0f2e0f';

  paint(3, 2, 6, 5, light);
  paint(3, 2, 6, 1, mid);
  paint(3, 3, 1, 1, shadow);
  paint(8, 3, 1, 1, shadow);
  paint(4, 4, 2, 1, accent);
  paint(6, 4, 2, 1, accent);
  paint(4, 5, 2, 1, accent);
  paint(6, 5, 2, 1, accent);
  paint(5, 6, 2, 1, dark);

  paint(3, 7, 6, 5, mid);
  paint(3, 7, 6, 1, dark);
  paint(2, 8, 1, 4, shadow);
  paint(9, 8, 1, 4, shadow);
  paint(4, 9, 2, 1, dark);
  paint(6, 9, 2, 1, dark);
  paint(5, 10, 1, 2, shadow);
  paint(6, 10, 1, 2, shadow);

  paint(3, 12, 2, 4, dark);
  paint(5, 12, 2, 4, mid);
  paint(7, 12, 2, 4, dark);
  paint(3, 15, 2, 1, shadow);
  paint(7, 15, 2, 1, shadow);
}
