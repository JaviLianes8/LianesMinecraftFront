import { ServerLifecycleState } from '../../services/serverService.js';
import { StatusViewState, renderStatus } from '../../ui/statusPresenter.js';
import { translate as defaultTranslate } from '../../ui/i18n.js';
/**
 * Coordinates the state of the dashboard control buttons and the status indicator.
 */
export class ControlPanelPresenter {
  /**
   * @param {Object} dom Collection of DOM nodes used by the presenter.
   * @param {HTMLButtonElement} dom.statusButton Button displaying the server status.
   * @param {HTMLButtonElement} dom.startButton Button used to start the server.
   * @param {HTMLButtonElement} dom.stopButton Button used to stop the server.
   * @param {SVGElement} dom.torchSvg Decorative SVG representing the torch holder.
   * @param {SVGElement} dom.flame Decorative SVG representing the flame element.
   * @param {Object} [dependencies] Optional configuration overrides.
   * @param {(key: string, params?: Record<string, unknown>) => string} [dependencies.translate]
   * Translator function used to resolve localisation keys.
   */
  constructor({ statusButton, startButton, stopButton, torchSvg, flame }, dependencies = {}) {
    this.statusButton = statusButton;
    this.startButton = startButton;
    this.stopButton = stopButton;
    this.torchSvg = torchSvg;
    this.flame = flame;
    this.translate = dependencies.translate ?? defaultTranslate;
    this.defaultButtonLabels = new Map();
  }

  /**
   * Prepares the status indicator by setting ARIA attributes and default tooltip.
   */
  prepareStatusIndicator() {
    if (!this.statusButton) {
      return;
    }

    this.statusButton.setAttribute('type', 'button');
    this.statusButton.setAttribute('disabled', 'true');
    this.statusButton.setAttribute('aria-disabled', 'true');
    this.updateButtonTooltip(this.statusButton, this.translate('info.status.readOnly'));
  }

  /**
   * Stores the default labels for the start and stop buttons to allow later restoration.
   */
  cacheDefaultButtonLabels() {
    if (this.startButton) {
      this.defaultButtonLabels.set(this.startButton, this.startButton.textContent.trim());
    }
    if (this.stopButton) {
      this.defaultButtonLabels.set(this.stopButton, this.stopButton.textContent.trim());
    }
  }

  /**
   * Reapplies the correct busy labels after a locale change.
   */
  refreshBusyButtonLabels() {
    const updateLabel = (button) => {
      if (!button || button.dataset.loading !== 'true') {
        return;
      }
      const key = button.dataset.busyLabelKey || 'ui.controls.generic.busy';
      button.textContent = this.translate(key);
    };

    updateLabel(this.startButton);
    updateLabel(this.stopButton);
  }

  /**
   * Updates the busy state of the status button so that assistive technologies are informed.
   *
   * @param {boolean} value Whether the status button should be marked as busy.
   */
  setStatusBusy(value) {
    if (!this.statusButton) {
      return;
    }
    this.statusButton.setAttribute('aria-busy', value ? 'true' : 'false');
  }

  /**
   * Applies a visual status view using the shared status renderer.
   *
   * @param {StatusViewState | ServerLifecycleState} state Status to display.
   */
  applyStatusView(state) {
    if (!this.statusButton) {
      return;
    }
    renderStatus(this.statusButton, this.torchSvg, this.flame, state);
  }

  /**
   * Updates all control buttons based on the latest lifecycle state and busy flag.
   *
   * @param {Object} options Control options.
   * @param {boolean} options.busy Whether an action is currently being processed.
   * @param {boolean} options.statusEligible Whether lifecycle-dependent actions are allowed.
   * @param {ServerLifecycleState | StatusViewState} options.lifecycleState Current lifecycle state.
   */
  updateAvailability({ busy, statusEligible, lifecycleState }) {
    if (!this.statusButton || !this.startButton || !this.stopButton) {
      return;
    }

    this.statusButton.setAttribute('disabled', 'true');
    this.statusButton.setAttribute('aria-disabled', 'true');
    this.updateButtonTooltip(this.statusButton, this.translate('info.status.readOnly'));

    const startDisabled =
      busy || !statusEligible || lifecycleState !== ServerLifecycleState.OFFLINE;
    this.updateControlButtonState({
      button: this.startButton,
      disabled: startDisabled,
      tooltip: this.resolveStartTooltip({ busy, statusEligible, lifecycleState }),
    });

    const stopDisabled =
      busy || !statusEligible || lifecycleState !== ServerLifecycleState.ONLINE;
    this.updateControlButtonState({
      button: this.stopButton,
      disabled: stopDisabled,
      tooltip: this.resolveStopTooltip({ busy, statusEligible, lifecycleState }),
    });
  }

  /**
   * Marks a specific button as busy and returns a disposer restoring its default state.
   *
   * @param {HTMLButtonElement} button Button instance to decorate.
   * @param {string} [busyLabelKey='ui.controls.generic.busy'] Localisation key for the busy label.
   * @returns {() => void} Function restoring the previous label and ARIA attributes.
   */
  setControlButtonBusy(button, busyLabelKey = 'ui.controls.generic.busy') {
    if (!button) {
      return () => {};
    }

    const key = busyLabelKey || 'ui.controls.generic.busy';
    const label = this.translate(key);
    button.dataset.loading = 'true';
    button.dataset.busyLabelKey = key;
    button.setAttribute('aria-busy', 'true');
    button.textContent = label;

    return () => {
      delete button.dataset.loading;
      delete button.dataset.busyLabelKey;
      button.setAttribute('aria-busy', 'false');
      const defaultLabel = this.defaultButtonLabels.get(button);
      if (defaultLabel) {
        button.textContent = defaultLabel;
        return;
      }
      button.textContent = this.translate('ui.controls.generic.busy');
    };
  }

  updateControlButtonState({ button, disabled, tooltip }) {
    if (!button) {
      return;
    }
    button.toggleAttribute('disabled', disabled);
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    this.updateButtonTooltip(button, tooltip);
  }

  resolveStartTooltip({ busy, statusEligible, lifecycleState }) {
    if (busy) {
      return this.translate('info.busy');
    }
    if (!statusEligible || lifecycleState !== ServerLifecycleState.OFFLINE) {
      return this.translate('info.start.requireOffline');
    }
    return null;
  }

  resolveStopTooltip({ busy, statusEligible, lifecycleState }) {
    if (busy) {
      return this.translate('info.busy');
    }
    if (!statusEligible || lifecycleState !== ServerLifecycleState.ONLINE) {
      return this.translate('info.stop.requireOnline');
    }
    return null;
  }

  updateButtonTooltip(button, message) {
    if (!button) {
      return;
    }
    if (message) {
      button.title = message;
    } else {
      button.removeAttribute('title');
    }
  }
}
