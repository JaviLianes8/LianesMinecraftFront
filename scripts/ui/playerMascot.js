const DEFAULT_NAME = 'Player';
const BASE_SPEED = 90;
const WAVE_SPEED = 2.2;
const WAVE_AMPLITUDE = 6;
const SPRITE_WIDTH = 12;
const SPRITE_HEIGHT = 16;

/**
 * Creates and manages a single pixel-art character that roams across the control panel.
 *
 * @param {{ container: HTMLElement | null, initialName?: string }} options Configuration for the mascot overlay.
 * @returns {{ updateName: (name?: string | null) => void, destroy: () => void }} Control surface for the mascot lifecycle.
 */
export function createPlayerMascot({ container, initialName } = {}) {
  if (!container || typeof document === 'undefined') {
    return createNoopMascot();
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'player-mascot';
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);

  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return createNoopMascot();
  }

  let dpr = resolveDevicePixelRatio();
  let size = measureContainer(container);
  let animationFrameId = null;

  const actor = createActor(initialName ?? DEFAULT_NAME, size);

  const resizeHandler = () => {
    size = measureContainer(container);
    dpr = resolveDevicePixelRatio();
    if (size.width === 0 || size.height === 0) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    resizeCanvas(canvas, context, size, dpr);
    repositionActor(actor, size);
  };

  const resizeObserver = attachResizeObserver(container, resizeHandler);
  const dprListener = attachDevicePixelRatioListener(resizeHandler);

  resizeHandler();
  scheduleFrame();

  return {
    updateName(name) {
      actor.name = sanitiseName(name);
    },
    destroy() {
      cancelAnimationFrameSafe(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      detachDevicePixelRatioListener(dprListener);
      canvas.remove();
    },
  };

  function scheduleFrame() {
    cancelAnimationFrameSafe(animationFrameId);

    let lastTimestamp = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

    const frame = (timestamp) => {
      const current = typeof timestamp === 'number' ? timestamp : Date.now();
      const delta = Math.min(0.032, (current - lastTimestamp) / 1000);
      lastTimestamp = current;

      if (size.width === 0 || size.height === 0) {
        animationFrameId = requestAnimationFrameSafe(frame);
        return;
      }

      context.clearRect(0, 0, size.width, size.height);
      stepActor(actor, size, delta);
      drawActor(context, actor);
      animationFrameId = requestAnimationFrameSafe(frame);
    };

    animationFrameId = requestAnimationFrameSafe(frame);
  }
}

function createNoopMascot() {
  return {
    updateName: () => {},
    destroy: () => {},
  };
}

function createActor(name, size) {
  const scale = resolveScale(size.height);
  return {
    name: sanitiseName(name),
    x: -SPRITE_WIDTH * scale,
    baseY: resolveBaseY(size.height),
    y: resolveBaseY(size.height),
    speed: BASE_SPEED,
    scale,
    wave: 0,
  };
}

function repositionActor(actor, size) {
  actor.scale = resolveScale(size.height);
  actor.baseY = resolveBaseY(size.height);
  actor.y = actor.baseY;
  if (actor.x > size.width + SPRITE_WIDTH * actor.scale) {
    actor.x = -SPRITE_WIDTH * actor.scale;
  }
}

function resolveScale(height) {
  if (!Number.isFinite(height) || height <= 0) {
    return 3;
  }
  const reference = Math.max(120, Math.min(height, 420));
  return Math.max(2.6, Math.min(4.2, reference / 80));
}

function resolveBaseY(height) {
  if (!Number.isFinite(height) || height <= 0) {
    return 120;
  }
  return Math.max(64, height * 0.65);
}

function stepActor(actor, bounds, delta) {
  actor.x += actor.speed * delta;
  actor.wave += delta * WAVE_SPEED;
  actor.y = actor.baseY + Math.sin(actor.wave) * WAVE_AMPLITUDE;

  const limit = bounds.width + SPRITE_WIDTH * actor.scale;
  if (actor.x > limit) {
    actor.x = -SPRITE_WIDTH * actor.scale;
  }
}

function drawActor(ctx, actor) {
  const scale = actor.scale;
  const x = actor.x;
  const y = actor.y;

  drawShadow(ctx, x, y, scale);
  drawBody(ctx, x, y, scale);
  drawLabel(ctx, x, y, scale, actor.name);
}

function drawShadow(ctx, x, y, scale) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x + (SPRITE_WIDTH / 2) * scale, y + SPRITE_HEIGHT * scale, 5 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBody(ctx, x, y, scale) {
  const px = (gx, gy, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + gx * scale, y + gy * scale, w * scale, h * scale);
  };

  const primary = '#2f855a';
  const secondary = '#276749';
  const skin = '#f5cfa2';
  const shoes = '#1f2933';
  const hair = '#3f2a14';

  px(3, 12, 3, 4, secondary);
  px(6, 12, 3, 4, secondary);
  px(3, 15, 3, 1, shoes);
  px(6, 15, 3, 1, shoes);
  px(2, 7, 8, 5, primary);
  px(1, 7, 1, 5, secondary);
  px(10, 7, 1, 5, secondary);
  px(3, 2, 6, 5, skin);
  px(3, 2, 6, 2, hair);
  px(3, 4, 1, 1, hair);
  px(8, 4, 1, 1, hair);
  px(4, 4, 1, 1, '#111827');
  px(7, 4, 1, 1, '#111827');
}

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

function resizeCanvas(canvas, context, size, dpr) {
  canvas.width = size.width * dpr;
  canvas.height = size.height * dpr;
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function measureContainer(container) {
  const rect = container.getBoundingClientRect();
  return {
    width: Math.floor(rect.width),
    height: Math.floor(rect.height),
  };
}

function sanitiseName(name) {
  if (!name || typeof name !== 'string') {
    return DEFAULT_NAME;
  }
  const trimmed = name.trim();
  return trimmed.length === 0 ? DEFAULT_NAME : trimmed;
}

function resolveDevicePixelRatio() {
  if (typeof window === 'undefined' || typeof window.devicePixelRatio !== 'number') {
    return 1;
  }
  return Math.max(1, Math.floor(window.devicePixelRatio));
}

function attachResizeObserver(container, handler) {
  if (typeof ResizeObserver === 'undefined') {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handler);
      return {
        disconnect() {
          window.removeEventListener('resize', handler);
        },
      };
    }
    return null;
  }

  const observer = new ResizeObserver(() => handler());
  observer.observe(container);
  return observer;
}

function attachDevicePixelRatioListener(handler) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  const ratio = typeof window.devicePixelRatio === 'number' && !Number.isNaN(window.devicePixelRatio)
    ? window.devicePixelRatio
    : 1;
  const query = window.matchMedia(`(resolution: ${ratio}dppx)`);

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler);
    return {
      remove() {
        query.removeEventListener('change', handler);
      },
    };
  }

  if (typeof query.addListener === 'function') {
    query.addListener(handler);
    return {
      remove() {
        query.removeListener(handler);
      },
    };
  }

  return null;
}

function detachDevicePixelRatioListener(source) {
  if (source && typeof source.remove === 'function') {
    source.remove();
  }
}

function cancelAnimationFrameSafe(id) {
  if (typeof id !== 'number') {
    return;
  }

  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}

function requestAnimationFrameSafe(callback) {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
}
