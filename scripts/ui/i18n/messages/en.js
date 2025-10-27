/**
 * @file Contains the English locale catalogue for the UI layer.
 */

/**
 * English translations keyed by message identifier.
 * @type {Record<string, string>}
 */
export const enMessages = {
  'ui.title': 'Lianes8 Server',
  'ui.footer': 'Minecraft server',
  'ui.statusButton.prefix': 'Lianes8 server Status',
  'ui.statusButton.label.UNKNOWN': 'Unknown',
  'ui.statusButton.label.ONLINE': 'Online',
  'ui.statusButton.label.OFFLINE': 'Offline',
  'ui.statusButton.label.ERROR': 'Error',
  'ui.statusButton.label.CHECKING': 'Checking…',
  'ui.statusButton.label.PROCESSING': 'Processing…',
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
  'info.auth.start.enterPassword': 'Enter the dashboard password to continue.',
  'info.auth.start.denied': 'Access denied. Refresh the page to try again.',
  'info.auth.stop.cancelled': 'Shutdown cancelled. The server will remain online.',
  'info.auth.stop.error': 'Shutdown aborted due to an authentication error. Try again later.',
  'confirm.stop.first': 'Are you sure you want to stop the server? Players will be disconnected.',
  'confirm.stop.second': 'Please confirm again: stop the server now?',
  'auth.start.prompt': 'Enter the dashboard access password.',
  'auth.start.retry': 'Incorrect password. Enter the dashboard access password again.',
  'auth.start.invalid': 'The provided password is incorrect.',
  'auth.stop.prompt': 'Enter the shutdown password to stop the server.',
  'auth.stop.retry': 'Incorrect password. Enter the shutdown password again.',
  'auth.stop.invalid': 'The shutdown password is incorrect.',
  'auth.error.empty': 'Password cannot be empty.',
  'auth.error.unavailable': 'Password verification service unavailable. Try again later.',
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
};
