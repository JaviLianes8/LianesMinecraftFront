import { HttpError, TimeoutError } from './errors.js';
import { resolveApiUrl } from './urlResolver.js';

/**
 * Determines if the client should fall back to form submission transport.
 *
 * @param {Object} options Context information describing the failure.
 * @param {unknown} options.error Error thrown by the fetch layer.
 * @param {'GET'|'POST'} options.method HTTP verb originally requested.
 * @param {BodyInit | null} options.body Body payload passed to the request.
 * @param {Record<string,string>} options.headers Headers forwarded to the request.
 * @returns {boolean} Whether the form-based fallback should be attempted.
 */
export function shouldFallbackToForm({ error, method, body, headers }) {
  if (!(error instanceof TypeError)) {
    return false;
  }

  if (method !== 'POST' || body !== null) {
    return false;
  }

  return Object.keys(headers || {}).length === 0;
}

/**
 * Performs the HTTP request using a transient HTML form when Fetch is blocked.
 *
 * @param {Object} options Parameters required to execute the fallback submission.
 * @param {string} options.path Relative API path resolved against the base URL.
 * @param {'POST'} options.method HTTP verb to use; only POST is supported in this pathway.
 * @param {AbortSignal} [options.signal] External abort signal to honour.
 * @param {number} options.timeout Timeout in milliseconds before aborting the fallback.
 * @returns {Promise<{ data: null, response: undefined }>} Promise resolving after submission.
 */
export function submitViaForm({ path, method, signal, timeout }) {
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
