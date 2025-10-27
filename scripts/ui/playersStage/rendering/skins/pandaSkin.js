import { createPixelPainter } from './pixelPainter.js';

/**
 * Draws the panda themed skin.
 */
export function drawPandaSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const furWhite = '#f9fafb';
  const furBlack = '#111827';
  const bambooGreen = '#16a34a';

  paint(3, 1, 2, 2, furBlack);
  paint(7, 1, 2, 2, furBlack);
  paint(3, 2, 6, 5, furWhite);
  paint(2, 3, 1, 2, furBlack);
  paint(9, 3, 1, 2, furBlack);
  paint(3, 4, 1, 1, furBlack);
  paint(8, 4, 1, 1, furBlack);
  paint(4, 4, 1, 1, furBlack);
  paint(7, 4, 1, 1, furBlack);
  paint(5, 4, 2, 1, furWhite);
  paint(2, 7, 8, 5, furWhite);
  paint(2, 9, 2, 3, furBlack);
  paint(8, 9, 2, 3, furBlack);
  paint(3, 12, 3, 4, furBlack);
  paint(6, 12, 3, 4, furBlack);
  paint(3, 15, 3, 1, furBlack);
  paint(6, 15, 3, 1, furBlack);
  paint(9, 8, 1, 4, bambooGreen);
  paint(10, 8, 1, 4, bambooGreen);
}
