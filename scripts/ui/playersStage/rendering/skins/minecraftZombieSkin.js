import { createPixelPainter } from './pixelPainter.js';

/**
 * Paints a Minecraft-inspired zombie with vibrant colours.
 */
export function drawMinecraftZombieSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const skin = '#8ebf5c';
  const shadow = '#6b9442';
  const shirt = '#2b7a96';
  const shirtShadow = '#225f73';
  const pants = '#3a3b7c';
  const shoes = '#1f203f';

  paint(3, 2, 6, 5, skin);
  paint(3, 2, 6, 1, shadow);
  paint(3, 4, 1, 1, '#0f1f0f');
  paint(8, 4, 1, 1, '#0f1f0f');
  paint(4, 6, 4, 1, shadow);

  paint(3, 7, 6, 5, shirt);
  paint(3, 7, 6, 1, shirtShadow);
  paint(2, 8, 1, 4, shirtShadow);
  paint(9, 8, 1, 4, shirtShadow);
  paint(4, 11, 2, 2, skin);
  paint(6, 11, 2, 2, skin);

  paint(3, 12, 3, 4, pants);
  paint(6, 12, 3, 4, pants);
  paint(3, 15, 3, 1, shoes);
  paint(6, 15, 3, 1, shoes);
}
