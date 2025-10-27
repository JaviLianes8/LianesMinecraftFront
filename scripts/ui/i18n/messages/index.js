/**
 * @file Aggregates locale catalogues available to the UI.
 */

import { enMessages } from './en.js';
import { esMessages } from './es.js';

/**
 * Collection of translations grouped by locale identifier.
 * @type {Record<string, Record<string, string>>}
 */
export const MESSAGES = {
  es: esMessages,
  en: enMessages,
};
