import { createPixelPainter } from './pixelPainter.js';

/**
 * Draws the Peaky Blinders inspired skin.
 */
export function drawPeakyBlindersSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const capDark = '#1f2933';
  const capLight = '#374151';
  const skin = '#f5d0c5';
  const hair = '#111827';
  const coat = '#111827';
  const coatHighlight = '#1f2937';
  const vest = '#4b5563';
  const shirt = '#e5e7eb';
  const tie = '#9ca3af';
  const trousers = '#1f2933';
  const shoes = '#0f172a';
  const cigarette = '#f8fafc';
  const ember = '#f97316';
  const smokeLight = 'rgba(226, 232, 240, 0.8)';
  const smokeDim = 'rgba(148, 163, 184, 0.6)';
  const moustache = '#b45309';

  paint(2, 0, 8, 1, capDark);
  paint(1, 1, 10, 1, capDark);
  paint(2, 2, 8, 1, capLight);
  paint(2, 3, 8, 1, capDark);

  paint(3, 4, 6, 4, skin);
  paint(3, 4, 6, 1, hair);
  paint(3, 6, 1, 1, hair);
  paint(8, 6, 1, 1, hair);
  paint(4, 6, 1, 1, hair);
  paint(7, 6, 1, 1, hair);
  paint(5, 7, 2, 1, moustache);

  paint(4, 8, 1, 1, hair);
  paint(7, 8, 1, 1, hair);
  paint(8, 7, 1, 1, cigarette);
  paint(9, 7, 1, 1, ember);
  paint(10, 6, 1, 1, smokeLight);
  paint(11, 5, 1, 1, smokeDim);

  paint(2, 8, 8, 2, vest);
  paint(2, 9, 1, 2, coat);
  paint(9, 9, 1, 2, coat);
  paint(3, 10, 6, 1, shirt);
  paint(5, 10, 2, 1, tie);
  paint(2, 11, 8, 1, coatHighlight);

  paint(2, 12, 3, 4, coat);
  paint(7, 12, 3, 4, coat);
  paint(3, 12, 3, 4, trousers);
  paint(6, 12, 3, 4, trousers);
  paint(3, 15, 3, 1, shoes);
  paint(6, 15, 3, 1, shoes);
}
