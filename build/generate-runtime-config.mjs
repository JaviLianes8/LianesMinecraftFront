/**
 * @file Generates the runtime password configuration consumed by the dashboard.
 */

import { createHash, randomBytes } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function ensurePassword(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required to generate runtime-config.js`);
  }
  return value;
}

function hashPassword(password, salt) {
  const hash = createHash('sha256');
  hash.update(`${salt}:${password}`);
  return hash.digest('hex');
}

function generateSalt() {
  return randomBytes(16).toString('hex');
}

async function writeRuntimeConfig(targetPath, config) {
  await mkdir(dirname(targetPath), { recursive: true });
  const payload = `window.__PASSWORD_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`;
  await writeFile(targetPath, payload, 'utf8');
}

function buildConfig() {
  const startPassword = ensurePassword('START_PASSWORD');
  const stopPassword = ensurePassword('STOP_PASSWORD');

  const startSalt = generateSalt();
  const stopSalt = generateSalt();

  return {
    start: {
      salt: startSalt,
      hash: hashPassword(startPassword, startSalt),
    },
    stop: {
      salt: stopSalt,
      hash: hashPassword(stopPassword, stopSalt),
    },
  };
}

/**
 * Generates the runtime password configuration in the provided output paths.
 *
 * @param {Object} [options] Generation options.
 * @param {string[]} [options.outputPaths] Absolute file paths where the config will be written.
 * @returns {Promise<void>} Resolves when all files have been written successfully.
 */
export async function generateRuntimeConfig({ outputPaths } = {}) {
  const config = buildConfig();
  const defaultOutput = resolve(__dirname, '..', 'runtime-config.js');
  const targets = Array.isArray(outputPaths) && outputPaths.length > 0 ? outputPaths : [defaultOutput];

  await Promise.all(targets.map((target) => writeRuntimeConfig(target, config)));
}

async function runFromCli() {
  await generateRuntimeConfig();
  console.log('runtime-config.js generated successfully');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFromCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
