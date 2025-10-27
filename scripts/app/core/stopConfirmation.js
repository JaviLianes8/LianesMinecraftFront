import { translate as t } from '../../ui/i18n.js';

/**
 * Requests user confirmation before issuing a stop command.
 *
 * @returns {boolean} Whether the stop action has been confirmed.
 */
export function confirmStopAction() {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    return true;
  }

  const firstConfirmation = window.confirm(t('confirm.stop.first'));
  if (!firstConfirmation) {
    return false;
  }

  return window.confirm(t('confirm.stop.second'));
}
