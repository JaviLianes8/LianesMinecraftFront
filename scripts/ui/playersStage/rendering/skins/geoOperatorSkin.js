import { createPixelPainter } from './pixelPainter.js';

/**
 * Draws the Geo Operator inspired skin.
 */
export function drawGeoOperatorSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const helmet = '#1f2a37';
  const helmetHighlight = '#3f4c5a';
  const visor = '#1f2937';
  const visorReflection = '#6b7280';
  const skin = '#d2a679';
  const skinShadow = '#b8875a';
  const balaclava = '#111827';
  const earPiece = '#9ca3af';
  const vestPrimary = '#2f3e46';
  const vestShadow = '#1d2b33';
  const vestHighlight = '#475861';
  const flagRed = '#b91c1c';
  const flagYellow = '#facc15';
  const undersuit = '#1a242f';
  const undersuitHighlight = '#223140';
  const belt = '#111827';
  const holster = '#0f172a';
  const glove = '#0b1120';
  const gloveHighlight = '#1f2937';
  const boot = '#0b1120';
  const bootHighlight = '#1f2937';

  paint(3, 0, 6, 1, helmet);
  paint(2, 1, 8, 1, helmet);
  paint(2, 2, 8, 1, helmet);
  paint(3, 3, 6, 1, helmet);
  paint(4, 0, 1, 1, helmetHighlight);
  paint(7, 0, 1, 1, helmetHighlight);
  paint(3, 1, 6, 1, helmetHighlight);
  paint(2, 2, 1, 1, helmetHighlight);
  paint(9, 2, 1, 1, helmetHighlight);

  paint(3, 2, 6, 1, visor);
  paint(4, 2, 4, 1, visorReflection);
  paint(2, 3, 1, 2, helmet);
  paint(9, 3, 1, 2, helmet);
  paint(2, 4, 1, 1, helmetHighlight);
  paint(9, 4, 1, 1, helmetHighlight);

  paint(3, 4, 6, 1, visor);
  paint(4, 4, 4, 1, visorReflection);
  paint(5, 5, 2, 1, balaclava);
  paint(3, 5, 2, 1, skin);
  paint(7, 5, 2, 1, skin);
  paint(4, 6, 4, 1, skinShadow);
  paint(3, 6, 1, 1, skin);
  paint(8, 6, 1, 1, skin);
  paint(2, 5, 1, 2, helmet);
  paint(9, 5, 1, 2, helmet);

  paint(2, 7, 8, 1, helmet);
  paint(5, 6, 2, 2, balaclava);
  paint(4, 7, 4, 1, balaclava);
  paint(2, 7, 1, 1, helmetHighlight);
  paint(9, 7, 1, 1, helmetHighlight);

  paint(1, 8, 1, 3, undersuit);
  paint(10, 8, 1, 3, undersuit);
  paint(1, 9, 1, 1, undersuitHighlight);
  paint(10, 9, 1, 1, undersuitHighlight);
  paint(0, 8, 1, 1, earPiece);
  paint(11, 8, 1, 1, earPiece);

  paint(2, 8, 8, 3, vestPrimary);
  paint(2, 8, 1, 3, vestShadow);
  paint(9, 8, 1, 3, vestShadow);
  paint(3, 8, 6, 1, vestHighlight);
  paint(4, 9, 4, 1, vestHighlight);
  paint(5, 10, 2, 1, vestHighlight);
  paint(4, 10, 1, 1, vestShadow);
  paint(7, 10, 1, 1, vestShadow);

  paint(2, 9, 1, 1, flagRed);
  paint(2, 10, 1, 1, flagYellow);

  paint(0, 10, 1, 2, glove);
  paint(11, 10, 1, 2, glove);
  paint(0, 11, 1, 1, gloveHighlight);
  paint(11, 11, 1, 1, gloveHighlight);
  paint(1, 11, 1, 1, glove);
  paint(10, 11, 1, 1, glove);

  paint(2, 11, 8, 1, belt);
  paint(1, 12, 10, 1, holster);

  paint(2, 12, 3, 3, undersuit);
  paint(7, 12, 3, 3, undersuit);
  paint(3, 13, 1, 1, undersuitHighlight);
  paint(8, 13, 1, 1, undersuitHighlight);

  paint(2, 15, 3, 1, boot);
  paint(7, 15, 3, 1, boot);
  paint(2, 14, 3, 1, bootHighlight);
  paint(7, 14, 3, 1, bootHighlight);
}
