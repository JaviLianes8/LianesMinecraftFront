/**
 * @file Coordinates password-based authorisation flows for the dashboard.
 */

import { PasswordDialog } from '../../ui/passwordDialog.js';
import { createPasswordAuthoriser } from '../../services/security/passwordAuthoriser.js';

/**
 * High-level orchestrator managing password prompts for protected actions.
 */
export class PasswordPrompt {
  /**
   * @param {Object} options Configuration for the password prompt flow.
   * @param {PasswordDialog} options.dialog Dialog controller responsible for UI interactions.
   * @param {(key: string) => string} options.translate Translation function resolving message keys.
   * @param {import('../../services/security/passwordAuthoriser.js').PasswordAuthoriser} [options.authoriser]
   * Optional custom authoriser implementation.
   */
  constructor({ dialog, translate, authoriser = createPasswordAuthoriser() }) {
    this.dialog = dialog;
    this.translate = translate;
    this.authoriser = authoriser;
    this.authorisedScopes = new Set();
  }

  /**
   * Ensures the start scope has been authorised, requesting a password if needed.
   *
   * @returns {Promise<boolean>} Resolves to true when access is granted.
   */
  async ensureStartAccess() {
    return this.ensureScope('start');
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

  async ensureScope(scope) {
    if (this.authorisedScopes.has(scope)) {
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
        const result = await this.authoriser.verify({ scope, password });
        if (result.authorised) {
          if (scope === 'start') {
            this.authorisedScopes.add(scope);
          }
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
}

/**
 * Factory helper creating a password prompt instance using DOM references.
 *
 * @param {Object} dom DOM references required by the dialog.
 * @param {HTMLElement} dom.passwordOverlay Overlay container.
 * @param {HTMLFormElement} dom.passwordForm Password form element.
 * @param {HTMLInputElement} dom.passwordInput Password input element.
 * @param {HTMLElement} dom.passwordError Error message element.
 * @param {HTMLElement} dom.passwordTitle Dialog title element.
 * @param {HTMLElement} dom.passwordDescription Dialog description element.
 * @param {HTMLElement} dom.passwordLabel Input label element.
 * @param {HTMLButtonElement} dom.passwordSubmit Submit button element.
 * @param {HTMLButtonElement} dom.passwordCancel Cancel button element.
 * @param {(key: string) => string} translate Translation function.
 * @returns {PasswordPrompt} Configured prompt controller.
 */
export function createPasswordPrompt(dom, translate) {
  const dialog = new PasswordDialog({
    overlay: dom.passwordOverlay,
    form: dom.passwordForm,
    input: dom.passwordInput,
    error: dom.passwordError,
    title: dom.passwordTitle,
    description: dom.passwordDescription,
    label: dom.passwordLabel,
    submit: dom.passwordSubmit,
    cancel: dom.passwordCancel,
  });

  return new PasswordPrompt({ dialog, translate });
}
