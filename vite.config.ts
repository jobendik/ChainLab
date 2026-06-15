import { defineConfig } from 'vite';

// The config runs in Node; declare the bits we use so we don't need @types/node
// across the whole app.
declare const process: { env: Record<string, string | undefined> };

// Chain Lab build configuration.
//
// When deploying to GitHub Pages the site is served from a sub-path that
// matches the repository name (https://<user>.github.io/chainlab/), so the
// production `base` must point at that sub-path for assets to resolve. During
// local development we serve from the root. The base can be overridden at
// build time with the BASE_PATH environment variable if the repo is renamed.
const base = process.env.BASE_PATH ?? '/chainlab/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? base : '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
    open: false,
  },
  preview: {
    port: 4173,
  },
}));
