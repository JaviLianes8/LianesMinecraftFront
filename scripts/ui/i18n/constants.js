/**
 * @file Provides constants used by the internationalisation layer.
 */

/**
 * Default locale applied when no explicit preference is present.
 * @type {string}
 */
export const DEFAULT_LOCALE = 'es';

/**
 * Locale used whenever lookups fail or an unsupported locale is requested.
 * @type {string}
 */
export const FALLBACK_LOCALE = 'en';

/**
 * Storage key employed to persist the user's locale preference across sessions.
 * @type {string}
 */
export const LOCALE_STORAGE_KEY = 'ui.locale';

/**
 * Collection of locale identifiers that are fully supported by the UI.
 * @type {Set<string>}
 */
export const SUPPORTED_LOCALES = new Set(['en', 'es']);
