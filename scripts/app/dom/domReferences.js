/**
 * Provides a centralised list of DOM references used by the dashboard module.
 *
 * @returns {Object} Immutable collection of DOM nodes grouped by their role.
 */
export function createDomReferences() {
  const statusButton = document.querySelector('[data-role="status-button"]');
  const localeToggleButton = document.querySelector('[data-role="locale-toggle"]');
  const startButton = document.querySelector('[data-role="start-button"]');
  const stopButton = document.querySelector('[data-role="stop-button"]');
  const infoPanel = document.querySelector('[data-role="info-panel"]');
  const controlCard = document.querySelector('.control-card');
  const torchSvg = document.querySelector('[data-role="torch"]');
  const flame = document.querySelector('[data-role="flame"]');
  const minecraftLink = document.querySelector('[data-role="download-minecraft"]');
  const javaLink = document.querySelector('[data-role="download-java"]');
  const installHelpButton = document.querySelector('[data-role="install-help-button"]');
  const installModal = document.querySelector('[data-role="install-modal"]');
  const installModalCloseButton = document.querySelector('[data-role="install-modal-close"]');
  const installModalOverlay = document.querySelector('[data-role="install-modal-overlay"]');
  const installModalTitle = document.querySelector('[data-role="install-modal-title"]');
  const installModalBody = document.querySelector('[data-role="install-modal-body"]');
  const footerElement = document.querySelector('[data-role="footer"]');
  const downloadsLabel = document.querySelector('[data-role="downloads-label"]');
  const modsLink = document.querySelector('[data-role="download-mods"]');
  const neoforgeLink = document.querySelector('[data-role="download-neoforge"]');

  return Object.freeze({
    statusButton,
    localeToggleButton,
    startButton,
    stopButton,
    infoPanel,
    controlCard,
    torchSvg,
    flame,
    minecraftLink,
    javaLink,
    installHelpButton,
    installModal,
    installModalCloseButton,
    installModalOverlay,
    installModalTitle,
    installModalBody,
    footerElement,
    downloadsLabel,
    modsLink,
    neoforgeLink,
  });
}
