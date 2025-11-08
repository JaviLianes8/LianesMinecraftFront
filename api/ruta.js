const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const GRAPHHOPPER_ROUTE_ENDPOINT = 'https://graphhopper.com/api/1/route';
const USER_AGENT = 'LianesMinecraftFront/1.0 (https://github.com/JaviLianes8/LianesMinecraftFront)';

/** @typedef {{ lat: number, lon: number, label: string }} GeocodedPoint */

const routeCache = new Map();

/**
 * Vercel serverless function handler that resolves driving routes using
 * GraphHopper Cloud and exposes pricing-friendly metadata.
 *
 * @param {import('http').IncomingMessage & { method?: string }} req
 * @param {import('http').ServerResponse & { json?: (body: unknown) => void }} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Método no permitido' }));
    return;
  }

  const apiKey = process.env.GRAPHHOPPER_KEY;
  if (!apiKey) {
    console.error('[ruta] Missing GRAPHHOPPER_KEY environment variable');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Configuración incompleta del servidor' }));
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    console.warn('[ruta] Failed to parse JSON payload', error);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Solicitud inválida. Asegúrate de enviar JSON válido.' }));
    return;
  }

  const { origin, destination, profile = 'car' } = payload ?? {};

  if (!origin || !destination) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Debes indicar un origen y un destino.' }));
    return;
  }

  try {
    const [resolvedOrigin, resolvedDestination] = await Promise.all([
      resolvePoint(origin, 'origen'),
      resolvePoint(destination, 'destino'),
    ]);

    const cacheKey = buildCacheKey(resolvedOrigin, resolvedDestination, profile);
    const cached = getFromCache(cacheKey);

    if (cached) {
      console.log('[ruta] Cache hit for', cacheKey);
      respondJson(res, 200, {
        ...cached,
        cached: true,
      });
      return;
    }

    console.log('[ruta] Resolving route', cacheKey);
    const route = await fetchRoute(
      resolvedOrigin,
      resolvedDestination,
      profile,
      apiKey,
    );

    const enriched = {
      ...route,
      origin: resolvedOrigin,
      destination: resolvedDestination,
      cached: false,
      fetchedAt: new Date().toISOString(),
    };

    storeInCache(cacheKey, enriched);
    respondJson(res, 200, enriched);
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Attempts to parse the JSON payload from the request stream.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<any>}
 */
async function readJsonBody(req) {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  if (buffers.length === 0) {
    return {};
  }
  const body = Buffer.concat(buffers).toString('utf8');
  return JSON.parse(body);
}

/**
 * Resolves a point definition into concrete geographic coordinates.
 *
 * @param {unknown} value
 * @param {string} role
 * @returns {Promise<GeocodedPoint>}
 */
async function resolvePoint(value, role) {
  if (!value) {
    throw createClientError(`Dirección de ${role} vacía.`, 400);
  }

  if (typeof value === 'object' && value !== null) {
    const { lat, lon, label } = value;
    if (typeof lat === 'number' && typeof lon === 'number') {
      return {
        lat,
        lon,
        label: typeof label === 'string' && label.length > 0
          ? label
          : `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      };
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      throw createClientError(`Dirección de ${role} vacía.`, 400);
    }

    const coordinate = parseCoordinateString(trimmed);
    if (coordinate) {
      return {
        ...coordinate,
        label: `${coordinate.lat.toFixed(6)}, ${coordinate.lon.toFixed(6)}`,
      };
    }

    return geocode(trimmed, role);
  }

  throw createClientError(
    `Dirección de ${role} inválida. Usa texto o coordenadas lat,lon.`,
    400,
  );
}

/**
 * Parses "lat, lon" formatted strings into coordinates.
 *
 * @param {string} input
 * @returns {{ lat: number, lon: number } | null}
 */
function parseCoordinateString(input) {
  const parts = input.split(',').map((part) => part.trim());
  if (parts.length !== 2) {
    return null;
  }
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon };
  }
  return null;
}

/**
 * Geocodes a textual address using the public Nominatim API.
 *
 * @param {string} query
 * @param {string} role
 * @returns {Promise<GeocodedPoint>}
 */
async function geocode(query, role) {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('q', query);

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    const message = `Fallo al geocodificar ${role}. Código ${response.status}.`;
    throw createUpstreamError(message, response.status);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw createClientError(`Dirección de ${role} no encontrada.`, 404);
  }

  const [match] = results;
  return {
    lat: Number(match.lat),
    lon: Number(match.lon),
    label: match.display_name ?? query,
  };
}

/**
 * Fetches the route from GraphHopper Cloud.
 *
 * @param {GeocodedPoint} origin
 * @param {GeocodedPoint} destination
 * @param {string} profile
 * @param {string} apiKey
 * @returns {Promise<object>}
 */
async function fetchRoute(origin, destination, profile, apiKey) {
  const url = new URL(GRAPHHOPPER_ROUTE_ENDPOINT);
  url.searchParams.set('profile', profile);
  url.searchParams.append('point', `${origin.lat},${origin.lon}`);
  url.searchParams.append('point', `${destination.lat},${destination.lon}`);
  url.searchParams.set('locale', 'es');
  url.searchParams.set('points_encoded', 'false');
  url.searchParams.set('instructions', 'true');
  url.searchParams.set('calc_points', 'true');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (response.status === 429) {
    throw createClientError('Límite diario alcanzado en GraphHopper.', 429);
  }

  if (!response.ok) {
    let details = '';
    try {
      const errorBody = await response.json();
      details = errorBody?.message ?? '';
    } catch (error) {
      details = '';
    }

    const message = details
      ? `GraphHopper devolvió ${response.status}: ${details}`
      : `GraphHopper devolvió ${response.status}`;
    throw createUpstreamError(message, response.status);
  }

  const data = await response.json();
  const path = Array.isArray(data.paths) ? data.paths[0] : null;

  if (!path) {
    throw createUpstreamError('GraphHopper no devolvió rutas.', 502);
  }

  const instructions = Array.isArray(path.instructions)
    ? path.instructions.map((instruction) => ({
        text: instruction.text,
        distance: instruction.distance,
        time: instruction.time,
        sign: instruction.sign,
        streetName: instruction.street_name,
      }))
    : [];

  return {
    profile: path.profile ?? profile,
    distanceMeters: path.distance,
    durationSeconds: Math.round(path.time / 1000),
    points: path.points,
    instructions,
    bbox: path.bbox ?? null,
    snappedWaypoints: path.snapped_waypoints ?? null,
  };
}

/**
 * Builds a cache key unique to the route request.
 *
 * @param {GeocodedPoint} origin
 * @param {GeocodedPoint} destination
 * @param {string} profile
 * @returns {string}
 */
function buildCacheKey(origin, destination, profile) {
  const originKey = `${origin.lat.toFixed(6)},${origin.lon.toFixed(6)}`;
  const destinationKey = `${destination.lat.toFixed(6)},${destination.lon.toFixed(6)}`;
  return `${profile}:${originKey}->${destinationKey}`;
}

/**
 * Retrieves a cached route if it has not expired yet.
 *
 * @param {string} key
 * @returns {object | null}
 */
function getFromCache(key) {
  const entry = routeCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    routeCache.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Stores the provided route data in the in-memory cache.
 *
 * @param {string} key
 * @param {object} value
 */
function storeInCache(key, value) {
  purgeExpiredEntries();
  routeCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function purgeExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of routeCache.entries()) {
    if (entry.expiresAt <= now) {
      routeCache.delete(key);
    }
  }
}

/**
 * Normalises error responses into HTTP responses.
 *
 * @param {import('http').ServerResponse & { json?: (body: unknown) => void }} res
 * @param {Error & { statusCode?: number, expose?: boolean }} error
 */
function handleError(res, error) {
  const statusCode = error.statusCode ?? 500;
  const expose = error.expose ?? false;
  const message = expose
    ? error.message
    : 'No se pudo calcular la ruta. Inténtalo de nuevo más tarde.';

  if (!expose) {
    console.error('[ruta] Unexpected error', error);
  }

  respondJson(res, statusCode, { error: message });
}

/**
 * Sends a JSON response with the provided status code.
 *
 * @param {import('http').ServerResponse & { json?: (body: unknown) => void }} res
 * @param {number} statusCode
 * @param {unknown} body
 */
function respondJson(res, statusCode, body) {
  if (typeof res.json === 'function') {
    res.status(statusCode).json(body);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Creates an error that should be shown to the client.
 *
 * @param {string} message
 * @param {number} statusCode
 */
function createClientError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
}

/**
 * Creates an error representing an upstream failure.
 *
 * @param {string} message
 * @param {number} statusCode
 */
function createUpstreamError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = statusCode >= 400 && statusCode < 500;
  return error;
}

