/**
 * @file Public API for UI internationalisation. Delegates specialised responsibilities to dedicated modules to
 *       preserve single-responsibility boundaries.
 */

import { persistLocalePreference } from './i18n/storage.js';
import { normaliseLocale } from './i18n/localeNormalizer.js';
import { resolveInitialLocale } from './i18n/initialLocaleResolver.js';
import { resolveTemplate, renderTemplate } from './i18n/messageResolver.js';

let activeLocale = resolveInitialLocale();

/**
 * Retrieves the locale that is currently active in the UI layer.
 *
 * @returns {string} BCP-47 identifier of the active locale.
 */
export function getActiveLocale() {
  return activeLocale;
}

/**
 * Forces the UI layer to use the provided locale when rendering text. The preference is persisted so that subsequent
 * visits reuse the same locale.
 *
 * @param {string} locale Desired locale identifier.
 * @returns {string} Normalised locale currently in use.
 */
export function setLocale(locale) {
  activeLocale = normaliseLocale(locale);
  persistLocalePreference(activeLocale);
  return activeLocale;
}

/**
 * Resolves a human-readable string for the given key using the active locale.
 *
 * @param {string} key Translation key registered in the catalogue.
 * @param {Record<string, unknown>} [params] Optional placeholder values.
 * @returns {string} Rendered string ready to be injected into the DOM.
 */
export function translate(key, params = {}) {
  const template = resolveTemplate(activeLocale, key);
  if (!template) {
    return key;
  }

  return renderTemplate(template, params);
}
