/**
 * @file Normalisation routines for locale identifiers.
 */

import { FALLBACK_LOCALE, SUPPORTED_LOCALES } from './constants.js';

/**
 * Ensures that the provided locale resolves to one of the supported identifiers.
 *
 * @param {string} locale Locale value supplied by the consumer.
 * @returns {string} Supported locale identifier.
 */
export function normaliseLocale(locale) {
  if (!locale || typeof locale !== 'string') {
    return FALLBACK_LOCALE;
  }

  const lower = locale.toLowerCase();
  if (SUPPORTED_LOCALES.has(lower)) {
    return lower;
  }

  const base = lower.split('-')[0];
  if (SUPPORTED_LOCALES.has(base)) {
    return base;
  }

  return FALLBACK_LOCALE;
}
