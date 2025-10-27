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

async function writeRuntimeConfig(config) {
  const targetPath = resolve(__dirname, '..', 'runtime-config.js');
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

async function main() {
  const config = buildConfig();
  await writeRuntimeConfig(config);
  console.log('runtime-config.js generated successfully');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
