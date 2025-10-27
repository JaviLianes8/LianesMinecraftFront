const MODAL_TRANSITION_MS = 200;

/**
 * Controls presentation logic for the installation helper modal.
 */
export class InstallationModalController {
  /**
   * @param {Object} dom DOM nodes used by the modal.
   * @param {HTMLElement} dom.installModal Modal container element.
   * @param {HTMLElement} dom.installHelpButton Button triggering the modal.
   * @param {HTMLElement} dom.installModalCloseButton Button closing the modal.
   * @param {HTMLElement} dom.installModalOverlay Overlay closing the modal when clicked.
   */
  constructor(dom) {
    this.dom = dom;
  }

  /**
   * Prepares event listeners and accessibility attributes.
   */
  initialise() {
    const { installModal, installHelpButton, installModalCloseButton, installModalOverlay } =
      this.dom;

    if (!installModal || !installHelpButton) {
      return;
    }

    if (!installHelpButton.hasAttribute('aria-expanded')) {
      installHelpButton.setAttribute('aria-expanded', 'false');
    }

    installHelpButton.addEventListener('click', () => this.open());

    if (installModalCloseButton) {
      installModalCloseButton.addEventListener('click', () => this.close());
    }

    if (installModalOverlay) {
      installModalOverlay.addEventListener('click', () => this.close());
    }

    document.addEventListener('keydown', (event) => this.handleModalKeydown(event));
  }

  /**
   * Reveals the modal using CSS transitions when available.
   */
  open() {
    const { installModal, installHelpButton, installModalCloseButton } = this.dom;
    if (!installModal) {
      return;
    }

    if (installHelpButton) {
      installHelpButton.setAttribute('aria-expanded', 'true');
    }

    installModal.removeAttribute('hidden');

    const presentModal = () => {
      installModal.classList.add('modal--visible');
      installModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      if (installModalCloseButton) {
        installModalCloseButton.focus();
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(presentModal);
      return;
    }

    presentModal();
  }

  /**
   * Hides the modal preserving accessibility focus handling.
   */
  close() {
    const { installModal, installHelpButton } = this.dom;
    if (!installModal) {
      return;
    }

    if (installHelpButton) {
      installHelpButton.setAttribute('aria-expanded', 'false');
    }

    installModal.classList.remove('modal--visible');
    installModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    if (installHelpButton) {
      installHelpButton.focus();
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const hideModal = () => {
      installModal.setAttribute('hidden', '');
    };

    if (prefersReducedMotion) {
      hideModal();
      return;
    }

    const scheduleHide =
      typeof window !== 'undefined' && typeof window.setTimeout === 'function'
        ? window.setTimeout.bind(window)
        : setTimeout;

    scheduleHide(() => {
      if (!installModal.classList.contains('modal--visible')) {
        hideModal();
      }
    }, MODAL_TRANSITION_MS);
  }

  handleModalKeydown(event) {
    const { installModal } = this.dom;
    if (event.key === 'Escape' && installModal?.classList.contains('modal--visible')) {
      this.close();
    }
  }
}
