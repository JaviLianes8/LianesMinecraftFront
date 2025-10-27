import { readJsonBody, sendJson, sendMethodNotAllowed } from '../_lib/http.js';
import { isPasswordValid } from '../_lib/password.js';

/**
 * Factory that returns an authentication handler bound to the specified environment variable.
 *
 * @param {{ envVar: string }} options Configuration for the handler.
 * @param {string} options.envVar Name of the environment variable storing the password.
 * @returns {(req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>} Handler.
 */
export function createPasswordHandler({ envVar }) {
  if (!envVar) {
    throw new Error('envVar must be provided.');
  }

  return async function handler(req, res) {
    if (req.method !== 'POST') {
      sendMethodNotAllowed(res, ['POST']);
      return;
    }

    const expected = process.env[envVar];
    if (typeof expected !== 'string' || expected.length === 0) {
      sendJson(res, 500, { error: 'Secret not configured.' });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid JSON payload.' });
      return;
    }

    const password = typeof body.password === 'string' ? body.password : '';
    if (!isPasswordValid(password, expected)) {
      sendJson(res, 401, { success: false });
      return;
    }

    sendJson(res, 200, { success: true });
  };
}
