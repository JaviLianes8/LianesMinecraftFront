/**
 * @file Coordinates password-based authorisation flows for the dashboard.
 */

import { createPasswordVerifier } from './passwordVerifier.js';
import { createPasswordSession } from './passwordSession.js';
import { createPasswordDialog } from '../../ui/password/passwordDialogController.js';

const RESTORE_RETRY_DELAY_MS = 50;
const RESTORE_MAX_ATTEMPTS = 20;

/**
 * High-level orchestrator managing password prompts for protected actions.
 */
export class PasswordPrompt {
  /**
   * @param {Object} options Configuration for the password prompt flow.
   * @param {import('../../ui/password/passwordDialogController.js').PasswordDialogController} options.dialog
   * Dialog controller responsible for UI interactions.
   * @param {(key: string) => string} options.translate Translation function resolving message keys.
   * @param {import('./passwordVerifier.js').PasswordVerifier} [options.verifier] Optional password verifier.
   * @param {import('./passwordSession.js').PasswordSession} [options.session] Optional password session handler.
   */
  constructor({ dialog, translate, verifier = createPasswordVerifier(), session = createPasswordSession() }) {
    this.dialog = dialog;
    this.translate = translate;
    this.verifier = verifier;
    this.session = session;
    this.authorisedScopes = new Set();
    this.restorationPromise = this.restoreStoredAuthorisations().catch((error) => {
      console.warn('Failed to restore remembered password authorisations', error);
    });
  }

  /**
   * Ensures the start scope has been authorised, requesting a password if needed.
   *
   * @returns {Promise<boolean>} Resolves to true when access is granted.
   */
  async ensureStartAccess() {
    return this.ensureScope('start', { remember: true });
  }

  /**
   * Ensures the stop scope has been authorised, requesting a password if needed.
   *
   * @returns {Promise<boolean>} Resolves to true when access is granted.
   */
  async ensureStopAccess() {
    return this.ensureScope('stop');
  }

  /**
   * Refreshes the dialog texts when the locale changes while the overlay is visible.
   */
  refreshActiveTexts() {
    if (!this.dialog?.isVisible()) {
      return;
    }

    const scope = this.dialog.getScope();
    if (!scope) {
      return;
    }

    this.dialog.updateTexts(this.buildTextsForScope(scope));
  }

  async ensureScope(scope, { remember = false } = {}) {
    try {
      await this.waitForRestoration();
    } catch (error) {
      console.warn('Failed to restore remembered password authorisations', error);
    }

    if (this.isScopeAuthorised(scope)) {
      if (this.dialog?.isVisible?.()) {
        this.dialog.close();
      }
      return true;
    }

    while (true) {
      const texts = this.buildTextsForScope(scope);
      const password = await this.dialog.open({ scope, ...texts });

      if (password === null) {
        return false;
      }

      try {
        this.dialog.setBusy(true);
        const result = await this.verifier.verify({ scope, password });
        if (result.authorised) {
          this.markScopeAuthorised(scope, {
            remember,
            hash: result.scopeHash,
            secret: remember ? password : '',
          });
          this.dialog.close();
          return true;
        }
        this.dialog.setError(this.translate('ui.password.error.invalid'));
      } catch (error) {
        console.error('Password verification failed', error);
        this.dialog.setError(this.translate('ui.password.error.generic'));
      } finally {
        this.dialog.setBusy(false);
        this.dialog.clearInput();
      }
    }
  }

  buildTextsForScope(scope) {
    const titleKey = `ui.password.${scope}.title`;
    const descriptionKey = `ui.password.${scope}.description`;
    return {
      title: this.translate(titleKey),
      description: this.translate(descriptionKey),
      label: this.translate('ui.password.label'),
      submitLabel: this.translate('ui.password.submit'),
      cancelLabel: this.translate('ui.password.cancel'),
    };
  }

  isScopeAuthorised(scope) {
    if (this.authorisedScopes.has(scope)) {
      return true;
    }

    const expectedHash = this.verifier.getExpectedHash(scope);
    if (this.session?.isAuthorised(scope, expectedHash)) {
      this.authorisedScopes.add(scope);
      return true;
    }

    return false;
  }

  markScopeAuthorised(scope, { remember, hash, secret }) {
    this.authorisedScopes.add(scope);
    if (remember) {
      this.session?.markAuthorised(scope, { hash, secret });
    }
  }

  async waitForRestoration() {
    if (!this.restorationPromise) {
      return;
    }

    await this.restorationPromise;
  }

  async restoreStoredAuthorisations() {
    const snapshot = this.session?.getAuthorisedSnapshot?.();
    if (!snapshot) {
      return;
    }

    const entries = Object.entries(snapshot)
      .map(([scope, entry]) => ({ scope, entry }))
      .filter(({ entry }) => Boolean(entry?.hash || entry?.secret));

    if (!entries.length) {
      return;
    }

    await this.retryRestore(entries);
  }

  async retryRestore(entries) {
    let remaining = entries;

    for (let attempt = 0; attempt < RESTORE_MAX_ATTEMPTS && remaining.length > 0; attempt += 1) {
      const results = await Promise.all(
        remaining.map(async ({ scope, entry }) => ({
          scope,
          entry,
          handled: await this.tryRestoreScope(scope, entry),
        })),
      );

      remaining = results.filter((result) => !result.handled).map((result) => ({
        scope: result.scope,
        entry: result.entry,
      }));

      if (remaining.length > 0) {
        await delay(RESTORE_RETRY_DELAY_MS);
      }
    }

    if (remaining.length > 0) {
      const failedScopes = remaining.map((item) => item.scope).join(', ');
      console.warn(`Unable to validate stored password authorisations for scopes: ${failedScopes}`);
    }
  }

  async tryRestoreScope(scope, entry) {
    const expectedHash = this.verifier.getExpectedHash(scope);
    if (!expectedHash) {
      return false;
    }

    if (entry.hash && entry.hash === expectedHash) {
      this.authorisedScopes.add(scope);
      return true;
    }

    if (entry.secret) {
      try {
        const result = await this.verifier.verify({ scope, password: entry.secret });
        if (result.authorised) {
          this.markScopeAuthorised(scope, {
            remember: true,
            hash: result.scopeHash,
            secret: entry.secret,
          });
          return true;
        }
      } catch (error) {
        console.warn(`Failed to validate stored password secret for scope: ${scope}`, error);
      }
    }

    this.session?.clearAuthorised?.(scope);
    return true;
  }
}

/**
 * Factory helper creating a password prompt instance using DOM references.
 *
 * @param {Object} dom DOM references required by the dialog.
 * @param {(key: string) => string} translate Translation function.
 * @returns {PasswordPrompt} Configured prompt controller.
 */
export function createPasswordPrompt(dom, translate) {
  const dialog = createPasswordDialog(dom);
  return new PasswordPrompt({ dialog, translate });
}

/**
 * Creates a promise that resolves after the provided number of milliseconds.
 *
 * @param {number} milliseconds Delay applied before resolving the promise.
 * @returns {Promise<void>} Promise settling after the timeout elapses.
 */
function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
