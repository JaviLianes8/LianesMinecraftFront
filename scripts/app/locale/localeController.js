import { buildApiUrl } from '../../config.js';
import { getActiveLocale, setLocale, translate as defaultTranslate } from '../../ui/i18n.js';

/**
 * Coordinates locale-related behaviour, including static content translation and toggle interactions.
 */
export class LocaleController {
  /**
   * @param {Object} dom DOM references used to render locale-specific content.
   * @param {HTMLElement} dom.startButton Button responsible for starting the server.
   * @param {HTMLElement} dom.stopButton Button responsible for stopping the server.
   * @param {HTMLElement} dom.downloadsLabel Label describing the downloads section.
   * @param {HTMLElement} dom.modsLink Link pointing to the mods download endpoint.
   * @param {HTMLElement} dom.neoforgeLink Link pointing to the NeoForge download endpoint.
   * @param {HTMLElement} dom.minecraftLink Link pointing to Mojang's official download page.
   * @param {HTMLElement} dom.javaLink Link pointing to the Java download page.
   * @param {HTMLElement} dom.installHelpButton Button opening the installation modal.
   * @param {HTMLElement} dom.installModalTitle Modal title element.
   * @param {HTMLElement} dom.installModalBody Modal body container where HTML is injected.
   * @param {HTMLElement} dom.footerElement Footer element displaying the copyright.
   * @param {HTMLButtonElement} dom.localeToggleButton Button toggling locales.
   * @param {Object} [dependencies] Optional overrides for translation behaviour.
   * @param {(key: string, params?: Record<string, unknown>) => string} [dependencies.translate]
   * Translator resolving localisation keys.
   */
  constructor(dom, dependencies = {}) {
    this.dom = dom;
    this.translate = dependencies.translate ?? defaultTranslate;
  }

  /**
   * Applies the currently selected locale to all static pieces of content.
   */
  applyLocaleToStaticContent() {
    const {
      startButton,
      stopButton,
      downloadsLabel,
      modsLink,
      neoforgeLink,
      minecraftLink,
      javaLink,
      installHelpButton,
      installModalTitle,
      installModalBody,
      footerElement,
      footerTitle,
      footerLink,
    } = this.dom;

    const locale = getActiveLocale();
    document.documentElement.lang = locale;
    document.title = this.translate('ui.title');

    if (startButton) {
      startButton.textContent = this.translate('ui.controls.start');
      startButton.setAttribute('aria-label', startButton.textContent);
    }

    if (stopButton) {
      stopButton.textContent = this.translate('ui.controls.stop');
      stopButton.setAttribute('aria-label', stopButton.textContent);
    }

    if (downloadsLabel) {
      downloadsLabel.textContent = this.translate('ui.downloads.label');
    }

    if (modsLink) {
      modsLink.textContent = this.translate('ui.downloads.mods');
      this.updateDownloadLinkHref(modsLink, 'mods/download');
    }

    if (neoforgeLink) {
      neoforgeLink.textContent = this.translate('ui.downloads.neoforge');
      this.updateDownloadLinkHref(neoforgeLink, 'neoforge/download');
    }

    if (minecraftLink) {
      minecraftLink.textContent = this.translate('ui.downloads.minecraft');
      minecraftLink.setAttribute('href', 'https://www.minecraft.net/en-us/download');
    }

    if (javaLink) {
      javaLink.textContent = this.translate('ui.downloads.java');
      javaLink.setAttribute('href', 'https://www.java.com/en/download/');
    }

    if (installHelpButton) {
      installHelpButton.textContent = this.translate('ui.downloads.help');
    }

    if (installModalTitle) {
      installModalTitle.textContent = this.translate('ui.installation.popup.title');
    }

    if (installModalBody) {
      installModalBody.innerHTML = this.translate('ui.installation.popup.body');
    }

    if (footerTitle) {
      footerTitle.textContent = this.translate('ui.footer.title');
    }

    if (footerLink) {
      const label = this.translate('ui.footer.githubLabel');
      footerLink.setAttribute('aria-label', label);
      footerLink.setAttribute('title', label);
      if (!footerLink.textContent.trim()) {
        const hiddenLabel = document.createElement('span');
        hiddenLabel.className = 'visually-hidden';
        hiddenLabel.textContent = label;
        footerLink.prepend(hiddenLabel);
      } else {
        const hiddenLabel = footerLink.querySelector('.visually-hidden');
        if (hiddenLabel) {
          hiddenLabel.textContent = label;
        }
      }
    }

    if (footerElement) {
      footerElement.setAttribute('data-locale', locale);
    }
  }

  /**
   * Configures the locale toggle, invoking the provided callback after a locale change.
   *
   * @param {() => void} onLocaleChange Callback executed once the locale has been updated.
   */
  prepareLocaleToggle(onLocaleChange) {
    const { localeToggleButton } = this.dom;
    if (!localeToggleButton) {
      return;
    }

    this.updateLocaleToggleLabel();

    localeToggleButton.addEventListener('click', () => {
      const locale = getActiveLocale();
      const nextLocale = locale === 'es' ? 'en' : 'es';
      setLocale(nextLocale);
      this.applyLocaleToStaticContent();
      this.updateLocaleToggleLabel();
      if (typeof onLocaleChange === 'function') {
        onLocaleChange();
      }
    });
  }

  /**
   * Refreshes the toggle button label to reflect the current locale state.
   */
  updateLocaleToggleLabel() {
    const { localeToggleButton } = this.dom;
    if (!localeToggleButton) {
      return;
    }

    const locale = getActiveLocale();
    const nextLocale = locale === 'es' ? 'en' : 'es';
    const labelKey = `ui.localeToggle.switchTo.${nextLocale}`;
    const label = this.translate(labelKey);
    const buttonLabelKey = `ui.localeToggle.buttonLabel.${locale}`;
    const buttonLabel = this.translate(buttonLabelKey);
    localeToggleButton.textContent = buttonLabel;
    localeToggleButton.setAttribute('data-locale', locale);
    localeToggleButton.setAttribute('aria-pressed', locale === 'es' ? 'true' : 'false');
    localeToggleButton.setAttribute('aria-label', label);
    localeToggleButton.setAttribute('title', label);
  }

  updateDownloadLinkHref(anchor, resourcePath) {
    try {
      anchor.href = buildApiUrl(resourcePath);
    } catch (error) {
      console.error('Unable to resolve download URL for', resourcePath, error);
    }
  }
}
