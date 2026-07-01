import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/loader.ts'],
  format: ['esm', 'cjs'],
  target: 'node16',
  dts: true,
  clean: true,
  sourcemap: true,
});
