/**
 * @file Retrieves locale information exposed through the location query string.
 */

/**
 * Reads the "lang" query parameter from the current window location.
 *
 * @returns {string|null} Locale identifier from the query string when available.
 */
export function readLocaleFromQuery() {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return null;
  }

  const { search } = window.location;
  if (typeof search !== 'string' || search.length === 0) {
    return null;
  }

  try {
    const params = new URLSearchParams(search);
    return params.get('lang');
  } catch (error) {
    console.error('Unable to parse locale from query string', error);
    return null;
  }
}
