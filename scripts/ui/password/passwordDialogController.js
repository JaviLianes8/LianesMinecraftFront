/**
 * @file Implements the behavioural logic for the password dialog while relying on a view abstraction.
 */

import { PasswordDialogView } from './passwordDialogView.js';

/**
 * Coordinates dialog interactions, abstracting business flows from DOM manipulation.
 */
export class PasswordDialogController {
  /**
   * @param {Object} elements DOM elements used to construct the dialog view.
   */
  constructor(elements) {
    this.view = new PasswordDialogView(elements);
    this.activeScope = null;
    this.resolvePromise = null;
    this.boundHandleSubmit = (event) => this.handleSubmit(event);
    this.boundHandleCancel = () => this.handleCancel();
    this.attachEventListeners(elements);
  }

  /**
   * Opens the dialog with the provided copy and waits for user confirmation.
   *
   * @param {Object} options Configuration for the dialog appearance.
   * @param {string} options.scope Identifier of the permission being requested.
   * @param {string} options.title Localised title rendered at the top of the dialog.
   * @param {string} options.description Descriptive text explaining the action.
   * @param {string} options.label Label associated with the password input field.
   * @param {string} options.submitLabel Text displayed in the primary button.
   * @param {string} options.cancelLabel Text displayed in the cancellation button.
   * @returns {Promise<string|null>} Resolves with the provided password or null when cancelled.
   */
  open({ scope, title, description, label, submitLabel, cancelLabel }) {
    this.activeScope = scope;
    this.view.renderTexts({ title, description, label, submitLabel, cancelLabel });
    this.view.resetInput();
    this.view.show();
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  /**
   * Closes the dialog immediately without resolving the pending promise.
   */
  close() {
    this.view.hide();
    this.view.resetInput();
    this.activeScope = null;
    this.resolvePromise = null;
  }

  /**
   * Informs callers whether the dialog is currently displayed.
   *
   * @returns {boolean} True when the overlay is visible.
   */
  isVisible() {
    return !this.view.overlay?.hasAttribute('hidden');
  }

  /**
   * Returns the scope that originated the current dialog session.
   *
   * @returns {string|null} Scope identifier or null when no session is active.
   */
  getScope() {
    return this.activeScope;
  }

  /**
   * Toggles the busy state in the UI.
   *
   * @param {boolean} busy Whether the dialog should present as busy.
   */
  setBusy(busy) {
    this.view.setBusy(busy);
  }

  /**
   * Injects an error message into the view.
   *
   * @param {string} message Localised message to display.
   */
  setError(message) {
    this.view.setError(message);
  }

  /**
   * Clears the input value so a new attempt can be made.
   */
  clearInput() {
    this.view.resetInput();
  }

  /**
   * Updates the copy currently rendered while the dialog remains open.
   *
   * @param {Object} texts Text fragments to display.
   */
  updateTexts(texts) {
    this.view.renderTexts(texts);
  }

  /**
   * Releases resources used by the dialog, removing event listeners.
   */
  destroy() {
    this.detachEventListeners();
    this.resolvePromise = null;
    this.activeScope = null;
  }

  /**
   * Attaches core listeners to handle form submission and cancellation.
   *
   * @param {Object} elements Original DOM references employed during construction.
   */
  attachEventListeners({ form, cancel }) {
    form?.addEventListener('submit', this.boundHandleSubmit);
    cancel?.addEventListener('click', this.boundHandleCancel);
  }

  /**
   * Removes listeners when the controller is destroyed.
   */
  detachEventListeners() {
    this.view.form?.removeEventListener('submit', this.boundHandleSubmit);
    this.view.cancel?.removeEventListener('click', this.boundHandleCancel);
  }

  handleSubmit(event) {
    event.preventDefault();
    const password = this.view.input?.value ?? '';
    if (!this.resolvePromise) {
      return;
    }

    const resolve = this.resolvePromise;
    this.resolvePromise = null;
    resolve(password);
  }

  handleCancel() {
    this.view.resetInput();
    if (!this.resolvePromise) {
      return;
    }

    const resolve = this.resolvePromise;
    this.resolvePromise = null;
    resolve(null);
  }
}

/**
 * Factory helper producing a dialog controller for the provided DOM references.
 *
 * @param {Object} dom DOM references assembled by the UI bootstrapper.
 * @returns {PasswordDialogController} Configured controller instance.
 */
export function createPasswordDialog(dom) {
  return new PasswordDialogController({
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
}
