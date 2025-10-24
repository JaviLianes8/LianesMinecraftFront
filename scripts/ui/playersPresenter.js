/**
 * Creates a presenter responsible for rendering the connected players panel.
 *
 * @param {{
 *   root: HTMLElement | null,
 *   titleElement: HTMLElement | null,
 *   countElement: HTMLElement | null,
 *   emptyElement: HTMLElement | null,
 *   listElement: HTMLElement | null,
 * }} elements Collection of DOM references required by the panel.
 * @returns {{
 *   applyCopy: (copy: PlayersPanelCopy) => void,
 *   showLoading: (message?: string, options?: { force?: boolean }) => void,
 *   renderSnapshot: (snapshot: PlayersSnapshot | null | undefined) => void,
 * }} Presenter API used by the application layer.
 */
export function createPlayersPanel({
  root,
  titleElement,
  countElement,
  emptyElement,
  listElement,
}) {
  if (!root || !titleElement || !countElement || !emptyElement || !listElement) {
    return createNoopPanel();
  }

  /** @type {PlayersPanelCopy} */
  let copy = createDefaultCopy();
  /** @type {PlayersSnapshot} */
  let lastSnapshot = createEmptySnapshot();
  let hasSnapshot = false;

  root.setAttribute('data-state', 'idle');

  return {
    applyCopy(update) {
      copy = { ...copy, ...sanitizeCopy(update) };
      titleElement.textContent = copy.title;
      if (!hasSnapshot) {
        showLoadingInternal();
        return;
      }
      paintSnapshot();
    },
    showLoading(message, options = {}) {
      const { force = false } = options;
      if (hasSnapshot && !force) {
        return;
      }
      hasSnapshot = false;
      lastSnapshot = createEmptySnapshot();
      const loadingMessage = message ?? copy.loading;
      emptyElement.textContent = loadingMessage;
      emptyElement.hidden = false;
      listElement.hidden = true;
      listElement.textContent = '';
      countElement.textContent = loadingMessage;
      root.setAttribute('data-state', 'loading');
    },
    renderSnapshot(snapshot) {
      lastSnapshot = normaliseSnapshot(snapshot);
      hasSnapshot = true;
      paintSnapshot();
    },
  };

  function paintSnapshot() {
    const { players, count } = lastSnapshot;
    const effectiveCount = resolveCount(count, players.length);
    countElement.textContent = copy.count(effectiveCount);

    if (players.length === 0) {
      emptyElement.textContent = copy.empty;
      emptyElement.hidden = false;
      listElement.hidden = true;
      listElement.textContent = '';
      root.setAttribute('data-state', 'empty');
      return;
    }

    emptyElement.hidden = true;
    listElement.hidden = false;
    listElement.textContent = '';
    const fragment = document.createDocumentFragment();

    for (const player of players) {
      const item = document.createElement('li');
      item.className = 'players-list__item';

      const name = document.createElement('span');
      name.className = 'players-list__name';
      name.textContent = player.name;
      item.appendChild(name);

      if (player.connectedSince) {
        const metaLabel = copy.connectedSince(player.connectedSince);
        if (metaLabel) {
          const meta = document.createElement('span');
          meta.className = 'players-list__meta';
          meta.textContent = metaLabel;
          item.appendChild(meta);
        }
      }

      fragment.appendChild(item);
    }

    listElement.appendChild(fragment);
    root.setAttribute('data-state', 'ready');
  }

  function showLoadingInternal() {
    emptyElement.textContent = copy.loading;
    emptyElement.hidden = false;
    listElement.hidden = true;
    listElement.textContent = '';
    countElement.textContent = copy.loading;
    root.setAttribute('data-state', 'loading');
  }
}

/**
 * @typedef {{
 *   players: Array<{ name: string, connectedSince?: string | undefined }>,
 *   count: number,
 * }} PlayersSnapshot
 */

/**
 * @typedef {{
 *   title: string,
 *   loading: string,
 *   empty: string,
 *   count: (count: number) => string,
 *   connectedSince: (connectedSince?: string | null) => string,
 * }} PlayersPanelCopy
 */

function createNoopPanel() {
  return {
    applyCopy: () => {},
    showLoading: () => {},
    renderSnapshot: () => {},
  };
}

/**
 * @param {PlayersSnapshot | null | undefined} snapshot
 * @returns {PlayersSnapshot}
 */
function normaliseSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return createEmptySnapshot();
  }

  const rawPlayers = Array.isArray(snapshot.players) ? snapshot.players : [];
  const players = rawPlayers
    .map((player) => {
      if (!player || typeof player !== 'object') {
        return null;
      }
      const name = typeof player.name === 'string' ? player.name.trim() : '';
      if (!name) {
        return null;
      }
      const connectedSince = typeof player.connectedSince === 'string' && player.connectedSince.length > 0
        ? player.connectedSince
        : undefined;
      return connectedSince ? { name, connectedSince } : { name };
    })
    .filter((player) => player !== null);

  const effectiveCount = resolveCount(snapshot.count, players.length);
  return { players, count: effectiveCount };
}

/**
 * @param {number | undefined} source
 * @param {number} fallback
 * @returns {number}
 */
function resolveCount(source, fallback) {
  if (typeof source === 'number' && Number.isFinite(source) && source >= 0) {
    return Math.trunc(source);
  }
  return fallback;
}

/**
 * @returns {PlayersSnapshot}
 */
function createEmptySnapshot() {
  return { players: [], count: 0 };
}

/**
 * @returns {PlayersPanelCopy}
 */
function createDefaultCopy() {
  return {
    title: '',
    loading: '',
    empty: '',
    count: (count) => String(count),
    connectedSince: () => '',
  };
}

/**
 * @param {PlayersPanelCopy} copy
 * @returns {PlayersPanelCopy}
 */
function sanitizeCopy(copy) {
  return {
    title: typeof copy.title === 'string' ? copy.title : '',
    loading: typeof copy.loading === 'string' ? copy.loading : '',
    empty: typeof copy.empty === 'string' ? copy.empty : '',
    count: typeof copy.count === 'function' ? copy.count : (count) => String(count),
    connectedSince: typeof copy.connectedSince === 'function'
      ? copy.connectedSince
      : () => '',
  };
}
