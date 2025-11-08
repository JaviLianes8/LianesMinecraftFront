const SCHEDULED_SUPPLEMENT_EUR = 5;

const TARIFFS = [
  {
    id: 'tarifa1',
    label: 'Tarifa 1',
    ratePerKm: 1.35,
  },
  {
    id: 'tarifa2',
    label: 'Tarifa 2',
    ratePerKm: 1.55,
  },
];

/**
 * Returns all available tariffs sorted by identifier.
 *
 * @returns {{ id: string, label: string, ratePerKm: number }[]}
 */
export function listTariffs() {
  return [...TARIFFS];
}

/**
 * Calculates the total price for a route applying the business rules.
 *
 * @param {number} distanceMeters
 * @param {{ tariffId: string, isScheduled: boolean }} options
 * @returns {{
 *   total: number,
 *   base: number,
 *   supplement: number,
 *   ratePerKm: number,
 *   realKm: number,
 *   billableKm: number,
 *   tariff: { id: string, label: string }
 * }}
 */
export function computePrice(distanceMeters, { tariffId, isScheduled }) {
  const tariff = findTariff(tariffId);
  const realKm = Math.max(0, distanceMeters / 1000);
  const billableKm = realKm + 1;
  const base = billableKm * tariff.ratePerKm;
  const supplement = isScheduled ? SCHEDULED_SUPPLEMENT_EUR : 0;
  const total = base + supplement;

  return {
    total,
    base,
    supplement,
    ratePerKm: tariff.ratePerKm,
    realKm,
    billableKm,
    tariff: { id: tariff.id, label: tariff.label },
  };
}

function findTariff(tariffId) {
  return TARIFFS.find((tariff) => tariff.id === tariffId) ?? TARIFFS[0];
}

/**
 * Formats a numeric value as currency using euros.
 *
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a distance in metres into readable kilometres.
 *
 * @param {number} distanceMeters
 * @returns {string}
 */
export function formatDistance(distanceMeters) {
  const km = distanceMeters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Formats a distance expressed in kilometres.
 *
 * @param {number} kilometres
 * @returns {string}
 */
export function formatKilometres(kilometres) {
  return `${kilometres.toFixed(2)} km`;
}

/**
 * Formats a duration in seconds to an hh:mm textual representation.
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '—';
  }
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} h ${minutes.toString().padStart(2, '0')} min`;
}
