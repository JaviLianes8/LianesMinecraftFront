import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_TOKEN_TTL_MS = 15 * 60 * 1000;
const TOKEN_SECRET_ENV = 'CONTROL_TOKEN_SECRET';
const TOKEN_TTL_ENV = 'CONTROL_TOKEN_TTL_MS';

function resolveTokenSecret() {
  const secret = process.env[TOKEN_SECRET_ENV];
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('CONTROL_TOKEN_SECRET must be configured.');
  }
  return secret;
}

function resolveTokenTtl() {
  const rawTtl = process.env[TOKEN_TTL_ENV];
  if (!rawTtl) {
    return DEFAULT_TOKEN_TTL_MS;
  }

  const parsed = Number(rawTtl);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TOKEN_TTL_MS;
  }

  return parsed;
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function signPayload(payloadJson, secret) {
  return createHmac('sha256', secret).update(payloadJson).digest();
}

function normaliseScope(scope) {
  return typeof scope === 'string' && scope.length > 0 ? scope : '';
}

export function createAuthToken({ scope }) {
  const tokenScope = normaliseScope(scope);
  if (!tokenScope) {
    throw new Error('Token scope is required.');
  }

  const secret = resolveTokenSecret();
  const issuedAt = Date.now();
  const ttl = resolveTokenTtl();
  const expiresAt = issuedAt + ttl;
  const payload = { scope: tokenScope, issuedAt, expiresAt };
  const payloadJson = JSON.stringify(payload);
  const signature = signPayload(payloadJson, secret).toString('base64url');
  const token = `${encodePayload(payload)}.${signature}`;

  return { token, expiresAt };
}

export function verifyAuthToken({ token, scope }) {
  const tokenScope = normaliseScope(scope);
  if (!tokenScope) {
    return { valid: false, reason: 'invalid_scope' };
  }

  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, reason: 'missing_token' };
  }

  const segments = token.split('.');
  if (segments.length !== 2) {
    return { valid: false, reason: 'malformed_token' };
  }

  const [encodedPayload, encodedSignature] = segments;

  let payloadJson;
  try {
    payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch (error) {
    return { valid: false, reason: 'invalid_encoding' };
  }

  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch (error) {
    return { valid: false, reason: 'invalid_payload' };
  }

  const secret = resolveTokenSecret();

  let providedSignature;
  try {
    providedSignature = Buffer.from(encodedSignature, 'base64url');
  } catch (error) {
    return { valid: false, reason: 'invalid_signature' };
  }

  const expectedSignature = signPayload(payloadJson, secret);
  if (
    providedSignature.length !== expectedSignature.length
    || !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return { valid: false, reason: 'signature_mismatch' };
  }

  if (payload.scope !== tokenScope) {
    return { valid: false, reason: 'scope_mismatch' };
  }

  if (typeof payload.expiresAt !== 'number') {
    return { valid: false, reason: 'missing_expiry' };
  }

  if (payload.expiresAt < Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, expiresAt: payload.expiresAt };
}

export { TOKEN_SECRET_ENV, TOKEN_TTL_ENV };
