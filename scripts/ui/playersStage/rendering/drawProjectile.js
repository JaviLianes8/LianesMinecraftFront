import { arrowVisual } from '../actors/projectileLifecycle.js';

/**
 * Draws an arrow projectile following the Minecraft-inspired palette.
 *
 * @param {CanvasRenderingContext2D} ctx Rendering context.
 * @param {{ x: number, y: number, rotation: number }} projectile Projectile instance.
 */
export function drawProjectile(ctx, projectile) {
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(projectile.rotation);

  const shaftLength = arrowVisual.length - arrowVisual.head;
  const shaftOffset = -shaftLength / 2;
  const headOffset = shaftOffset + shaftLength;

  ctx.fillStyle = '#b6854d';
  ctx.fillRect(shaftOffset, -arrowVisual.thickness / 2, shaftLength, arrowVisual.thickness);

  ctx.fillStyle = '#f5e3b0';
  ctx.fillRect(headOffset, -arrowVisual.thickness, arrowVisual.head, arrowVisual.thickness * 2);

  ctx.fillStyle = '#ede3d3';
  ctx.fillRect(shaftOffset - 3.5, -arrowVisual.thickness * 1.8, 3.5, arrowVisual.thickness * 3.6);

  ctx.restore();
}
