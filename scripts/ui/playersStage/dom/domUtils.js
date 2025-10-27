import { resolveScale } from '../utils/geometry.js';

/**
 * Measures container dimensions to configure the rendering canvas.
 *
 * @param {HTMLElement} container Stage container element.
 * @returns {{ width: number, height: number }} Container size.
 */
export function measureContainer(container) {
  const rect = container.getBoundingClientRect();
  return {
    width: Math.floor(rect.width),
    height: Math.floor(rect.height),
  };
}

/**
 * Resizes the target canvas while preserving crisp rendering at high DPRs.
 *
 * @param {HTMLCanvasElement} canvas Target canvas element.
 * @param {CanvasRenderingContext2D} context Canvas rendering context.
 * @param {{ width: number, height: number }} size Latest container size.
 * @param {number} dpr Device pixel ratio.
 */
export function resizeCanvas(canvas, context, size, dpr) {
  canvas.width = size.width * dpr;
  canvas.height = size.height * dpr;
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Resolves the current device pixel ratio, falling back to 1 in server contexts.
 *
 * @returns {number} Device pixel ratio.
 */
export function resolveDevicePixelRatio() {
  if (typeof window === 'undefined' || typeof window.devicePixelRatio !== 'number') {
    return 1;
  }
  return Math.max(1, Math.floor(window.devicePixelRatio));
}

/**
 * Connects a resize observer or window listener depending on platform support.
 *
 * @param {HTMLElement} container Observed container element.
 * @param {() => void} handler Callback executed on resize events.
 * @returns {{ disconnect: () => void } | null} Observer reference.
 */
export function attachResizeObserver(container, handler) {
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

/**
 * Registers a listener for device pixel ratio changes using matchMedia when available.
 *
 * @param {() => void} handler Invoked when the DPR media query changes.
 * @returns {{ remove: () => void } | null} Listener reference.
 */
export function attachDevicePixelRatioListener(handler) {
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

/**
 * Detaches a previously registered DPR listener.
 *
 * @param {{ remove: () => void } | null} source Listener source object.
 */
export function detachDevicePixelRatioListener(source) {
  if (source && typeof source.remove === 'function') {
    source.remove();
  }
}

/**
 * Safely cancels an animation frame or timeout fallback.
 *
 * @param {number | null} id Frame identifier.
 */
export function cancelAnimationFrameSafe(id) {
  if (typeof id !== 'number') {
    return;
  }

  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Requests an animation frame with a timeout fallback for unsupported environments.
 *
 * @param {(timestamp: number) => void} callback Frame callback.
 * @returns {number} Frame identifier.
 */
export function requestAnimationFrameSafe(callback) {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
}

/**
 * Updates actor scaling and bounding after a resize event.
 *
 * @param {Map<string, import('../actors/actorLifecycle.js').Actor>} actors Active actors map.
 * @param {{ width: number, height: number }} size Updated canvas size.
 */
export function updateActorsOnResize(actors, size) {
  for (const actor of actors.values()) {
    actor.scale = resolveScale(size.height);
  }
}
