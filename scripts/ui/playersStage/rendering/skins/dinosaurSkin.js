import { createPixelPainter } from './pixelPainter.js';

/**
 * Draws the dinosaur themed skin tailored for Slujan.
 */
export function drawDinosaurSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const primaryScale = '#047857';
  const shadowScale = '#065f46';
  const belly = '#bbf7d0';
  const highlightScale = '#34d399';
  const dorsalSpine = '#0f766e';
  const horn = '#d1d5db';
  const claw = '#fbbf24';
  const eyeWhite = '#f9fafb';
  const pupil = '#111827';
  const mouth = '#1f2937';

  paint(4, 0, 1, 1, horn);
  paint(7, 0, 1, 1, horn);

  paint(3, 1, 6, 1, shadowScale);
  paint(5, 1, 2, 1, dorsalSpine);
  paint(2, 2, 8, 3, primaryScale);
  paint(2, 2, 1, 3, shadowScale);
  paint(9, 2, 1, 3, shadowScale);
  paint(4, 2, 4, 1, highlightScale);

  paint(3, 3, 1, 1, eyeWhite);
  paint(7, 3, 1, 1, eyeWhite);
  paint(3, 4, 1, 1, pupil);
  paint(7, 4, 1, 1, pupil);
  paint(4, 4, 4, 1, highlightScale);
  paint(2, 5, 8, 1, primaryScale);
  paint(4, 5, 4, 1, mouth);

  paint(2, 6, 8, 1, primaryScale);
  paint(2, 7, 8, 5, primaryScale);
  paint(3, 8, 6, 4, belly);
  paint(2, 7, 1, 5, shadowScale);
  paint(9, 7, 1, 5, shadowScale);
  paint(1, 8, 1, 3, shadowScale);
  paint(10, 8, 1, 3, shadowScale);
  paint(0, 9, 1, 2, shadowScale);
  paint(11, 9, 1, 2, shadowScale);
  paint(2, 6, 1, 1, dorsalSpine);
  paint(1, 7, 1, 1, dorsalSpine);
  paint(10, 7, 1, 1, dorsalSpine);
  paint(9, 6, 1, 1, dorsalSpine);
  paint(8, 10, 1, 2, dorsalSpine);
  paint(4, 10, 4, 1, highlightScale);

  paint(2, 12, 3, 3, primaryScale);
  paint(7, 12, 3, 3, primaryScale);
  paint(3, 13, 1, 1, highlightScale);
  paint(8, 13, 1, 1, highlightScale);
  paint(3, 14, 3, 1, highlightScale);
  paint(6, 14, 3, 1, highlightScale);

  paint(3, 15, 3, 1, claw);
  paint(6, 15, 3, 1, claw);
}
