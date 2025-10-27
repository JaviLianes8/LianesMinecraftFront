import { SPRITE_HEIGHT, SPRITE_WIDTH, WAVE_AMPLITUDE } from '../constants.js';
import { resolveSkinRenderer } from './skins/index.js';

/**
 * Draws an actor shadow, sprite and label within the provided context.
 *
 * @param {CanvasRenderingContext2D} ctx Rendering context.
 * @param {import('../actors/actorLifecycle.js').Actor} actor Actor instance.
 */
export function drawActor(ctx, actor) {
  const scale = actor.scale;
  const x = actor.x;
  const y = actor.y + Math.sin(actor.wave) * WAVE_AMPLITUDE;

  drawShadow(ctx, x, y, scale);
  drawBody(ctx, x, y, scale, actor.name);
  drawLabel(ctx, x, y, scale, actor.name);
}

/**
 * Renders the drop shadow beneath the sprite.
 */
function drawShadow(ctx, x, y, scale) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x + (SPRITE_WIDTH / 2) * scale, y + SPRITE_HEIGHT * scale, 5 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the sprite body using the resolved skin renderer.
 */
function drawBody(ctx, x, y, scale, name) {
  const renderer = resolveSkinRenderer(name);
  renderer(ctx, x, y, scale);
}

/**
 * Paints the name label above the sprite.
 */
function drawLabel(ctx, x, y, scale, name) {
  const labelX = x + (SPRITE_WIDTH / 2) * scale;
  const labelY = y - 6;
  const fontSize = Math.round(12 * (scale / 3));
  ctx.save();
  ctx.font = `600 ${Math.max(fontSize, 12)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillText(name, labelX, labelY - 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, labelX, labelY);
  ctx.restore();
}
