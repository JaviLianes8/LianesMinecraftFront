/**
 * @file Provides a fallback guard that hides the password dialog if the session is already authorised.
 */

const CHECK_INTERVAL_MS = 16;

/**
 * Periodically verifies whether the password dialog is visible while the session is authorised and closes it.
 */
export class PasswordPromptVisibilityGuard {
  /**
   * @param {Object} options Dependencies required by the guard.
   * @param {{ isVisible: () => boolean, getScope: () => string | null, close: () => void }} options.dialog
   * Dialog controller used to inspect and close the overlay.
   * @param {(scope: string) => boolean} options.isScopeAuthorised Callback checking in-memory authorisation state.
   * @param {number} [options.intervalMs] Optional custom interval between checks.
   */
  constructor({ dialog, isScopeAuthorised, intervalMs = CHECK_INTERVAL_MS }) {
    this.dialog = dialog;
    this.isScopeAuthorised = isScopeAuthorised;
    this.intervalMs = intervalMs;
    this.intervalId = null;
  }

  /**
   * Starts the guard loop that closes the dialog when the session remains authorised.
   *
   * @returns {void}
   */
  start() {
    if (this.intervalId !== null) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.evaluateVisibility();
    }, this.intervalMs);
  }

  /**
   * Stops the guard loop if it is currently running.
   *
   * @returns {void}
   */
  stop() {
    if (this.intervalId === null) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  /**
   * Closes the dialog when the active scope is already authorised.
   *
   * @returns {void}
   */
  evaluateVisibility() {
    if (!this.dialog?.isVisible?.()) {
      return;
    }

    const scope = this.dialog?.getScope?.();
    if (!scope) {
      return;
    }

    if (this.isScopeAuthorised(scope)) {
      this.dialog?.close?.();
    }
  }
}
