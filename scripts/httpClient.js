import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config.js';

/**
 * Error raised when the API responds with a non-successful status code.
 */
export class HttpError extends Error {
  /**
   * @param {string} message Human readable error description.
   * @param {number} status HTTP status code received from the server.
   * @param {unknown} payload Body returned by the server, parsed when possible.
   */
  constructor(message, status, payload) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Error raised when the HTTP layer aborts a request because the timeout elapsed.
 */
export class TimeoutError extends Error {
  constructor(message = 'Request aborted due to timeout.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Executes an HTTP request using the native Fetch API applying a configurable timeout.
 *
 * @param {Object} options Options for the request.
 * @param {string} options.path Relative path appended to the API base URL.
 * @param {'GET'|'POST'} [options.method='GET'] HTTP verb to use.
 * @param {BodyInit | null} [options.body=null] Optional body payload.
 * @param {Record<string,string>} [options.headers={}] Additional headers.
 * @param {AbortSignal} [options.signal] External abort signal.
 * @param {number} [options.timeout=REQUEST_TIMEOUT_MS] Timeout in milliseconds.
 * @returns {Promise<{ data: unknown, response: Response }>} Parsed data and the original response.
 */
export async function request({
  path,
  method = 'GET',
  body = null,
  headers = {},
  signal,
  timeout = REQUEST_TIMEOUT_MS,
}) {
  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      const abortListener = () => controller.abort();
      signal.addEventListener('abort', abortListener, { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
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
  }
}
