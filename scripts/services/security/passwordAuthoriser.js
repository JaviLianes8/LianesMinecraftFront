/**
 * @file Provides client-side utilities to verify protected actions against the password API.
 */

const DEFAULT_ENDPOINT = '/api/auth';

/**
 * Exchanges a password for authorisation of a protected scope.
 */
export class PasswordAuthoriser {
  /**
   * @param {Object} [options] Optional configuration overrides.
   * @param {string} [options.endpoint] Absolute or relative path to the password API.
   * @param {typeof fetch} [options.fetchImplementation] Custom fetch function for testing.
   */
  constructor({ endpoint = DEFAULT_ENDPOINT, fetchImplementation = fetch } = {}) {
    this.endpoint = endpoint;
    this.fetch = fetchImplementation;
  }

  /**
   * Verifies the provided password for the desired scope.
   *
   * @param {Object} options Verification options.
   * @param {'start'|'stop'} options.scope Scope identifier requesting verification.
   * @param {string} options.password Password entered by the operator.
   * @returns {Promise<{ authorised: boolean }>} Authorisation result.
   */
  async verify({ scope, password }) {
    const response = await this.fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scope, password }),
    });

    if (response.status === 401) {
      return { authorised: false };
    }

    if (!response.ok) {
      throw new Error(`Password verification failed with status ${response.status}`);
    }

    const payload = await response.json();
    return { authorised: Boolean(payload?.authorised) };
  }
}

/**
 * Factory function creating a password authoriser with default settings.
 *
 * @returns {PasswordAuthoriser} Configured authoriser instance.
 */
export function createPasswordAuthoriser() {
  return new PasswordAuthoriser();
}
