import { HttpError, TimeoutError } from '../../http/errors.js';
import { translate as t } from '../../ui/i18n.js';

/**
 * Maps thrown errors to translation descriptors understood by the info presenter.
 *
 * @param {unknown} error Error thrown by a network operation.
 * @returns {{ key: string, params?: Record<string, unknown>, state?: InfoViewState }} Descriptor ready for translation.
 */
export function describeError(error) {
  if (error && typeof error === 'object' && error.code === 'AUTH_MISSING_TOKEN') {
    return { key: 'error.auth.missingToken' };
  }

  if (error instanceof TimeoutError) {
    return { key: 'error.timeout' };
  }

  if (error instanceof HttpError) {
    const descriptionKey = describeHttpStatusKey(error.status);
    if (descriptionKey) {
      return {
        key: 'error.httpWithDescription',
        params: { status: error.status, descriptionKey },
      };
    }
    return { key: 'error.httpGeneric', params: { status: error.status } };
  }

  if (error instanceof TypeError) {
    return { key: 'error.network' };
  }

  return { key: 'error.generic' };
}

function describeHttpStatusKey(status) {
  if (typeof status !== 'number' || Number.isNaN(status) || status <= 0) {
    return '';
  }
  const key = `http.${status}`;
  const translation = t(key);
  return translation === key ? '' : key;
}
