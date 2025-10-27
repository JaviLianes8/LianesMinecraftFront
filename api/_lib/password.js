import { createHash, timingSafeEqual } from 'crypto';

/**
 * Compares the provided password with the expected secret using constant-time comparison.
 *
 * @param {string} provided Password provided by the requester.
 * @param {string} expected Secret stored in the environment.
 * @returns {boolean} Whether the passwords match.
 */
export function isPasswordValid(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') {
    return false;
  }

  if (expected.length === 0) {
    return false;
  }

  const providedHash = createHash('sha256').update(provided, 'utf8').digest();
  const expectedHash = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(providedHash, expectedHash);
}
