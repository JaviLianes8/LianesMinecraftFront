import { InfoViewState } from '../../ui/statusPresenter.js';

/**
 * Factory producing a message service responsible for rendering contextual information.
 *
 * @param {Object} options Configuration for the service.
 * @param {HTMLElement} options.infoPanel Container where the info message is rendered.
 * @param {(descriptor: string | { key?: string, params?: Record<string, unknown>, text?: string, state?: InfoViewState }) => void} [options.onChange]
 * Optional hook called whenever a message is rendered.
 * @param {Object} dependencies External dependencies needed to format the message.
 * @param {(descriptor: string | undefined, state: InfoViewState) => void} dependencies.render
 * Renderer responsible for updating the DOM.
 * @param {(key: string, params?: Record<string, unknown>) => string} dependencies.translate Function resolving localisation keys.
 * @returns {{ render: (descriptor: unknown) => void, refresh: () => void, getLastDescriptor: () => Record<string, unknown> | null }}
 */
export function createInfoMessageService({ infoPanel, onChange }, { render, translate }) {
  let lastDescriptor = null;

  const renderInfoMessage = (descriptor) => {
    const normalised = normaliseInfoDescriptor(descriptor);
    lastDescriptor = normalised;
    const message = resolveInfoText(normalised, translate);
    const state = normalised.state ?? InfoViewState.DEFAULT;
    render(infoPanel, message, state);
    if (typeof onChange === 'function') {
      onChange(normalised);
    }
  };

  const refresh = () => {
    if (!lastDescriptor) {
      render(infoPanel, '', InfoViewState.DEFAULT);
      return;
    }
    const message = resolveInfoText(lastDescriptor, translate);
    const state = lastDescriptor.state ?? InfoViewState.DEFAULT;
    render(infoPanel, message, state);
  };

  const getLastDescriptor = () => lastDescriptor;

  return Object.freeze({ render: renderInfoMessage, refresh, getLastDescriptor });
}

function normaliseInfoDescriptor(descriptor) {
  if (!descriptor) {
    return { text: '', state: InfoViewState.DEFAULT };
  }

  if (typeof descriptor === 'string') {
    return { text: descriptor, state: InfoViewState.DEFAULT };
  }

  const { key, params, text, state = InfoViewState.DEFAULT } = descriptor;
  if (key) {
    return { key, params: params ?? {}, state };
  }

  return { text: typeof text === 'string' ? text : '', state };
}

function resolveInfoText(descriptor, translate) {
  if (descriptor.key) {
    const params = descriptor.params ? { ...descriptor.params } : undefined;
    if (params && params.descriptionKey) {
      params.description = translate(params.descriptionKey);
      delete params.descriptionKey;
    }
    return translate(descriptor.key, params);
  }

  return typeof descriptor.text === 'string' ? descriptor.text : '';
}
