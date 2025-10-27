import { ServerLifecycleState } from '../../services/serverService.js';
import { InfoViewState } from '../../ui/statusPresenter.js';

/**
 * Resolves lifecycle states to the appropriate info message descriptors.
 *
 * @param {ServerLifecycleState | string} state Lifecycle state returned by the API.
 * @returns {{ key: string, state: InfoViewState }} Descriptor representing the state.
 */
export function resolveLifecycleInfo(state) {
  if (state === ServerLifecycleState.ONLINE) {
    return { key: 'info.online', state: InfoViewState.SUCCESS };
  }
  if (state === ServerLifecycleState.OFFLINE) {
    return { key: 'info.offline', state: InfoViewState.SUCCESS };
  }
  if (state === ServerLifecycleState.ERROR) {
    return { key: 'info.error', state: InfoViewState.ERROR };
  }
  return { key: 'info.unknown', state: InfoViewState.PENDING };
}
