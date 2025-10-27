import { createPixelPainter } from './pixelPainter.js';

/**
 * Draws the Luffy inspired skin.
 */
export function drawLuffySkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const hatStraw = '#f9d976';
  const hatBand = '#e11d48';
  const skin = '#f2c09f';
  const shorts = '#2563eb';
  const vest = '#f97316';
  const sandals = '#7c2d12';
  const hair = '#111827';

  paint(2, 0, 8, 2, hatStraw);
  paint(2, 2, 8, 1, hatBand);
  paint(3, 3, 6, 1, hatStraw);
  paint(3, 4, 6, 4, skin);
  paint(3, 4, 6, 1, hair);
  paint(3, 6, 1, 1, hair);
  paint(8, 6, 1, 1, hair);
  paint(4, 6, 1, 1, '#111827');
  paint(7, 6, 1, 1, '#111827');
  paint(2, 8, 8, 4, vest);
  paint(2, 10, 1, 2, skin);
  paint(9, 10, 1, 2, skin);
  paint(3, 12, 3, 4, shorts);
  paint(6, 12, 3, 4, shorts);
  paint(3, 15, 3, 1, sandals);
  paint(6, 15, 3, 1, sandals);
}
