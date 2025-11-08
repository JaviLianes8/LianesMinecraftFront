import {
  computePrice,
  formatCurrency,
  formatDistance,
  formatDuration,
  formatKilometres,
  listTariffs,
} from './priceCalculator.js';
import { buildGoogleMapsLink, requestRoute } from './routeService.js';

/**
 * @param {HTMLElement} root
 */
export function createRouteCalculator(root) {
  const elements = queryElements(root);
  if (!elements) {
    return null;
  }

  populateTariffs(elements.tariffSelect);

  const state = {
    lastResult: null,
    lastInputs: null,
  };

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSubmit(elements, state).catch((error) => {
      console.error('[route] Unexpected submission error', error);
    });
  });

  elements.retryButton.addEventListener('click', () => {
    hideError(elements);
    elements.originInput.focus();
  });

  return {
    reset: () => resetCalculator(elements, state),
  };
}

/**
 * @param {HTMLElement} root
 */
function queryElements(root) {
  const originInput = root.querySelector('[data-role="route-origin"]');
  const destinationInput = root.querySelector('[data-role="route-destination"]');
  const tariffSelect = root.querySelector('[data-role="route-tariff"]');
  const scheduledCheckbox = root.querySelector('[data-role="route-scheduled"]');
  const form = root.querySelector('[data-role="route-form"]');
  const submitButton = root.querySelector('[data-role="route-submit"]');
  const status = root.querySelector('[data-role="route-status"]');
  const result = root.querySelector('[data-role="route-result"]');
  const error = root.querySelector('[data-role="route-error"]');
  const errorMessage = root.querySelector('[data-role="route-error-message"]');
  const errorMapsLink = root.querySelector('[data-role="route-error-open-maps"]');
  const retryButton = root.querySelector('[data-role="route-retry"]');
  const resultOrigin = root.querySelector('[data-role="route-origin-label"]');
  const resultDestination = root.querySelector('[data-role="route-destination-label"]');
  const resultDistanceReal = root.querySelector('[data-role="route-distance-real"]');
  const resultDistanceBillable = root.querySelector('[data-role="route-distance-billable"]');
  const resultDuration = root.querySelector('[data-role="route-duration"]');
  const resultPrice = root.querySelector('[data-role="route-price"]');
  const resultTariff = root.querySelector('[data-role="route-tariff-label"]');
  const supplementRow = root.querySelector('[data-role="route-supplement-row"]');
  const supplementValue = root.querySelector('[data-role="route-supplement"]');
  const cacheInfo = root.querySelector('[data-role="route-cache-info"]');
  const instructionsContainer = root.querySelector('[data-role="route-instructions"]');
  const instructionsList = root.querySelector('[data-role="route-instructions-list"]');
  const mapsLink = root.querySelector('[data-role="route-open-maps"]');

  if (!(
    originInput &&
    destinationInput &&
    tariffSelect &&
    scheduledCheckbox &&
    form &&
    submitButton &&
    status &&
    result &&
    error &&
    errorMessage &&
    errorMapsLink &&
    retryButton &&
    resultOrigin &&
    resultDestination &&
    resultDistanceReal &&
    resultDistanceBillable &&
    resultDuration &&
    resultPrice &&
    resultTariff &&
    supplementRow &&
    supplementValue &&
    cacheInfo &&
    instructionsContainer &&
    instructionsList &&
    mapsLink
  )) {
    console.warn('[route] Missing DOM nodes. Route calculator disabled.');
    return null;
  }

  return {
    originInput,
    destinationInput,
    tariffSelect,
    scheduledCheckbox,
    form,
    submitButton,
    status,
    result,
    error,
    errorMessage,
    errorMapsLink,
    retryButton,
    resultOrigin,
    resultDestination,
    resultDistanceReal,
    resultDistanceBillable,
    resultDuration,
    resultPrice,
    resultTariff,
    supplementRow,
    supplementValue,
    cacheInfo,
    instructionsContainer,
    instructionsList,
    mapsLink,
  };
}

function populateTariffs(select) {
  const tariffs = listTariffs();
  select.innerHTML = '';
  for (const tariff of tariffs) {
    const option = document.createElement('option');
    option.value = tariff.id;
    option.textContent = `${tariff.label} (${tariff.ratePerKm.toFixed(2)} €/km)`;
    select.append(option);
  }
}

async function handleSubmit(elements, state) {
  const origin = elements.originInput.value.trim();
  const destination = elements.destinationInput.value.trim();

  if (!origin || !destination) {
    showError(elements, 'Debes indicar origen y destino.', {
      origin,
      destination,
    });
    return;
  }

  hideError(elements);
  hideResult(elements);
  setStatus(elements, 'Calculando ruta…');
  setLoading(elements, true);

  state.lastInputs = { origin, destination };

  try {
    const response = await requestRoute({ origin, destination });
    state.lastResult = response;

    const price = computePrice(response.distanceMeters, {
      tariffId: elements.tariffSelect.value,
      isScheduled: elements.scheduledCheckbox.checked,
    });

    renderResult(elements, response, price);
    setStatus(elements, response.cached ? 'Ruta recuperada de caché.' : 'Ruta calculada correctamente.');
  } catch (error) {
    console.error('[route] Failed to resolve route', error);
    const message = describeError(error);
    showError(elements, message, state.lastInputs);
    setStatus(elements, '');
  } finally {
    setLoading(elements, false);
  }
}

function setLoading(elements, loading) {
  elements.submitButton.disabled = loading;
  elements.originInput.disabled = loading;
  elements.destinationInput.disabled = loading;
  elements.tariffSelect.disabled = loading;
  elements.scheduledCheckbox.disabled = loading;
}

function setStatus(elements, message) {
  elements.status.textContent = message;
}

function hideResult(elements) {
  elements.result.hidden = true;
}

function renderResult(elements, route, price) {
  elements.resultOrigin.textContent = route.origin.label;
  elements.resultDestination.textContent = route.destination.label;
  elements.resultDistanceReal.textContent = formatDistance(route.distanceMeters);
  elements.resultDistanceBillable.textContent = formatKilometres(price.billableKm);
  elements.resultDuration.textContent = formatDuration(route.durationSeconds);
  elements.resultPrice.textContent = formatCurrency(price.total);
  elements.resultTariff.textContent = `${price.tariff.label} (${price.ratePerKm.toFixed(2)} €/km)`;

  if (price.supplement > 0) {
    elements.supplementValue.textContent = formatCurrency(price.supplement);
    elements.supplementRow.hidden = false;
  } else {
    elements.supplementRow.hidden = true;
  }

  if (route.cached) {
    elements.cacheInfo.textContent = 'Resultado servido desde caché (válido durante 24 h).';
  } else if (route.fetchedAt) {
    const fetchedDate = new Date(route.fetchedAt);
    elements.cacheInfo.textContent = `Actualizado ${fetchedDate.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })}.`;
  } else {
    elements.cacheInfo.textContent = '';
  }

  renderInstructions(elements, route.instructions ?? []);
  const mapsUrl = buildGoogleMapsLink(route.origin, route.destination);
  elements.mapsLink.href = mapsUrl;
  elements.mapsLink.setAttribute('aria-label', `Abrir ruta en Google Maps (${route.origin.label} → ${route.destination.label})`);
  elements.errorMapsLink.href = mapsUrl;

  elements.result.hidden = false;
}

function renderInstructions(elements, instructions) {
  elements.instructionsList.innerHTML = '';
  if (!instructions.length) {
    elements.instructionsContainer.hidden = true;
    return;
  }

  for (const instruction of instructions) {
    const item = document.createElement('li');
    const distance = typeof instruction.distance === 'number'
      ? formatDistance(instruction.distance)
      : '';
    const duration = typeof instruction.time === 'number'
      ? formatDuration(instruction.time / 1000)
      : '';
    item.textContent = [instruction.text, distance, duration]
      .filter(Boolean)
      .join(' · ');
    elements.instructionsList.append(item);
  }

  elements.instructionsContainer.hidden = false;
}

function showError(elements, message, inputs) {
  elements.error.hidden = false;
  elements.errorMessage.textContent = message;
  if (inputs && inputs.origin && inputs.destination) {
    const url = buildTextFallbackLink(inputs.origin, inputs.destination);
    elements.errorMapsLink.href = url;
    elements.errorMapsLink.hidden = false;
  } else {
    elements.errorMapsLink.hidden = true;
  }
}

function hideError(elements) {
  elements.error.hidden = true;
  elements.errorMessage.textContent = '';
}

function resetCalculator(elements, state) {
  elements.form.reset();
  elements.status.textContent = '';
  hideResult(elements);
  hideError(elements);
  state.lastInputs = null;
  state.lastResult = null;
}

function describeError(error) {
  const status = error?.status;
  const message = error?.message;

  if (status === 404) {
    return message || 'Dirección no encontrada.';
  }

  if (status === 429) {
    return 'Límite diario alcanzado. Vuelve a intentarlo más tarde.';
  }

  if (status === 400) {
    return message || 'Solicitud inválida. Revisa los datos introducidos.';
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return 'No se pudo calcular la ruta en este momento.';
}

function buildTextFallbackLink(origin, destination) {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin,
    destination,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
