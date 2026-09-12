import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    cache: false,
    testTimeout: 60000,
    hookTimeout: 60000,
    include: ['src/__tests__/**/*.test.ts'],
  },
});
