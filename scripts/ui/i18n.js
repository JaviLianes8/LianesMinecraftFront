const DEFAULT_LOCALE = 'en';
const FALLBACK_LOCALE = DEFAULT_LOCALE;
const LOCALE_STORAGE_KEY = 'ui.locale';

const SUPPORTED_LOCALES = new Set(['en', 'es']);

const MESSAGES = {
  es: {
    'ui.title': 'Lianes8 Server',
    'ui.footer': 'Minecraft server',
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
    'ui.downloads.minecraft': 'Minecraft (Sitio oficial)',
    'ui.downloads.java': 'Java Runtime (Sitio oficial)',
    'ui.downloads.help': '¿Necesitas ayuda?',
    'ui.localeToggle.buttonLabel.es': 'Idioma: ES',
    'ui.localeToggle.switchTo.en': 'Cambiar a inglés',
    'ui.localeToggle.switchTo.es': 'Cambiar a español',
    'ui.installation.popup.title': 'Lista de verificación de instalación',
    'ui.installation.popup.body': `
      <section class="modal-section">
        <h3>1) Instala Java</h3>
        <p>
          Descarga la versión más reciente de Java Runtime desde el sitio oficial y sigue el asistente de instalación. Reinicia el equipo si el instalador lo solicita.
        </p>
      </section>
      <section class="modal-section">
        <h3>2) Instala Minecraft</h3>
        <p>
          Instala el lanzador oficial de Minecraft desde la página de descargas de Minecraft.net para mantener el juego actualizado.
        </p>
        <p>
          Descarga oficial: <a href="https://www.minecraft.net/en-us/download" target="_blank" rel="noopener noreferrer">minecraft.net/en-us/download</a>
        </p>
      </section>
      <section class="modal-section">
        <h3>3) Instala los mods</h3>
        <p>
          Copia los archivos extraídos de <em>Mods del cliente</em> en <code>%appdata%/.minecraft/mods</code> y reinicia Minecraft.
        </p>
      </section>
      <section class="modal-section">
        <h3>4) Instala NeoForge</h3>
        <p>
          Ejecuta el instalador de NeoForge, elige la opción <strong>Cliente</strong>, verifica la ruta de <code>.minecraft</code> y confirma para completar la instalación.
        </p>
      </section>
    `,
    'info.stream.connecting': 'Conectando al flujo de estado en tiempo real…',
    'info.stream.connected': 'Actualizaciones en vivo disponibles. Esperando estado del servidor.',
    'info.stream.error': 'No se pudo conectar al flujo de estado. Reintentando…',
    'info.stream.reconnecting': 'Conexión con el flujo perdida. Intentando reconectar…',
    'info.stream.unsupported': 'Tu navegador no admite actualizaciones en vivo. Consultando cada 30 s.',
    'info.online': 'Servidor en línea. Puedes solicitar STOP si lo necesitas.',
    'info.offline': 'Servidor detenido. Puedes solicitar START.',
    'info.error': 'El servidor informó de un error. Revisa los registros.',
    'info.unknown': 'Estado desconocido. Intenta de nuevo más tarde.',
    'info.status.readOnly': 'El estado se actualiza automáticamente.',
    'info.start.requireOffline': 'Debes obtener un estado OFFLINE antes de iniciar.',
    'info.stop.requireOnline': 'Debes obtener un estado ONLINE antes de detener.',
    'info.start.pending': 'Solicitando el arranque del servidor…',
    'info.start.success': 'Petición de arranque enviada. El estado se actualizará automáticamente en cuanto haya cambios.',
    'info.stop.pending': 'Solicitando la detención del servidor…',
    'info.stop.success': 'Petición de parada enviada. El estado se actualizará automáticamente en cuanto haya cambios.',
    'info.busy': 'Espera a que finalice la operación en curso.',
    'confirm.stop.first': '¿Seguro que quieres detener el servidor? Los jugadores serán desconectados.',
    'confirm.stop.second': 'Confirma nuevamente: ¿detener el servidor ahora?',
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
    'ui.title': 'Lianes8 Server',
    'ui.footer': 'Minecraft server',
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
    'ui.downloads.minecraft': 'Minecraft (Official)',
    'ui.downloads.java': 'Java Runtime (Official site)',
    'ui.downloads.help': 'Need help?',
    'ui.localeToggle.buttonLabel.en': 'Language: EN',
    'ui.localeToggle.switchTo.en': 'Switch to English',
    'ui.localeToggle.switchTo.es': 'Switch to Spanish',
    'ui.installation.popup.title': 'Installation checklist',
    'ui.installation.popup.body': `
      <section class="modal-section">
        <h3>1) Install Java</h3>
        <p>
          Download the latest Java Runtime from the official website and follow the setup wizard. Restart your computer if the installer requests it.
        </p>
      </section>
      <section class="modal-section">
        <h3>2) Install Minecraft</h3>
        <p>
          Install the official Minecraft Launcher from the Minecraft.net download page to keep the game fully updated.
        </p>
        <p>
          Official download: <a href="https://www.minecraft.net/en-us/download" target="_blank" rel="noopener noreferrer">minecraft.net/en-us/download</a>
        </p>
      </section>
      <section class="modal-section">
        <h3>3) Install the mods</h3>
        <p>
          Copy the extracted <em>Client Mods</em> files into <code>%appdata%/.minecraft/mods</code> and restart Minecraft.
        </p>
      </section>
      <section class="modal-section">
        <h3>4) Install NeoForge</h3>
        <p>
          Launch the NeoForge installer, pick the <strong>Client</strong> option, verify the <code>.minecraft</code> path, and confirm to finish the installation.
        </p>
      </section>
    `,
    'info.stream.connecting': 'Connecting to the live status stream…',
    'info.stream.connected': 'Live updates ready. Waiting for server status.',
    'info.stream.error': 'Could not connect to the live status stream. Retrying…',
    'info.stream.reconnecting': 'Lost the live status stream. Attempting to reconnect…',
    'info.stream.unsupported': 'Your browser does not support live updates. Falling back to 30 s checks.',
    'info.online': 'Server is online. You can request STOP if needed.',
    'info.offline': 'Server is offline. You can request START.',
    'info.error': 'The server reported an error. Review the logs.',
    'info.unknown': 'Status is unknown. Try again later.',
    'info.status.readOnly': 'Status updates are automatic.',
    'info.start.requireOffline': 'You must obtain an OFFLINE status before starting.',
    'info.stop.requireOnline': 'You must obtain an ONLINE status before stopping.',
    'info.start.pending': 'Requesting server startup...',
    'info.start.success': 'Startup request sent. Status updates will arrive automatically when the server changes.',
    'info.stop.pending': 'Requesting server shutdown...',
    'info.stop.success': 'Shutdown request sent. Status updates will arrive automatically when the server changes.',
    'info.busy': 'Wait until the current operation finishes.',
    'confirm.stop.first': 'Are you sure you want to stop the server? Players will be disconnected.',
    'confirm.stop.second': 'Please confirm again: stop the server now?',
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

let activeLocale = resolveInitialLocale();

function resolveInitialLocale() {
  const queryLocale = readLocaleFromQuery();
  if (queryLocale) {
    const normalisedQueryLocale = normaliseLocale(queryLocale);
    persistLocalePreference(normalisedQueryLocale);
    return normalisedQueryLocale;
  }

  const persisted = loadPersistedLocale();
  if (persisted) {
    return normaliseLocale(persisted);
  }

  return normaliseLocale(DEFAULT_LOCALE);
}

function readLocaleFromQuery() {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return null;
  }

  const { search } = window.location;
  if (typeof search !== 'string' || search.length === 0) {
    return null;
  }

  try {
    const params = new URLSearchParams(search);
    const queryLocale = params.get('lang');
    return queryLocale;
  } catch (error) {
    console.error('Unable to parse locale from query string', error);
    return null;
  }
}

function loadPersistedLocale() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read locale preference from storage', error);
    return null;
  }
}

function persistLocalePreference(locale) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn('Unable to persist locale preference', error);
  }
}

/**
 * Retrieves the locale that is currently active in the UI layer.
 *
 * @returns {string} BCP-47 identifier of the active locale.
 */
export function getActiveLocale() {
  return activeLocale;
}

/**
 * Forces the UI layer to use the provided locale when rendering text. The
 * preference is persisted so that subsequent visits reuse the same locale.
 *
 * @param {string} locale Desired locale identifier.
 * @returns {string} Normalised locale currently in use.
 */
export function setLocale(locale) {
  activeLocale = normaliseLocale(locale);
  persistLocalePreference(activeLocale);
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
