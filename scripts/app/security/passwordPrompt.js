/**
 * @file Coordinates password-based authorisation flows for the dashboard.
 */

import { getPasswordAuthorisationCache } from './passwordAuthorisationCache.js';
import { createPasswordVerifier } from './passwordVerifier.js';
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
   * @param {import('./passwordAuthorisationCache.js').PasswordAuthorisationCache} [options.authorisationCache]
   * Cache managing persisted authorisations.
   */
  constructor({
    dialog,
    translate,
    verifier = createPasswordVerifier(),
    authorisationCache = getPasswordAuthorisationCache(),
  }) {
    this.dialog = dialog;
    this.translate = translate;
    this.verifier = verifier;
    this.authorisationCache = authorisationCache;
    this.authorisedScopes = new Set();
    this.cachedAuthorisationsReady = this.syncAuthorisedScopes();
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
    await this.cachedAuthorisationsReady;
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
        const result = await this.verifier.verify({ scope, password });
        if (result.authorised) {
          this.authorisedScopes.add(scope);
          if (remember) {
            await this.authorisationCache?.persistScope?.(scope, password);
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

  /**
   * Synchronises the in-memory authorised scopes with the persisted cache.
   *
   * @returns {Promise<void>} Completion promise once cached credentials are verified.
   */
  async syncAuthorisedScopes() {
    try {
      const cacheEntries = await this.authorisationCache?.loadAuthorisedScopes?.();
      if (!cacheEntries || typeof cacheEntries[Symbol.iterator] !== 'function') {
        return;
      }

      for (const [scope, password] of cacheEntries) {
        if (typeof scope !== 'string' || scope.length === 0) {
          continue;
        }

        try {
          const result = await this.verifier.verify({ scope, password });
          if (result.authorised) {
            this.authorisedScopes.add(scope);
          } else {
            this.authorisationCache?.clearScope?.(scope);
          }
        } catch (error) {
          console.error('Password verification failed during cache sync', error);
          this.authorisationCache?.clearScope?.(scope);
        }
      }
    } catch (error) {
      console.error('Unable to sync password authorisations', error);
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
