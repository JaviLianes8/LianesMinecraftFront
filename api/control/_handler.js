import { sendJson, sendMethodNotAllowed } from '../_lib/http.js';
import { verifyAuthToken } from '../_lib/token.js';

const DEFAULT_REMOTE_BASE_URL = 'http://naseevvee.duckdns.org:8000/api/server/';
const REMOTE_BASE_ENV = 'REMOTE_SERVER_BASE_URL';

function resolveRemoteBaseUrl() {
  const configured = process.env[REMOTE_BASE_ENV];
  if (typeof configured === 'string' && configured.length > 0) {
    return configured.endsWith('/') ? configured : `${configured}/`;
  }
  return DEFAULT_REMOTE_BASE_URL;
}

function buildRemoteUrl(path) {
  const sanitisedPath = typeof path === 'string' ? path.replace(/^\//, '') : '';
  return new URL(sanitisedPath, resolveRemoteBaseUrl()).toString();
}

function extractBearerToken(req) {
  const header = req.headers?.authorization;
  const rawValue = Array.isArray(header) ? header[0] : header;
  if (typeof rawValue !== 'string') {
    return '';
  }

  const trimmed = rawValue.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return trimmed.slice(7).trim();
}

async function proxyRemoteRequest({ url, method }) {
  const response = await fetch(url, { method, redirect: 'follow' });
  const bodyBuffer = await response.arrayBuffer();
  return { response, body: Buffer.from(bodyBuffer) };
}

export function createControlHandler({ scope, remotePath, method = 'POST' }) {
  if (!scope) {
    throw new Error('scope must be provided.');
  }

  if (!remotePath) {
    throw new Error('remotePath must be provided.');
  }

  return async function controlHandler(req, res) {
    if (req.method !== method) {
      sendMethodNotAllowed(res, [method]);
      return;
    }

    const token = extractBearerToken(req);
    const verification = verifyAuthToken({ token, scope });
    if (!verification.valid) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const url = buildRemoteUrl(remotePath);

    try {
      const { response, body } = await proxyRemoteRequest({ url, method });
      res.statusCode = response.status;
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      res.setHeader('Cache-Control', 'no-store');
      res.end(body);
    } catch (error) {
      console.error('Unable to proxy control request.', error);
      sendJson(res, 502, { error: 'Upstream request failed.' });
    }
  };
}

export { REMOTE_BASE_ENV };
