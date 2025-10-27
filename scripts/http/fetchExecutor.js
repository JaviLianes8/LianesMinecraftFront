import { HttpError, TimeoutError } from './errors.js';
import { resolveApiUrl } from './urlResolver.js';

/**
 * Executes an HTTP request through Fetch applying timeout and response parsing policies.
 *
 * @param {Object} options Configuration for the fetch operation.
 * @param {string} options.path Relative API path resolved against the base URL.
 * @param {'GET'|'POST'} options.method HTTP verb to use when calling the endpoint.
 * @param {BodyInit | null} options.body Optional body payload forwarded to fetch.
 * @param {Record<string,string>} options.headers Additional headers forwarded to fetch.
 * @param {AbortSignal} [options.signal] External abort signal to cascade.
 * @param {number} options.timeout Timeout in milliseconds before aborting the request.
 * @returns {Promise<{ data: unknown, response: Response }>} Parsed data and the original response.
 */
export async function performFetchRequest({ path, method, body, headers, signal, timeout }) {
  const controller = new AbortController();
  let abortListener;
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      abortListener = () => controller.abort();
      signal.addEventListener('abort', abortListener, { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const endpoint = resolveApiUrl(path);
    const response = await fetch(endpoint, {
      method,
      body,
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/')) {
      data = await response.text();
    } else {
      data = await response.arrayBuffer();
    }

    if (!response.ok) {
      throw new HttpError(`Request failed with status ${response.status}`, response.status, data);
    }

    return { data, response };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (abortListener && signal) {
      signal.removeEventListener('abort', abortListener);
    }
  }
}
