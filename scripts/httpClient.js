import { REQUEST_TIMEOUT_MS, buildApiUrl } from './config.js';

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
 * @returns {Promise<{ data: unknown, response: Response | undefined }>} Parsed data and the original response when available.
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

async function performFetchRequest({ path, method, body, headers, signal, timeout }) {
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

function shouldFallbackToForm({ error, method, body, headers }) {
  if (!(error instanceof TypeError)) {
    return false;
  }

  if (method !== 'POST' || body !== null) {
    return false;
  }

  return Object.keys(headers || {}).length === 0;
}

function submitViaForm({ path, method, signal, timeout }) {
  return new Promise((resolve, reject) => {
    const transport = openTransportWindow();
    if (!transport) {
      reject(new HttpError('Popup window blocked while attempting the request.', 0, null));
      return;
    }

    const form = document.createElement('form');
    form.method = method;
    form.action = resolveApiUrl(path);
    form.target = transport.name;
    form.style.display = 'none';
    document.body.appendChild(form);

    let timeoutId;
    let successTimer;
    const cleanup = () => {
      clearTimeout(timeoutId);
      clearTimeout(successTimer);
      form.remove();
      if (!transport.closed) {
        transport.close();
      }
      if (abortListener && signal) {
        signal.removeEventListener('abort', abortListener);
      }
    };

    let abortListener;
    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new TimeoutError());
        return;
      }
      abortListener = () => {
        cleanup();
        reject(new TimeoutError());
      };
      signal.addEventListener('abort', abortListener, { once: true });
    }

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new TimeoutError());
    }, timeout);

    successTimer = setTimeout(() => {
      cleanup();
      resolve({ data: null, response: undefined });
    }, Math.min(timeout, 1500));

    form.submit();
  });
}

/**
 * Opens a transient window used to dispatch cross-origin form submissions when Fetch is blocked.
 *
 * @returns {Window|null} Reference to the opened window or null when the browser prevents it.
 */
function openTransportWindow() {
  if (typeof window === 'undefined' || typeof window.open !== 'function') {
    return null;
  }
  const windowName = `httpClientTransport_${Date.now()}`;
  const features = 'width=120,height=80,menubar=no,toolbar=no,location=no,status=no,scrollbars=no';
  const reference = window.open('about:blank', windowName, features);
  if (reference) {
    try {
      reference.name = windowName;
      reference.opener = null;
      reference.blur();
    } catch (error) {
      // ignore inability to adjust popup configuration
    }
  }
  return reference;
}

/**
 * Resolves the fully qualified URL for a relative API path based on the configured base URL.
 *
 * @param {string} path Relative request path supplied by service callers.
 * @returns {string} Absolute URL pointing to the remote API resource.
 */
function resolveApiUrl(path) {
  try {
    return buildApiUrl(path);
  } catch (error) {
    throw new HttpError('Unable to resolve API endpoint URL.', 0, error instanceof Error ? error.message : error);
  }
}
