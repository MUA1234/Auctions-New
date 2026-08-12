import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Pure unit tests live next to the code under src/. Browser E2E lives under
    // e2e/ and is run by Playwright (`test:e2e`), never by vitest.
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
});
