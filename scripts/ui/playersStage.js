const DEFAULT_NAME = 'Player';
const SPRITE_WIDTH = 12;
const SPRITE_HEIGHT = 16;
const WAVE_SPEED = 2.4;
const WAVE_AMPLITUDE = 5.5;
const MIN_SPEED = 18;
const MAX_SPEED = 42;
const MIN_DIRECTION_INTERVAL = 1.6;
const MAX_DIRECTION_INTERVAL = 4.2;
const BOUNDS_PADDING = 28;

/**
 * Creates and manages a canvas stage that renders one mascot per connected player.
 *
 * @param {{ container: HTMLElement | null, initialPlayers?: any[] }} options Stage configuration.
 * @returns {{ updatePlayers: (players?: any[] | null) => void, destroy: () => void }} Stage lifecycle controls.
 */
export function createPlayersStage({ container, initialPlayers = [] } = {}) {
  if (!container || typeof document === 'undefined') {
    return createNoopStage();
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'players-stage';
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);

  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return createNoopStage();
  }

  /** @type {Map<string, Actor>} */
  const actors = new Map();
  let dpr = resolveDevicePixelRatio();
  let size = measureContainer(container);
  let animationFrameId = null;

  const resizeHandler = () => {
    size = measureContainer(container);
    dpr = resolveDevicePixelRatio();

    if (size.width === 0 || size.height === 0) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }

    resizeCanvas(canvas, context, size, dpr);
    for (const actor of actors.values()) {
      actor.scale = resolveScale(size.height);
      clampActorToBounds(actor, size);
    }
  };

  const resizeObserver = attachResizeObserver(container, resizeHandler);
  const dprListener = attachDevicePixelRatioListener(resizeHandler);

  resizeHandler();
  updateActors(initialPlayers);
  scheduleFrame();

  return {
    updatePlayers(players) {
      updateActors(players);
    },
    destroy() {
      cancelAnimationFrameSafe(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      detachDevicePixelRatioListener(dprListener);
      canvas.remove();
      actors.clear();
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
      for (const actor of actors.values()) {
        stepActor(actor, size, delta);
        drawActor(context, actor);
      }

      animationFrameId = requestAnimationFrameSafe(frame);
    };

    animationFrameId = requestAnimationFrameSafe(frame);
  }

  function updateActors(players) {
    const snapshot = normalisePlayers(players);
    const activeKeys = new Set();

    for (const player of snapshot) {
      activeKeys.add(player.id);
      let actor = actors.get(player.id);
      if (!actor) {
        actor = createActor(player, size);
        actors.set(player.id, actor);
      }
      actor.name = player.name;
    }

    for (const key of Array.from(actors.keys())) {
      if (!activeKeys.has(key)) {
        actors.delete(key);
      }
    }
  }
}

function createNoopStage() {
  return {
    updatePlayers: () => {},
    destroy: () => {},
  };
}

/**
 * @typedef {Object} Actor
 * @property {string} id
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} scale
 * @property {number} wave
 * @property {number} nextDirectionChange
 */

function createActor(player, size) {
  const scale = resolveScale(size.height);
  const bounds = resolveMovementBounds(size, scale);
  const position = resolveRandomPosition(bounds);
  const velocity = resolveRandomVelocity();

  return {
    id: player.id,
    name: player.name,
    x: position.x,
    y: position.y,
    vx: velocity.vx,
    vy: velocity.vy,
    scale,
    wave: Math.random() * Math.PI * 2,
    nextDirectionChange: resolveDirectionInterval(),
  };
}

function stepActor(actor, bounds, delta) {
  const movementBounds = resolveMovementBounds(bounds, actor.scale);
  actor.x += actor.vx * delta;
  actor.y += actor.vy * delta;
  actor.wave += delta * WAVE_SPEED;
  actor.nextDirectionChange -= delta;

  if (actor.x < movementBounds.minX) {
    actor.x = movementBounds.minX;
    actor.vx = Math.abs(actor.vx);
    actor.nextDirectionChange = resolveDirectionInterval();
  } else if (actor.x > movementBounds.maxX) {
    actor.x = movementBounds.maxX;
    actor.vx = -Math.abs(actor.vx);
    actor.nextDirectionChange = resolveDirectionInterval();
  }

  if (actor.y < movementBounds.minY) {
    actor.y = movementBounds.minY;
    actor.vy = Math.abs(actor.vy);
    actor.nextDirectionChange = resolveDirectionInterval();
  } else if (actor.y > movementBounds.maxY) {
    actor.y = movementBounds.maxY;
    actor.vy = -Math.abs(actor.vy);
    actor.nextDirectionChange = resolveDirectionInterval();
  }

  if (actor.nextDirectionChange <= 0) {
    const velocity = resolveRandomVelocity();
    actor.vx = velocity.vx;
    actor.vy = velocity.vy;
    actor.nextDirectionChange = resolveDirectionInterval();
  }

  normaliseWavePhase(actor);
}

function drawActor(ctx, actor) {
  const scale = actor.scale;
  const x = actor.x;
  const y = actor.y + Math.sin(actor.wave) * WAVE_AMPLITUDE;

  drawShadow(ctx, x, y, scale);
  drawBody(ctx, x, y, scale);
  drawLabel(ctx, x, y, scale, actor.name);
}

function normaliseWavePhase(actor) {
  if (!Number.isFinite(actor.wave)) {
    actor.wave = 0;
  }
}

function drawShadow(ctx, x, y, scale) {
  ctx.save();
  ctx.globalAlpha = 0.22;
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

function clampActorToBounds(actor, bounds) {
  const movementBounds = resolveMovementBounds(bounds, actor.scale);
  actor.x = clamp(actor.x, movementBounds.minX, movementBounds.maxX);
  actor.y = clamp(actor.y, movementBounds.minY, movementBounds.maxY);
}

function resolveMovementBounds(size, scale) {
  const minX = BOUNDS_PADDING;
  const maxX = Math.max(minX, size.width - SPRITE_WIDTH * scale - BOUNDS_PADDING);
  const minY = Math.max(BOUNDS_PADDING * 0.5, size.height * 0.35);
  const maxY = Math.max(minY, size.height - SPRITE_HEIGHT * scale - BOUNDS_PADDING * 0.4);
  return { minX, maxX, minY, maxY };
}

function resolveRandomPosition(bounds) {
  return {
    x: randomBetween(bounds.minX, bounds.maxX),
    y: randomBetween(bounds.minY, bounds.maxY),
  };
}

function resolveRandomVelocity() {
  const speed = randomBetween(MIN_SPEED, MAX_SPEED);
  const angle = Math.random() * Math.PI * 2;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function resolveDirectionInterval() {
  return randomBetween(MIN_DIRECTION_INTERVAL, MAX_DIRECTION_INTERVAL);
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

function normalisePlayers(players) {
  if (!Array.isArray(players)) {
    return [];
  }

  const seenIds = new Set();
  const result = [];

  players.forEach((player, index) => {
    const name = sanitiseName(player && player.name);
    const identifier = resolvePlayerIdentifier(player, index);
    let id = identifier;
    let attempt = 1;

    while (seenIds.has(id)) {
      id = `${identifier}#${attempt++}`;
    }

    seenIds.add(id);
    result.push({ id, name });
  });

  return result;
}

function resolvePlayerIdentifier(player, index) {
  const baseName = typeof player?.name === 'string' ? player.name.trim().toLowerCase() : DEFAULT_NAME.toLowerCase();
  const since = typeof player?.connected_since === 'string' ? player.connected_since : '';
  if (since) {
    return `${baseName || DEFAULT_NAME.toLowerCase()}::${since}`;
  }
  return `${baseName || DEFAULT_NAME.toLowerCase()}::${index}`;
}

function sanitiseName(name) {
  if (!name || typeof name !== 'string') {
    return DEFAULT_NAME;
  }
  const trimmed = name.trim();
  return trimmed.length === 0 ? DEFAULT_NAME : trimmed;
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function resolveScale(height) {
  if (!Number.isFinite(height) || height <= 0) {
    return 3;
  }
  const reference = Math.max(120, Math.min(height, 420));
  return Math.max(2.6, Math.min(4.2, reference / 80));
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

function randomBetween(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }
  if (max <= min) {
    return min;
  }
  return min + Math.random() * (max - min);
}
