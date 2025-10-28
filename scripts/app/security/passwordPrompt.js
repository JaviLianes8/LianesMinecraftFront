/**
 * @file Coordinates password-based authorisation flows for the dashboard.
 */

import { createPasswordVerifier } from './passwordVerifier.js';
import { createPasswordSession } from './passwordSession.js';
import { PasswordAuthorisationRestorer } from './passwordAuthorisationRestorer.js';
import { createPasswordDialog } from '../../ui/password/passwordDialogController.js';

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
    this.authorisationRestorer = new PasswordAuthorisationRestorer({
      session: this.session,
      verifier: this.verifier,
      authorisedScopes: this.authorisedScopes,
    });
    this.authorisationRestorer.initialise();
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
      await this.authorisationRestorer.waitForCompletion();
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
          this.markScopeAuthorised(scope, { remember, hash: result.scopeHash });
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

  markScopeAuthorised(scope, { remember, hash }) {
    this.authorisedScopes.add(scope);
    if (remember) {
      this.session?.markAuthorised(scope, hash);
    }
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
