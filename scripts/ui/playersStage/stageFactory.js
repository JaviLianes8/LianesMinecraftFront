import { createActor, stepActor, clampActorToBounds } from './actors/actorLifecycle.js';
import { normalisePlayers } from './actors/playerSnapshot.js';
import { EnemyManager } from './actors/enemyManager.js';
import { createArrowProjectile, didProjectileHitEnemy, isProjectileExpired, isProjectileOutside, stepProjectile } from './actors/projectileLifecycle.js';
import {
  attachDevicePixelRatioListener,
  attachResizeObserver,
  cancelAnimationFrameSafe,
  detachDevicePixelRatioListener,
  measureContainer,
  requestAnimationFrameSafe,
  resolveDevicePixelRatio,
  resizeCanvas,
  updateActorsOnResize,
} from './dom/domUtils.js';
import { drawActor } from './rendering/drawActor.js';
import { drawProjectile } from './rendering/drawProjectile.js';

/**
 * Creates and manages the lifecycle of the players stage canvas.
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

  /** @type {Map<string, import('./actors/actorLifecycle.js').Actor>} */
  const actors = new Map();
  let dpr = resolveDevicePixelRatio();
  let size = measureContainer(container);
  let animationFrameId = null;
  const enemyManager = new EnemyManager({ bounds: size });
  const projectiles = new Map();
  let projectileCounter = 0;

  const resizeHandler = () => {
    size = measureContainer(container);
    dpr = resolveDevicePixelRatio();

    if (size.width === 0 || size.height === 0) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }

    resizeCanvas(canvas, context, size, dpr);
    updateActorsOnResize(actors, size);
    for (const actor of actors.values()) {
      clampActorToBounds(actor, size);
    }
    enemyManager.setBounds(size);
    enemyManager.ensurePopulation();
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

      const players = Array.from(actors.values());
      for (const actor of players) {
        stepActor(actor, size, delta);
      }

      enemyManager.update({
        delta,
        players,
        onAttack: ({ enemy, player }) => {
          if (!player || !enemy) {
            return;
          }
          const projectile = createArrowProjectile({
            id: `arrow-${projectileCounter++}`,
            from: player,
            to: enemy,
          });
          if (projectile.ttl > 0) {
            projectiles.set(projectile.id, projectile);
          }
        },
      });

      for (const projectile of Array.from(projectiles.values())) {
        stepProjectile(projectile, delta);
        const enemy = enemyManager.findEnemy((candidate) => didProjectileHitEnemy(projectile, candidate));
        if (enemy) {
          enemyManager.handleDefeat(enemy.id);
          projectiles.delete(projectile.id);
          continue;
        }
        if (isProjectileExpired(projectile) || isProjectileOutside(projectile, size)) {
          projectiles.delete(projectile.id);
        }
      }

      context.clearRect(0, 0, size.width, size.height);
      for (const actor of players) {
        drawActor(context, actor);
      }
      for (const enemy of enemyManager.getEnemies()) {
        drawActor(context, enemy);
      }
      for (const projectile of projectiles.values()) {
        drawProjectile(context, projectile);
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

    enemyManager.ensurePopulation();
  }
}

function createNoopStage() {
  return {
    updatePlayers: () => {},
    destroy: () => {},
  };
}
