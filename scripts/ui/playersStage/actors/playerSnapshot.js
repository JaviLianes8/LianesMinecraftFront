import { DEFAULT_NAME } from '../constants.js';

/**
 * Normalises incoming player data to ensure unique identifiers and sanitised names.
 *
 * @param {any[] | null | undefined} players Raw player data.
 * @returns {{ id: string, name: string }[]} Player snapshot array.
 */
export function normalisePlayers(players) {
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

/**
 * Builds a deterministic identifier for a player based on name and connection time.
 *
 * @param {any} player Raw player information.
 * @param {number} index Position within the source array.
 * @returns {string} Stable identifier key.
 */
export function resolvePlayerIdentifier(player, index) {
  const baseName = typeof player?.name === 'string' ? player.name.trim().toLowerCase() : DEFAULT_NAME.toLowerCase();
  const since = typeof player?.connected_since === 'string' ? player.connected_since : '';
  if (since) {
    return `${baseName || DEFAULT_NAME.toLowerCase()}::${since}`;
  }
  return `${baseName || DEFAULT_NAME.toLowerCase()}::${index}`;
}

/**
 * Sanitises a player name, providing a fallback when the value is missing or blank.
 *
 * @param {any} name Candidate name value.
 * @returns {string} Sanitised name.
 */
export function sanitiseName(name) {
  if (!name || typeof name !== 'string') {
    return DEFAULT_NAME;
  }
  const trimmed = name.trim();
  return trimmed.length === 0 ? DEFAULT_NAME : trimmed;
}
