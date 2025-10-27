import { buildApiUrl } from '../config.js';
import { HttpError } from './errors.js';

/**
 * Resolves the fully qualified URL for a relative API path based on the configured base URL.
 *
 * @param {string} path Relative request path supplied by service callers.
 * @returns {string} Absolute URL pointing to the remote API resource.
 */
export function resolveApiUrl(path) {
  try {
    return buildApiUrl(path);
  } catch (error) {
    throw new HttpError(
      'Unable to resolve API endpoint URL.',
      0,
      error instanceof Error ? error.message : error,
    );
  }
}
