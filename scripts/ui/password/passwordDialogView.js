/**
 * @file Provides a presentation-focused controller for the password dialog overlay.
 */

/**
 * Manages the DOM representation of the password dialog, keeping UI responsibilities isolated from behaviour.
 */
export class PasswordDialogView {
  /**
   * @param {Object} elements DOM nodes composing the password overlay.
   * @param {HTMLElement} elements.overlay Overlay container element.
   * @param {HTMLFormElement} elements.form Form element capturing password submissions.
   * @param {HTMLInputElement} elements.input Input element holding the password value.
   * @param {HTMLElement} elements.error Error message node displayed under the input.
   * @param {HTMLElement} elements.title Title element describing the dialog purpose.
   * @param {HTMLElement} elements.description Paragraph describing the current flow.
   * @param {HTMLElement} elements.label Label associated with the password input.
   * @param {HTMLButtonElement} elements.submit Primary action button used to confirm the password.
   * @param {HTMLButtonElement} elements.cancel Secondary action button cancelling the dialog.
   */
  constructor({
    overlay,
    form,
    input,
    error,
    title,
    description,
    label,
    submit,
    cancel,
  }) {
    this.overlay = overlay;
    this.form = form;
    this.input = input;
    this.error = error;
    this.title = title;
    this.description = description;
    this.label = label;
    this.submit = submit;
    this.cancel = cancel;
  }

  /**
   * Displays the overlay and prepares the form for user interaction.
   */
  show() {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.overlay.hidden = false;
      this.overlay.removeAttribute('hidden');
    }
    document.body.setAttribute('data-password-dialog-active', 'true');
    this.clearError();
    this.focusInput();
  }

  /**
   * Hides the overlay from the viewport and restores the scroll behaviour.
   */
  hide() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.overlay.hidden = true;
      this.overlay.setAttribute('hidden', '');
    }
    document.body.removeAttribute('data-password-dialog-active');
  }

  /**
   * Updates all textual elements of the dialog in a single operation.
   *
   * @param {Object} texts Copy to be rendered inside the dialog elements.
   * @param {string} texts.title Title text displayed as heading.
   * @param {string} texts.description Description text rendered beneath the title.
   * @param {string} texts.label Label associated with the input.
   * @param {string} texts.submitLabel Text for the primary button.
   * @param {string} texts.cancelLabel Text for the cancel button.
   */
  renderTexts({ title, description, label, submitLabel, cancelLabel }) {
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
    }

    if (this.cancel) {
      this.cancel.textContent = cancelLabel;
    }
  }

  /**
   * Enables or disables interactive controls to represent busy states.
   *
   * @param {boolean} busy Indicates whether the dialog is processing a request.
   */
  setBusy(busy) {
    const isBusy = Boolean(busy);
    if (this.submit) {
      this.submit.disabled = isBusy;
    }

    if (this.cancel) {
      this.cancel.disabled = isBusy;
    }

    if (this.input) {
      this.input.readOnly = isBusy;
    }

    if (isBusy) {
      this.form?.setAttribute('aria-busy', 'true');
    } else {
      this.form?.removeAttribute('aria-busy');
    }
  }

  /**
   * Writes an error message below the input field.
   *
   * @param {string} message Localised string describing the validation issue.
   */
  setError(message) {
    if (!this.error) {
      return;
    }

    this.error.textContent = message;
    this.error.removeAttribute('hidden');
  }

  /**
   * Clears the current error message.
   */
  clearError() {
    if (!this.error) {
      return;
    }

    this.error.textContent = '';
    this.error.setAttribute('hidden', '');
  }

  /**
   * Clears the password input value.
   */
  resetInput() {
    if (!this.input) {
      return;
    }

    this.input.value = '';
  }

  /**
   * Focuses the password input when the dialog opens.
   */
  focusInput() {
    if (!this.input) {
      return;
    }

    requestAnimationFrame(() => {
      this.input?.focus();
    });
  }
}
