/**
 * @file Persists and retrieves locale preferences from localStorage when available.
 */

import { LOCALE_STORAGE_KEY } from './constants.js';

/**
 * Extracts the stored locale preference if persistence is available.
 *
 * @returns {string|null} Locale identifier stored previously or null when missing.
 */
export function loadPersistedLocale() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read locale preference from storage', error);
    return null;
  }
}

/**
 * Persists the locale preference for future visits, ignoring failures silently.
 *
 * @param {string} locale Locale identifier to persist.
 * @returns {void}
 */
export function persistLocalePreference(locale) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn('Unable to persist locale preference', error);
  }
}
