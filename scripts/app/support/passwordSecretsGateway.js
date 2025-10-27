/**
 * @file Exposes a gateway to access password hashes injected at build time.
 */

const DEFAULT_SECRETS = Object.freeze({
  start: { hash: '', salt: '' },
  stop: { hash: '', salt: '' },
});

/**
 * Retrieves the password secrets provided through the runtime configuration script.
 *
 * @returns {{ start: { hash: string, salt: string }, stop: { hash: string, salt: string } }}
 * Normalised secrets collection.
 */
export function getPasswordSecrets() {
  const runtimeConfig = globalThis.__PASSWORD_CONFIG__;
  if (!runtimeConfig) {
    console.warn('Password runtime configuration is missing.');
    return DEFAULT_SECRETS;
  }

  return {
    start: normaliseEntry(runtimeConfig.start),
    stop: normaliseEntry(runtimeConfig.stop),
  };
}

function normaliseEntry(entry) {
  if (!entry) {
    return { hash: '', salt: '' };
  }

  return {
    hash: typeof entry.hash === 'string' ? entry.hash : '',
    salt: typeof entry.salt === 'string' ? entry.salt : '',
  };
}
