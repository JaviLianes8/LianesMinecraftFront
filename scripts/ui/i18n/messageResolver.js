/**
 * @file Looks up translation templates and interpolates placeholder tokens.
 */

import { FALLBACK_LOCALE } from './constants.js';
import { MESSAGES } from './messages/index.js';

/**
 * Resolves a translation template for the provided locale and key, using the fallback catalogue when required.
 *
 * @param {string} locale Supported locale identifier.
 * @param {string} key Translation key requested by the UI.
 * @returns {string|undefined} Template string when found.
 */
export function resolveTemplate(locale, key) {
  const localeMessages = MESSAGES[locale] ?? MESSAGES[FALLBACK_LOCALE];
  const fallbackMessages = MESSAGES[FALLBACK_LOCALE];
  return localeMessages[key] ?? fallbackMessages[key];
}

/**
 * Interpolates placeholder tokens in the provided template using the given parameters.
 *
 * @param {string} template Translation template to render.
 * @param {Record<string, unknown>} params Parameters supplied by the caller.
 * @returns {string} Rendered message ready for display.
 */
export function renderTemplate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      const value = params[token];
      return value != null ? String(value) : '';
    }
    return match;
  });
}
