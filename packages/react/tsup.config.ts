import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2021',
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react'],
  //All of this package runs in the browser, so mark it as client code
  //for frameworks like Next that split server and client components.
  banner: {
    js: '"use client";',
  },
});
