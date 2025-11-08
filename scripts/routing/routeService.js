const ROUTE_ENDPOINT = '/api/ruta';

/**
 * Requests a route from the internal API.
 *
 * @param {{ origin: string, destination: string }} payload
 * @returns {Promise<{
 *   origin: { lat: number, lon: number, label: string },
 *   destination: { lat: number, lon: number, label: string },
 *   distanceMeters: number,
 *   durationSeconds: number,
 *   instructions: { text: string, distance: number, time: number }[],
 *   points: { coordinates: [number, number][] },
 *   bbox: number[] | null,
 *   profile: string,
 *   cached: boolean,
 *   fetchedAt?: string
 * }>}
 */
export async function requestRoute(payload) {
  const response = await fetch(ROUTE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === 'string'
      ? body
      : body?.error || 'No se pudo calcular la ruta.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}

/**
 * Builds a Google Maps deep link for manual fallback.
 *
 * @param {{ lat: number, lon: number }} origin
 * @param {{ lat: number, lon: number }} destination
 * @returns {string}
 */
export function buildGoogleMapsLink(origin, destination) {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin: `${origin.lat},${origin.lon}`,
    destination: `${destination.lat},${destination.lon}`,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
