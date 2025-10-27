import { REQUEST_TIMEOUT_MS } from '../config.js';
import { performFetchRequest } from './fetchExecutor.js';
import { shouldFallbackToForm, submitViaForm } from './formTransport.js';

/**
 * Executes an HTTP request using the native Fetch API applying a configurable timeout.
 * Falls back to form submissions for CORS-restricted POST endpoints to preserve compatibility
 * with servers that do not expose the necessary headers.
 *
 * @param {Object} options Options for the request.
 * @param {string} options.path Relative path appended to the API base URL.
 * @param {'GET'|'POST'} [options.method='GET'] HTTP verb to use.
 * @param {BodyInit | null} [options.body=null] Optional body payload.
 * @param {Record<string,string>} [options.headers={}] Additional headers.
 * @param {AbortSignal} [options.signal] External abort signal.
 * @param {number} [options.timeout=REQUEST_TIMEOUT_MS] Timeout in milliseconds.
 * @returns {Promise<{ data: unknown, response: Response | undefined }>} Parsed data and response.
 */
export async function request({
  path,
  method = 'GET',
  body = null,
  headers = {},
  signal,
  timeout = REQUEST_TIMEOUT_MS,
}) {
  try {
    return await performFetchRequest({ path, method, body, headers, signal, timeout });
  } catch (error) {
    if (shouldFallbackToForm({ error, method, body, headers })) {
      return submitViaForm({ path, method, signal, timeout });
    }
    throw error;
  }
}
