const FALLBACK_LOCALE = 'es';

const SUPPORTED_LOCALES = new Set(['es', 'en']);

const MESSAGES = {
  es: {
    'ui.title': 'Minecraft Torch — Control del Servidor',
    'ui.statusButton.prefix': 'ESTADO',
    'ui.statusButton.label.UNKNOWN': 'DESCONOCIDO',
    'ui.statusButton.label.ONLINE': 'EN LÍNEA',
    'ui.statusButton.label.OFFLINE': 'FUERA DE LÍNEA',
    'ui.statusButton.label.ERROR': 'ERROR',
    'ui.statusButton.label.CHECKING': 'COMPROBANDO…',
    'ui.statusButton.label.PROCESSING': 'PROCESANDO…',
    'ui.controls.start': 'Iniciar servidor',
    'ui.controls.stop': 'Detener servidor',
    'ui.controls.start.busy': 'Arrancando…',
    'ui.controls.stop.busy': 'Deteniendo…',
    'ui.controls.generic.busy': 'Procesando…',
    'ui.downloads.label': 'Descargas:',
    'ui.downloads.mods': 'Mods del cliente',
    'ui.downloads.neoforge': 'NeoForge',
    'info.initialPrompt': 'Pulsa STATUS para comprobar el servidor.',
    'info.wait': 'Debes esperar {seconds}s antes de volver a consultar.',
    'info.checking': 'Consultando estado del servidor…',
    'info.online': 'Servidor en línea. Puedes solicitar STOP si lo necesitas.',
    'info.offline': 'Servidor detenido. Puedes solicitar START.',
    'info.error': 'El servidor informó de un error. Revisa los registros.',
    'info.unknown': 'Estado desconocido. Intenta de nuevo más tarde.',
    'info.start.requireOffline': 'Debes obtener un estado OFFLINE antes de iniciar.',
    'info.stop.requireOnline': 'Debes obtener un estado ONLINE antes de detener.',
    'info.start.pending': 'Solicitando el arranque del servidor…',
    'info.start.success': 'Petición de arranque enviada. Consulta STATUS para confirmarlo.',
    'info.stop.pending': 'Solicitando la detención del servidor…',
    'info.stop.success': 'Petición de parada enviada. Consulta STATUS para confirmarlo.',
    'info.busy': 'Espera a que finalice la operación en curso.',
    'error.timeout': 'Tiempo de espera agotado al contactar con el servidor.',
    'error.network': 'No se pudo contactar con la API. Comprueba la conexión o la configuración de CORS.',
    'error.httpWithDescription': 'El servidor respondió con un error {status} ({description}).',
    'error.httpGeneric': 'El servidor respondió con un error ({status}).',
    'error.generic': 'No se pudo completar la operación. Revisa la conexión.',
    'http.400': 'Petición incorrecta',
    'http.401': 'No autorizado',
    'http.403': 'Prohibido',
    'http.404': 'No encontrado',
    'http.409': 'Conflicto',
    'http.422': 'Entidad no procesable',
    'http.500': 'Error interno del servidor',
    'http.502': 'Puerta de enlace incorrecta',
    'http.503': 'Servicio no disponible',
    'http.504': 'Tiempo de espera de la puerta de enlace agotado',
  },
  en: {
    'ui.title': 'Minecraft Torch — Server Control',
    'ui.statusButton.prefix': 'STATUS',
    'ui.statusButton.label.UNKNOWN': 'UNKNOWN',
    'ui.statusButton.label.ONLINE': 'ONLINE',
    'ui.statusButton.label.OFFLINE': 'OFFLINE',
    'ui.statusButton.label.ERROR': 'ERROR',
    'ui.statusButton.label.CHECKING': 'CHECKING…',
    'ui.statusButton.label.PROCESSING': 'PROCESSING…',
    'ui.controls.start': 'Start Server',
    'ui.controls.stop': 'Stop Server',
    'ui.controls.start.busy': 'Starting…',
    'ui.controls.stop.busy': 'Stopping…',
    'ui.controls.generic.busy': 'Working…',
    'ui.downloads.label': 'Downloads:',
    'ui.downloads.mods': 'Client Mods',
    'ui.downloads.neoforge': 'NeoForge',
    'info.initialPrompt': 'Press STATUS to check the server.',
    'info.wait': 'You must wait {seconds}s before requesting STATUS again.',
    'info.checking': 'Checking server status...',
    'info.online': 'Server is online. You can request STOP if needed.',
    'info.offline': 'Server is offline. You can request START.',
    'info.error': 'The server reported an error. Review the logs.',
    'info.unknown': 'Status is unknown. Try again later.',
    'info.start.requireOffline': 'You must obtain an OFFLINE status before starting.',
    'info.stop.requireOnline': 'You must obtain an ONLINE status before stopping.',
    'info.start.pending': 'Requesting server startup...',
    'info.start.success': 'Startup request sent. Check STATUS to confirm.',
    'info.stop.pending': 'Requesting server shutdown...',
    'info.stop.success': 'Shutdown request sent. Check STATUS to confirm.',
    'info.busy': 'Wait until the current operation finishes.',
    'error.timeout': 'Timed out while contacting the server.',
    'error.network': 'The API could not be reached. Check the connection or CORS policy.',
    'error.httpWithDescription': 'The server responded with an error {status} ({description}).',
    'error.httpGeneric': 'The server responded with an error ({status}).',
    'error.generic': 'The operation could not be completed. Check the connection.',
    'http.400': 'Bad Request',
    'http.401': 'Unauthorized',
    'http.403': 'Forbidden',
    'http.404': 'Not Found',
    'http.409': 'Conflict',
    'http.422': 'Unprocessable Entity',
    'http.500': 'Internal Server Error',
    'http.502': 'Bad Gateway',
    'http.503': 'Service Unavailable',
    'http.504': 'Gateway Timeout',
  },
};

function detectBrowserLocale() {
  if (typeof navigator === 'undefined' || typeof navigator.language !== 'string') {
    return FALLBACK_LOCALE;
  }
  return navigator.language;
}

function normaliseLocale(locale) {
  if (!locale || typeof locale !== 'string') {
    return FALLBACK_LOCALE;
  }
  const lower = locale.toLowerCase();
  if (SUPPORTED_LOCALES.has(lower)) {
    return lower;
  }
  const base = lower.split('-')[0];
  if (SUPPORTED_LOCALES.has(base)) {
    return base;
  }
  return FALLBACK_LOCALE;
}

let activeLocale = normaliseLocale(detectBrowserLocale());

/**
 * Retrieves the locale that is currently active in the UI layer.
 *
 * @returns {string} BCP-47 identifier of the active locale.
 */
export function getActiveLocale() {
  return activeLocale;
}

/**
 * Forces the UI layer to use the provided locale when rendering text.
 *
 * @param {string} locale Desired locale identifier.
 * @returns {string} Normalised locale currently in use.
 */
export function setLocale(locale) {
  activeLocale = normaliseLocale(locale);
  return activeLocale;
}

/**
 * Resolves a human-readable string for the given key using the active locale.
 *
 * @param {string} key Translation key registered in the catalogue.
 * @param {Record<string, unknown>} [params] Optional placeholder values.
 * @returns {string} Rendered string ready to be injected into the DOM.
 */
export function translate(key, params = {}) {
  const localeMessages = MESSAGES[activeLocale] ?? MESSAGES[FALLBACK_LOCALE];
  const fallbackMessages = MESSAGES[FALLBACK_LOCALE];
  const template = localeMessages[key] ?? fallbackMessages[key];
  if (!template) {
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      const value = params[token];
      return value != null ? String(value) : '';
    }
    return match;
  });
}
