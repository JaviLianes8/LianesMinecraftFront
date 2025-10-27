/**
 * Reads and parses a JSON body from a Node.js IncomingMessage.
 *
 * @param {import('http').IncomingMessage} req HTTP request instance.
 * @returns {Promise<Record<string, unknown>>} Parsed JSON payload.
 */
export async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (raw.length === 0) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const parsingError = new Error('Invalid JSON payload.');
    parsingError.cause = error;
    throw parsingError;
  }
}

/**
 * Sends a JSON response with the provided status code and payload.
 *
 * @param {import('http').ServerResponse} res HTTP response instance.
 * @param {number} statusCode HTTP status code.
 * @param {Record<string, unknown>} body Serializable payload.
 */
export function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * Responds with a 405 Method Not Allowed status and the list of allowed methods.
 *
 * @param {import('http').ServerResponse} res HTTP response instance.
 * @param {string[]} allowed List of allowed HTTP methods.
 */
export function sendMethodNotAllowed(res, allowed) {
  if (Array.isArray(allowed) && allowed.length > 0) {
    res.setHeader('Allow', allowed.join(', '));
  }
  sendJson(res, 405, { error: 'Method Not Allowed' });
}
