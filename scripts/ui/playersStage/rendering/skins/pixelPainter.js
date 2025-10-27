/**
 * Creates a helper to paint scaled pixel rectangles relative to the sprite origin.
 *
 * @param {CanvasRenderingContext2D} ctx Rendering context.
 * @param {number} x Origin X coordinate.
 * @param {number} y Origin Y coordinate.
 * @param {number} scale Scale factor.
 * @returns {(gx: number, gy: number, w: number, h: number, color: string) => void} Painter function.
 */
export function createPixelPainter(ctx, x, y, scale) {
  return (gx, gy, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + gx * scale, y + gy * scale, w * scale, h * scale);
  };
}
