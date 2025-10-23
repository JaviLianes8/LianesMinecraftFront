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
    const iframe = ensureSandboxIframe();
    const form = document.createElement('form');
    form.method = method;
    form.action = `${API_BASE_URL}${path}`;
    form.target = iframe.name;
    form.style.display = 'none';
    document.body.appendChild(form);

    let timeoutId;
    let errorListener;
    const cleanup = () => {
      clearTimeout(timeoutId);
      form.remove();
      iframe.removeEventListener('load', handleLoad);
      if (errorListener) {
        iframe.removeEventListener('error', errorListener);
      }
      if (abortListener && signal) {
        signal.removeEventListener('abort', abortListener);
      }
    };

    const handleLoad = () => {
      cleanup();
      resolve({ data: null, response: undefined });
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

    iframe.addEventListener('load', handleLoad, { once: true });
    errorListener = () => {
      cleanup();
      reject(new HttpError('Request failed when submitted via form fallback.', 0, null));
    };
    iframe.addEventListener('error', errorListener, { once: true });
    form.submit();
  });
}

let sandboxIframe;

function ensureSandboxIframe() {
  if (!sandboxIframe) {
    sandboxIframe = document.createElement('iframe');
    sandboxIframe.name = `httpClientSandbox_${Date.now()}`;
    sandboxIframe.setAttribute('aria-hidden', 'true');
    sandboxIframe.style.display = 'none';
    document.body.appendChild(sandboxIframe);
  }
  return sandboxIframe;
}
