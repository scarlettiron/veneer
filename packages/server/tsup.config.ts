import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'node16',
  dts: true,
  clean: true,
  sourcemap: true,
  //Needed so createRequire(import.meta.url) works in the CommonJS build.
  shims: true,
});
