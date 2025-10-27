import { translate as t } from '../../ui/i18n.js';

/**
 * Standardises the password prompt flow returning a normalised outcome.
 * @param {Object} options - Configuration for the prompt execution.
 * @param {Function} options.verifyPassword - Asynchronous verification callback.
 * @param {{ initial: string, retry: string }} options.promptKeys - Localised prompt keys.
 * @param {string} options.invalidMessageKey - Translation key displayed on invalid attempts.
 * @param {string} [options.loggerContext] - Context label appended to error logs.
 * @param {Function} [options.promptFn] - Prompt implementation (defaults to `window.prompt`).
 * @param {Function} [options.alertFn] - Alert implementation (defaults to `window.alert`).
 * @returns {Promise<'granted' | 'cancelled' | 'error' | 'skipped'>} Outcome status.
 */
export async function requestPasswordAuthorisation({
  verifyPassword,
  promptKeys,
  invalidMessageKey,
  loggerContext = 'password',
  promptFn = typeof window !== 'undefined' ? window.prompt?.bind(window) : undefined,
  alertFn = typeof window !== 'undefined' ? window.alert?.bind(window) : undefined,
}) {
  if (typeof promptFn !== 'function' || typeof verifyPassword !== 'function') {
    return 'skipped';
  }

  let attempts = 0;
  while (true) {
    const promptKey = attempts === 0 ? promptKeys.initial : promptKeys.retry;
    const input = promptFn(t(promptKey), '');
    if (input === null) {
      return 'cancelled';
    }

    const candidate = input.trim();
    if (!candidate) {
      alertFn?.(t('auth.error.empty'));
      attempts += 1;
      continue;
    }

    try {
      const verified = await verifyPassword(candidate);
      if (verified) {
        return 'granted';
      }
      alertFn?.(t(invalidMessageKey));
    } catch (error) {
      console.error(`Unable to verify ${loggerContext}`, error);
      alertFn?.(t('auth.error.unavailable'));
      return 'error';
    }

    attempts += 1;
  }
}
