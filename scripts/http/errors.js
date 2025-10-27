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
