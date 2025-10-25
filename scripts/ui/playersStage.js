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

const PLAYER_SKINS = new Map([
  ['lianes8', drawLuffySkin],
  ['pozofer11', drawPandaSkin],
  ['bruyan', drawDeadpoolSkin],
  ['wladymir14', drawPeakyBlindersSkin],
  ['alexethe', drawGeoOperatorSkin],
  ['alexconsta09', drawEzioSkin],
]);

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
  drawBody(ctx, x, y, scale, actor.name);
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

function drawBody(ctx, x, y, scale, name) {
  const renderer = resolveSkinRenderer(name);
  renderer(ctx, x, y, scale);
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

function resolveSkinRenderer(name) {
  if (typeof name !== 'string') {
    return drawDefaultSkin;
  }

  const key = name.trim().toLowerCase();
  if (!key) {
    return drawDefaultSkin;
  }

  return PLAYER_SKINS.get(key) ?? drawDefaultSkin;
}

function drawDefaultSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const primary = '#2f855a';
  const secondary = '#276749';
  const skin = '#f5cfa2';
  const shoes = '#1f2933';
  const hair = '#3f2a14';

  paint(3, 12, 3, 4, secondary);
  paint(6, 12, 3, 4, secondary);
  paint(3, 15, 3, 1, shoes);
  paint(6, 15, 3, 1, shoes);
  paint(2, 7, 8, 5, primary);
  paint(1, 7, 1, 5, secondary);
  paint(10, 7, 1, 5, secondary);
  paint(3, 2, 6, 5, skin);
  paint(3, 2, 6, 2, hair);
  paint(3, 4, 1, 1, hair);
  paint(8, 4, 1, 1, hair);
  paint(4, 4, 1, 1, '#111827');
  paint(7, 4, 1, 1, '#111827');
}

function drawLuffySkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const hatStraw = '#f9d976';
  const hatBand = '#e11d48';
  const skin = '#f2c09f';
  const shorts = '#2563eb';
  const vest = '#f97316';
  const sandals = '#7c2d12';
  const hair = '#111827';

  paint(2, 0, 8, 2, hatStraw);
  paint(2, 2, 8, 1, hatBand);
  paint(3, 3, 6, 1, hatStraw);
  paint(3, 4, 6, 4, skin);
  paint(3, 4, 6, 1, hair);
  paint(3, 6, 1, 1, hair);
  paint(8, 6, 1, 1, hair);
  paint(4, 6, 1, 1, '#111827');
  paint(7, 6, 1, 1, '#111827');
  paint(2, 8, 8, 4, vest);
  paint(2, 10, 1, 2, skin);
  paint(9, 10, 1, 2, skin);
  paint(3, 12, 3, 4, shorts);
  paint(6, 12, 3, 4, shorts);
  paint(3, 15, 3, 1, sandals);
  paint(6, 15, 3, 1, sandals);
}

function drawPandaSkin(ctx, x, y, scale) {
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

function drawDeadpoolSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const suitRed = '#991b1b';
  const suitShadow = '#7f1d1d';
  const black = '#111827';
  const eyeWhite = '#f9fafb';
  const belt = '#facc15';

  paint(3, 2, 6, 5, suitRed);
  paint(3, 2, 1, 5, suitShadow);
  paint(8, 2, 1, 5, suitShadow);
  paint(4, 3, 2, 2, black);
  paint(6, 3, 2, 2, black);
  paint(4, 4, 1, 1, eyeWhite);
  paint(7, 4, 1, 1, eyeWhite);
  paint(2, 7, 8, 5, suitRed);
  paint(1, 7, 1, 5, suitShadow);
  paint(10, 7, 1, 5, suitShadow);
  paint(2, 10, 1, 2, suitShadow);
  paint(9, 10, 1, 2, suitShadow);
  paint(2, 11, 8, 1, black);
  paint(5, 11, 2, 1, belt);
  paint(3, 12, 3, 4, suitRed);
  paint(6, 12, 3, 4, suitRed);
  paint(3, 15, 3, 1, black);
  paint(6, 15, 3, 1, black);
}

function drawPeakyBlindersSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const capDark = '#1f2933';
  const capLight = '#374151';
  const skin = '#f5d0c5';
  const hair = '#111827';
  const coat = '#111827';
  const coatHighlight = '#1f2937';
  const vest = '#4b5563';
  const shirt = '#e5e7eb';
  const tie = '#9ca3af';
  const trousers = '#1f2933';
  const shoes = '#0f172a';
  const cigarette = '#f8fafc';
  const ember = '#f97316';
  const smokeLight = 'rgba(226, 232, 240, 0.8)';
  const smokeDim = 'rgba(148, 163, 184, 0.6)';
  const moustache = '#b45309';

  paint(2, 0, 8, 1, capDark);
  paint(1, 1, 10, 1, capDark);
  paint(2, 2, 8, 1, capLight);
  paint(2, 3, 8, 1, capDark);

  paint(3, 4, 6, 4, skin);
  paint(3, 4, 6, 1, hair);
  paint(3, 6, 1, 1, hair);
  paint(8, 6, 1, 1, hair);
  paint(4, 6, 1, 1, hair);
  paint(7, 6, 1, 1, hair);
  paint(5, 7, 2, 1, moustache);

  paint(4, 8, 1, 1, hair);
  paint(7, 8, 1, 1, hair);
  paint(8, 7, 1, 1, cigarette);
  paint(9, 7, 1, 1, ember);
  paint(10, 6, 1, 1, smokeLight);
  paint(11, 5, 1, 1, smokeDim);

  paint(2, 8, 8, 2, vest);
  paint(2, 9, 1, 2, coat);
  paint(9, 9, 1, 2, coat);
  paint(3, 10, 6, 1, shirt);
  paint(5, 10, 2, 1, tie);
  paint(2, 11, 8, 1, coatHighlight);

  paint(2, 12, 3, 4, coat);
  paint(7, 12, 3, 4, coat);
  paint(3, 12, 3, 4, trousers);
  paint(6, 12, 3, 4, trousers);
  paint(3, 15, 3, 1, shoes);
  paint(6, 15, 3, 1, shoes);
}

function drawEzioSkin(ctx, x, y, scale) {
  const paint = createPixelPainter(ctx, x, y, scale);

  const hood = '#f3f4f6';
  const hoodShadow = '#d1d5db';
  const skin = '#f5d0c5';
  const beard = '#4b5563';
  const eye = '#111827';
  const armor = '#9ca3af';
  const armorShadow = '#6b7280';
  const leather = '#7c3f2c';
  const sash = '#b91c1c';
  const sashShadow = '#7f1d1d';
  const belt = '#374151';
  const cloth = '#e5e7eb';
  const boot = '#1f2937';
  const blade = '#cbd5f5';

  paint(3, 0, 6, 1, hoodShadow);
  paint(2, 1, 8, 1, hood);
  paint(2, 2, 1, 4, hoodShadow);
  paint(9, 2, 1, 4, hoodShadow);
  paint(3, 2, 6, 2, hood);
  paint(3, 4, 6, 3, skin);
  paint(4, 5, 1, 1, eye);
  paint(7, 5, 1, 1, eye);
  paint(5, 6, 2, 1, beard);
  paint(4, 6, 1, 1, beard);
  paint(7, 6, 1, 1, beard);
  paint(2, 6, 1, 1, hoodShadow);
  paint(9, 6, 1, 1, hoodShadow);

  paint(1, 7, 1, 4, cloth);
  paint(10, 7, 1, 4, cloth);
  paint(1, 10, 1, 1, armorShadow);
  paint(10, 10, 1, 1, armorShadow);
  paint(1, 11, 1, 1, blade);
  paint(10, 11, 1, 1, leather);
  paint(1, 12, 1, 1, blade);
  paint(1, 13, 1, 1, blade);

  paint(2, 7, 8, 3, armor);
  paint(2, 7, 1, 3, armorShadow);
  paint(9, 7, 1, 3, armorShadow);
  paint(3, 9, 6, 1, armorShadow);
  paint(4, 8, 4, 1, armor);

  paint(2, 10, 8, 1, sash);
  paint(5, 10, 2, 1, sashShadow);
  paint(2, 11, 8, 1, belt);

  paint(2, 12, 2, 1, cloth);
  paint(8, 12, 2, 1, cloth);
  paint(4, 12, 4, 1, leather);
  paint(10, 12, 1, 1, leather);
  paint(4, 13, 4, 1, sash);
  paint(5, 12, 2, 2, sashShadow);
  paint(3, 13, 1, 2, armorShadow);
  paint(8, 13, 1, 2, armorShadow);
  paint(2, 13, 1, 3, cloth);
  paint(9, 13, 1, 3, cloth);

  paint(3, 14, 3, 1, armorShadow);
  paint(6, 14, 3, 1, armorShadow);
  paint(3, 15, 3, 1, boot);
  paint(6, 15, 3, 1, boot);
}

function drawGeoOperatorSkin(ctx, x, y, scale) {
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

function createPixelPainter(ctx, x, y, scale) {
  return (gx, gy, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + gx * scale, y + gy * scale, w * scale, h * scale);
  };
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
