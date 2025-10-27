/**
 * @file Provides a reusable dialog controller for password prompts.
 */

/**
 * UI component responsible for handling the password overlay dialog.
 */
export class PasswordDialog {
  /**
   * @param {Object} dom DOM references used to control the dialog.
   * @param {HTMLElement} dom.overlay Overlay container element.
   * @param {HTMLFormElement} dom.form Form element wrapping the password field.
   * @param {HTMLInputElement} dom.input Password input control.
   * @param {HTMLElement} dom.error Error message container.
   * @param {HTMLElement} dom.title Title element displayed at the top of the dialog.
   * @param {HTMLElement} dom.description Description text providing context.
   * @param {HTMLElement} dom.label Label associated with the password input.
   * @param {HTMLButtonElement} dom.submit Submit button triggering verification.
   * @param {HTMLButtonElement} dom.cancel Cancel button closing the dialog.
   */
  constructor({ overlay, form, input, error, title, description, label, submit, cancel }) {
    this.overlay = overlay;
    this.form = form;
    this.input = input;
    this.error = error;
    this.title = title;
    this.description = description;
    this.label = label;
    this.submit = submit;
    this.cancel = cancel;

    this.pendingResolver = null;
    this.activeScope = null;

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleCancel = this.handleCancel.bind(this);

    this.form?.addEventListener('submit', this.handleSubmit);
    this.cancel?.addEventListener('click', this.handleCancel);
  }

  /**
   * Opens the dialog with the provided textual content.
   *
   * @param {Object} options Options controlling the rendered content.
   * @param {string} options.scope Scope identifier associated with the prompt.
   * @param {string} options.title Localised title to display.
   * @param {string} options.description Localised description displayed below the title.
   * @param {string} options.label Localised label for the input field.
   * @param {string} options.submitLabel Localised label for the submit button.
   * @returns {Promise<string | null>} Resolves with the entered password or null if cancelled.
   */
  open({ scope, title, description, label, submitLabel, cancelLabel }) {
    this.activeScope = scope;
    this.updateTexts({ title, description, label, submitLabel, cancelLabel });
    this.setError('');
    this.setBusy(false);
    this.clearInput();
    if (this.cancel) {
      const hideCancel = scope === 'start';
      this.cancel.hidden = hideCancel;
      this.cancel.setAttribute('aria-hidden', hideCancel ? 'true' : 'false');
      this.cancel.disabled = hideCancel;
    }

    if (this.overlay) {
      this.overlay.hidden = false;
      this.overlay.setAttribute('aria-hidden', 'false');
    }

    if (typeof document !== 'undefined') {
      document.body?.setAttribute('data-password-dialog-active', 'true');
    }

    if (this.input) {
      requestAnimationFrame(() => this.input?.focus());
    }

    return new Promise((resolve) => {
      this.pendingResolver = resolve;
    });
  }

  /**
   * Updates the currently visible texts without recreating the dialog.
   *
   * @param {Object} options New text values for the dialog.
   * @param {string} options.title Localised title.
   * @param {string} options.description Localised description.
   * @param {string} options.label Localised input label.
   * @param {string} options.submitLabel Localised submit button label.
   */
  updateTexts({ title, description, label, submitLabel, cancelLabel }) {
    if (this.title) {
      this.title.textContent = title;
    }
    if (this.description) {
      this.description.textContent = description;
    }
    if (this.label) {
      this.label.textContent = label;
    }
    if (this.submit) {
      this.submit.textContent = submitLabel;
      this.submit.setAttribute('aria-label', submitLabel);
    }
    if (this.cancel) {
      const labelText = cancelLabel ?? '';
      this.cancel.textContent = labelText;
      this.cancel.setAttribute('aria-label', labelText);
    }
  }

  /**
   * Hides the dialog and clears the pending resolver.
   */
  close() {
    if (this.overlay) {
      this.overlay.hidden = true;
      this.overlay.setAttribute('aria-hidden', 'true');
    }

    if (typeof document !== 'undefined') {
      document.body?.removeAttribute('data-password-dialog-active');
    }

    const resolver = this.pendingResolver;
    this.pendingResolver = null;
    this.activeScope = null;
    this.clearInput();

    if (typeof resolver === 'function') {
      resolver(null);
    }
  }

  /**
   * Displays an error message within the dialog.
   *
   * @param {string} message Localised error message.
   */
  setError(message) {
    if (this.error) {
      this.error.textContent = message;
      this.error.hidden = !message;
    }
  }

  /**
   * Enables or disables the input controls while an async operation is pending.
   *
   * @param {boolean} value True to disable the controls, false to enable them.
   */
  setBusy(value) {
    if (this.input) {
      this.input.disabled = value;
    }
    if (this.submit) {
      this.submit.disabled = value;
    }
    if (this.cancel) {
      this.cancel.disabled = value;
    }
  }

  /**
   * Clears the current password value from the input field.
   */
  clearInput() {
    if (this.input) {
      this.input.value = '';
    }
  }

  /**
   * Indicates whether the dialog is currently visible.
   *
   * @returns {boolean} True when the dialog is displayed.
   */
  isVisible() {
    return Boolean(this.overlay && !this.overlay.hidden);
  }

  /**
   * Retrieves the scope currently associated with the dialog.
   *
   * @returns {string | null} Active scope identifier.
   */
  getScope() {
    return this.activeScope;
  }

  handleSubmit(event) {
    event.preventDefault();
    if (typeof this.pendingResolver !== 'function') {
      return;
    }
    this.pendingResolver(this.input?.value ?? '');
  }

  handleCancel(event) {
    event.preventDefault();
    if (!this.isVisible()) {
      return;
    }
    this.close();
  }
}
