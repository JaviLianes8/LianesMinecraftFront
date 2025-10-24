const FALLBACK_NAMES = ['Steve', 'Alex', 'Creeper', 'Skeleton', 'Enderman', 'Bee'];
const BASE_SPEED = 55;
const MAX_SPEED = 0.65;
const MIN_SCALE = 2.4;
const MAX_SCALE = 4.2;

/**
 * Creates and manages the animated backdrop that showcases connected players behind the torch.
 *
 * @param {{ container: HTMLElement | null, initialPlayers?: Array<{ name: string }> }} options Configuration for the backdrop.
 * @returns {{ update: (players: Array<{ name: string }>) => void, destroy: () => void }} Controls to update or dispose the backdrop.
 */
export function createPlayersBackdrop({ container, initialPlayers = [] } = {}) {
  if (!container || typeof document === 'undefined') {
    return createNoopBackdrop();
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'players-backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);

  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return createNoopBackdrop();
  }

  context.imageSmoothingEnabled = false;

  let animationFrameId = null;
  let backgroundPattern = null;
  let dpr = resolveDevicePixelRatio();
  let size = measureContainer(container);

  const actors = new Map();
  let activeEntries = buildEntries(initialPlayers);

  const resizeHandler = () => {
    size = measureContainer(container);
    if (size.width === 0 || size.height === 0) {
      return;
    }
    dpr = resolveDevicePixelRatio();
    resizeCanvas(canvas, context, size, dpr);
    backgroundPattern = null;
    wrapActorsWithinBounds(actors, size);
  };

  const observer = attachResizeObserver(container, resizeHandler);
  const devicePixelSource = attachDevicePixelRatioListener(resizeHandler);

  resizeHandler();
  syncActorsWithEntries(actors, activeEntries, size);
  scheduleFrame();

  return {
    update(players) {
      activeEntries = buildEntries(players);
      syncActorsWithEntries(actors, activeEntries, size);
    },
    destroy() {
      cancelAnimationFrameSafe(animationFrameId);
      if (observer) {
        observer.disconnect();
      }
      detachDevicePixelRatioListener(devicePixelSource);
      canvas.remove();
      actors.clear();
    },
  };

  function scheduleFrame() {
    cancelAnimationFrameSafe(animationFrameId);
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
    let lastTimestamp = now;

    const frame = (timestamp) => {
      const current = typeof timestamp === 'number' ? timestamp : Date.now();
      const delta = Math.min(0.032, (current - lastTimestamp) / 1000);
      lastTimestamp = current;

      if (size.width === 0 || size.height === 0) {
        animationFrameId = requestAnimationFrameSafe(frame);
        return;
      }

      drawScene(context, actors, size, delta);
      animationFrameId = requestAnimationFrameSafe(frame);
    };

    animationFrameId = requestAnimationFrameSafe(frame);
  }

  function drawScene(ctx, actorMap, bounds, delta) {
    if (!backgroundPattern) {
      backgroundPattern = buildBackgroundPattern(ctx);
    }

    ctx.save();
    ctx.fillStyle = backgroundPattern;
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.restore();

    for (const actor of actorMap.values()) {
      stepActor(actor, bounds, delta);
      drawActor(ctx, actor);
    }
  }
}

function createNoopBackdrop() {
  return {
    update: () => {},
    destroy: () => {},
  };
}

function resolveDevicePixelRatio() {
  if (typeof window === 'undefined' || typeof window.devicePixelRatio !== 'number') {
    return 1;
  }
  return Math.max(1, Math.floor(window.devicePixelRatio));
}

function measureContainer(container) {
  const rect = container.getBoundingClientRect();
  return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
}

function resizeCanvas(canvas, context, size, dpr) {
  canvas.width = size.width * dpr;
  canvas.height = size.height * dpr;
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  const media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const listener = () => handler();

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener);
  } else if (typeof media.addListener === 'function') {
    media.addListener(listener);
  }

  return { media, listener };
}

function detachDevicePixelRatioListener(source) {
  if (!source) {
    return;
  }

  const { media, listener } = source;
  if (!media || !listener) {
    return;
  }

  if (typeof media.removeEventListener === 'function') {
    media.removeEventListener('change', listener);
  } else if (typeof media.removeListener === 'function') {
    media.removeListener(listener);
  }
}

function requestAnimationFrameSafe(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
}

function cancelAnimationFrameSafe(handle) {
  if (typeof handle !== 'number') {
    return;
  }

  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(handle);
    return;
  }

  clearTimeout(handle);
}

function buildEntries(players) {
  if (!Array.isArray(players) || players.length === 0) {
    return FALLBACK_NAMES.map((name, index) => ({ id: `fallback-${index}`, name }));
  }

  const occurrences = new Map();

  return players
    .filter((player) => player && typeof player.name === 'string' && player.name.trim().length > 0)
    .map((player) => {
      const name = player.name.trim();
      const since = typeof player.connectedSince === 'string'
        ? player.connectedSince
        : typeof player.connected_since === 'string'
          ? player.connected_since
          : '';
      const baseId = since ? `${name}|${since}` : name;
      const count = occurrences.get(baseId) ?? 0;
      occurrences.set(baseId, count + 1);
      const suffix = count === 0 ? '' : `#${count}`;
      return { id: `${baseId}${suffix}`, name };
    });
}

function syncActorsWithEntries(actorMap, entries, bounds) {
  const activeIds = new Set();

  for (const entry of entries) {
    activeIds.add(entry.id);
    if (!actorMap.has(entry.id)) {
      actorMap.set(entry.id, createActor(entry.name, bounds));
    }
  }

  for (const [id] of actorMap) {
    if (!activeIds.has(id)) {
      actorMap.delete(id);
    }
  }
}

function createActor(name, bounds) {
  return {
    name,
    x: randomBetween(20, Math.max(21, bounds.width - 20)),
    y: randomBetween(20, Math.max(21, bounds.height - 20)),
    vx: randomBetween(-MAX_SPEED, MAX_SPEED),
    vy: randomBetween(-MAX_SPEED, MAX_SPEED),
    scale: randomBetween(MIN_SCALE, MAX_SCALE),
    hue: Math.floor(randomBetween(0, 360)),
    wanderPhase: randomBetween(0, Math.PI * 2),
    wanderSpeed: randomBetween(0.5, 1.15),
  };
}

function wrapActorsWithinBounds(actorMap, bounds) {
  for (const actor of actorMap.values()) {
    actor.x = wrapValue(actor.x, bounds.width);
    actor.y = wrapValue(actor.y, bounds.height);
  }
}

function wrapValue(value, max) {
  if (max <= 0) {
    return 0;
  }
  let result = value;
  while (result < -20) {
    result += max + 40;
  }
  while (result > max + 20) {
    result -= max + 40;
  }
  return result;
}

function buildBackgroundPattern(context) {
  const tile = document.createElement('canvas');
  const width = 64;
  const height = 64;
  tile.width = width;
  tile.height = height;
  const tileContext = tile.getContext('2d');
  if (!tileContext) {
    return '#0f172a';
  }

  tileContext.imageSmoothingEnabled = false;

  const gradient = tileContext.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0b1222');
  gradient.addColorStop(1, '#1a253b');
  tileContext.fillStyle = gradient;
  tileContext.fillRect(0, 0, width, height);

  for (let y = height * 0.55; y < height; y += 8) {
    for (let x = 0; x < width; x += 8) {
      const isDark = ((x + y) / 8) % 2 === 0;
      tileContext.fillStyle = isDark ? '#31572c' : '#4f772d';
      tileContext.fillRect(x, y, 8, 8);
    }
  }

  for (let y = height * 0.75; y < height; y += 8) {
    for (let x = 0; x < width; x += 8) {
      const isDark = ((x / 8 + y / 8) | 0) % 2 === 0;
      tileContext.fillStyle = isDark ? '#6c584c' : '#b08968';
      tileContext.fillRect(x, y, 8, 8);
    }
  }

  return context.createPattern(tile, 'repeat');
}

function stepActor(actor, bounds, delta) {
  actor.wanderPhase += delta * actor.wanderSpeed;
  actor.vx += Math.cos(actor.wanderPhase) * 0.015;
  actor.vy += Math.sin(actor.wanderPhase) * 0.015;

  actor.vx = clamp(actor.vx, -MAX_SPEED, MAX_SPEED);
  actor.vy = clamp(actor.vy, -MAX_SPEED, MAX_SPEED);

  actor.x += actor.vx * BASE_SPEED * delta;
  actor.y += actor.vy * BASE_SPEED * delta;

  const padding = 24;
  if (actor.x < -padding) {
    actor.x = bounds.width + padding;
  } else if (actor.x > bounds.width + padding) {
    actor.x = -padding;
  }

  if (actor.y < -padding) {
    actor.y = bounds.height + padding;
  } else if (actor.y > bounds.height + padding) {
    actor.y = -padding;
  }
}

function drawActor(ctx, actor) {
  const scale = actor.scale;
  const offsetX = actor.x;
  const offsetY = actor.y;

  const fillPixel = (x, y, width, height, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(offsetX + x * scale, offsetY + y * scale, width * scale, height * scale);
  };

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(offsetX + 6 * scale, offsetY + 16 * scale, 5 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bodyPrimary = `hsl(${actor.hue} 60% 50%)`;
  const bodySecondary = `hsl(${actor.hue} 60% 35%)`;
  const skinTone = '#f2c59f';
  const shoeColor = '#2b2b2b';
  const hairColor = '#2a1b0a';

  fillPixel(3, 12, 3, 4, bodySecondary);
  fillPixel(6, 12, 3, 4, bodySecondary);
  fillPixel(3, 15, 3, 1, shoeColor);
  fillPixel(6, 15, 3, 1, shoeColor);

  fillPixel(2, 7, 8, 5, bodyPrimary);
  fillPixel(1, 7, 1, 5, bodySecondary);
  fillPixel(10, 7, 1, 5, bodySecondary);

  fillPixel(3, 2, 6, 5, skinTone);
  fillPixel(3, 2, 6, 2, hairColor);
  fillPixel(3, 4, 1, 1, hairColor);
  fillPixel(8, 4, 1, 1, hairColor);
  fillPixel(4, 4, 1, 1, '#111');
  fillPixel(7, 4, 1, 1, '#111');

  drawNameplate(ctx, actor.name, offsetX + 6 * scale, offsetY - 14, scale);
}

function drawNameplate(ctx, text, centerX, textBaseline, scale) {
  const content = text.length > 16 ? `${text.slice(0, 15)}…` : text;
  ctx.save();
  ctx.font = `${12 * scale}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(content);
  const paddingX = 8 * scale;
  const paddingY = 7 * scale;
  const width = metrics.width + paddingX;
  const height = 18 * scale;
  const x = centerX - width / 2;
  const y = textBaseline - height + paddingY / 2;

  ctx.fillStyle = 'rgba(11, 18, 34, 0.65)';
  roundRect(ctx, x, y, width, height, 6 * scale, true, false);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(content, centerX, y + height / 2 + 1 * scale);
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
