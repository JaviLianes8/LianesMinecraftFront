import { createPixelPainter } from './pixelPainter.js';

/**
 * Renders the default skin used when no specific player skin is matched.
 */
export function drawDefaultSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const primary = '#2f855a';
  const secondary = '#276749';
  const skin = '#f5cfa2';
  const shoes = '#1f2933';
  const hair = '#3f2a14';

  paint(3, 12, 3, 4, secondary);
  paint(6, 12, 3, 4, secondary);
  paint(3, 15, 3, 1, shoes);
  paint(6, 15, 3, 1, shoes);
  paint(2, 7, 8, 5, primary);
  paint(1, 7, 1, 5, secondary);
  paint(10, 7, 1, 5, secondary);
  paint(3, 2, 6, 5, skin);
  paint(3, 2, 6, 2, hair);
  paint(3, 4, 1, 1, hair);
  paint(8, 4, 1, 1, hair);
  paint(4, 4, 1, 1, '#111827');
  paint(7, 4, 1, 1, '#111827');
}
