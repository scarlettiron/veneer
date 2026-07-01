import { defineConfig } from 'vitest/config';

//Tests import the built packages by name, so run "pnpm build" before "pnpm test".
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
