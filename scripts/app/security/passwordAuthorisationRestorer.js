/**
 * @file Restores remembered password authorisations using stored hashes.
 */

const RESTORE_RETRY_DELAY_MS = 50;
const RESTORE_MAX_ATTEMPTS = 20;

/**
 * Coordinates the restoration of persisted password authorisations before prompting the user.
 */
export class PasswordAuthorisationRestorer {
  /**
   * @param {Object} options Dependencies required to evaluate stored sessions.
   * @param {import('./passwordSession.js').PasswordSession} options.session Session persistence service.
   * @param {import('./passwordVerifier.js').PasswordVerifier} options.verifier Password verifier exposing expected hashes.
   * @param {Set<string>} options.authorisedScopes Mutable set tracking authorised scopes in memory.
   */
  constructor({ session, verifier, authorisedScopes }) {
    this.session = session;
    this.verifier = verifier;
    this.authorisedScopes = authorisedScopes;
    this.pendingPromise = null;
  }

  /**
   * Initiates the restoration process, scheduling retries when the configuration is not yet available.
   *
   * @returns {void}
   */
  initialise() {
    const restoration = this.restoreRememberedScopes();
    const wrapped = restoration.finally(() => {
      if (this.pendingPromise === wrapped) {
        this.pendingPromise = null;
      }
    });
    this.pendingPromise = wrapped;
  }

  /**
   * Waits for the restoration process to complete when a session has been remembered.
   *
   * @returns {Promise<void>} Resolves once the restoration workflow has finished.
   */
  async waitForCompletion() {
    if (!this.pendingPromise) {
      return;
    }

    await this.pendingPromise;
  }

  async restoreRememberedScopes() {
    const stored = this.session?.getAuthorisedSnapshot?.();
    if (!stored) {
      return;
    }

    const unresolved = [];

    Object.entries(stored).forEach(([scope, storedHash]) => {
      if (!storedHash) {
        return;
      }

      const resolved = this.tryApplyStoredScope(scope, storedHash);
      if (!resolved) {
        unresolved.push({ scope, hash: storedHash });
      }
    });

    if (!unresolved.length) {
      return;
    }

    await this.retryRestore(unresolved);
  }

  /**
   * Attempts to validate and apply a stored authorisation for the provided scope.
   *
   * @param {string} scope Scope identifier being restored.
   * @param {string} storedHash Persisted hash retrieved from the session store.
   * @returns {boolean} True when the stored scope has been handled (applied or cleared).
   */
  tryApplyStoredScope(scope, storedHash) {
    const expectedHash = this.verifier.getExpectedHash(scope);
    if (!expectedHash) {
      return false;
    }

    if (storedHash === expectedHash) {
      this.authorisedScopes.add(scope);
      return true;
    }

    if (this.session?.clearAuthorised) {
      this.session.clearAuthorised(scope);
    }

    return true;
  }

  /**
   * Retries the restoration of stored scopes until their configuration becomes available.
   *
   * @param {{ scope: string, hash: string }[]} entries Pending scope entries awaiting validation.
   * @returns {Promise<void>} Resolves once every scope has been handled or retries have been exhausted.
   */
  async retryRestore(entries) {
    const attempts = Math.max(RESTORE_MAX_ATTEMPTS, 1);
    let remaining = entries;

    for (let attempt = 0; attempt < attempts && remaining.length > 0; attempt += 1) {
      await delay(RESTORE_RETRY_DELAY_MS);
      remaining = remaining.filter((entry) => !this.tryApplyStoredScope(entry.scope, entry.hash));
    }

    if (remaining.length > 0) {
      const failedScopes = remaining.map((entry) => entry.scope).join(', ');
      console.warn(`Unable to validate stored password authorisations for scopes: ${failedScopes}`);
    }
  }
}

/**
 * Creates a promise that resolves after the requested number of milliseconds.
 *
 * @param {number} milliseconds Time to wait before resolving.
 * @returns {Promise<void>} Promise resolving after the delay elapses.
 */
function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
