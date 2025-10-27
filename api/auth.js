import { timingSafeEqual } from 'node:crypto';

const START_PASSWORD = process.env.START_PASSWORD ?? '';
const STOP_PASSWORD = process.env.STOP_PASSWORD ?? '';

/**
 * Compares two strings using a timing-safe algorithm.
 *
 * @param {string} actual Actual value supplied by the requester.
 * @param {string} expected Secret value stored in the environment.
 * @returns {boolean} True when both inputs match exactly.
 */
function isPasswordValid(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

/**
 * Serverless function handling password verification requests for start and stop actions.
 *
 * @param {import('http').IncomingMessage} req Incoming HTTP request.
 * @param {import('http').ServerResponse} res Outgoing HTTP response.
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let payload = {};

  if (typeof req.body === 'string') {
    try {
      payload = JSON.parse(req.body);
    } catch (error) {
      payload = {};
    }
  } else if (typeof req.body === 'object' && req.body !== null) {
    payload = req.body;
  }

  const { scope, password } = payload;

  if (scope !== 'start' && scope !== 'stop') {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid scope' }));
    return;
  }

  const expectedPassword = scope === 'start' ? START_PASSWORD : STOP_PASSWORD;

  if (!expectedPassword) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Password not configured' }));
    return;
  }

  if (!isPasswordValid(password, expectedPassword)) {
    res.statusCode = 401;
    res.end(JSON.stringify({ authorised: false }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ authorised: true }));
}
