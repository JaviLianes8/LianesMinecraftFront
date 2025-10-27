/**
 * @file Contains the Spanish locale catalogue for the UI layer.
 */

/**
 * Spanish translations keyed by message identifier.
 * @type {Record<string, string>}
 */
export const esMessages = {
  'ui.title': 'Lianes8 Server',
  'ui.footer': 'Minecraft server',
  'ui.statusButton.prefix': 'Lianes8 server Estado',
  'ui.statusButton.label.UNKNOWN': 'Desconocido',
  'ui.statusButton.label.ONLINE': 'En línea',
  'ui.statusButton.label.OFFLINE': 'Fuera de línea',
  'ui.statusButton.label.ERROR': 'Error',
  'ui.statusButton.label.CHECKING': 'Comprobando…',
  'ui.statusButton.label.PROCESSING': 'Procesando…',
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
  'ui.password.start.title': 'Acceso seguro',
  'ui.password.start.description': 'Introduce la contraseña de arranque para desbloquear el panel de control.',
  'ui.password.stop.title': 'Confirmar apagado',
  'ui.password.stop.description': 'Introduce la contraseña de parada para detener el servidor con seguridad.',
  'ui.password.label': 'Contraseña',
  'ui.password.submit': 'Continuar',
  'ui.password.cancel': 'Cancelar',
  'ui.password.error.invalid': 'Contraseña incorrecta. Inténtalo de nuevo.',
  'ui.password.error.generic': 'No se pudo verificar la contraseña. Vuelve a intentarlo.',
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
};
