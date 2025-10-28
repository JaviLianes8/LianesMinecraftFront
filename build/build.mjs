import { cp, mkdir, rm, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateRuntimeConfig } from './generate-runtime-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const outputDir = resolve(projectRoot, 'public');

/**
 * Ensures the build output directory is empty and ready for new artefacts.
 *
 * @returns {Promise<void>} Completes when the directory has been recreated.
 */
async function prepareOutputDirectory() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
}

/**
 * Copies the static assets required to serve the dashboard into the output directory.
 *
 * @returns {Promise<void>} Resolves after all files are copied.
 */
async function copyStaticAssets() {
  const directories = ['assets', 'img', 'scripts', 'styles'];
  await Promise.all(
    directories.map((directory) =>
      cp(resolve(projectRoot, directory), resolve(outputDir, directory), { recursive: true })
    ),
  );
  await copyFile(resolve(projectRoot, 'index.html'), resolve(outputDir, 'index.html'));
}

/**
 * Builds the deployable artefacts, including the runtime password configuration.
 *
 * @returns {Promise<void>} Resolves once the build completes successfully.
 */
async function main() {
  await prepareOutputDirectory();
  await copyStaticAssets();
  await generateRuntimeConfig({
    outputPaths: [
      resolve(projectRoot, 'runtime-config.js'),
      resolve(outputDir, 'runtime-config.js'),
    ],
  });
  console.log('Build completed successfully');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
