/**
 * @file Resolves the initial locale preference considering query parameters, persistence and defaults.
 */

import { DEFAULT_LOCALE } from './constants.js';
import { normaliseLocale } from './localeNormalizer.js';
import { readLocaleFromQuery } from './queryLocaleReader.js';
import { loadPersistedLocale, persistLocalePreference } from './storage.js';

/**
 * Determines the first locale to use when the UI initialises.
 *
 * @returns {string} Supported locale identifier.
 */
export function resolveInitialLocale() {
  const queryLocale = readLocaleFromQuery();
  if (queryLocale) {
    const normalisedQueryLocale = normaliseLocale(queryLocale);
    persistLocalePreference(normalisedQueryLocale);
    return normalisedQueryLocale;
  }

  const persisted = loadPersistedLocale();
  if (persisted) {
    return normaliseLocale(persisted);
  }

  return normaliseLocale(DEFAULT_LOCALE);
}
