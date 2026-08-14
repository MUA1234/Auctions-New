import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Use the automatic JSX runtime so component tests don't need `import React`.
  esbuild: { jsx: 'automatic' },
  test: {
    // Pure unit tests run in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock. Browser E2E lives under e2e/ and is
    // run by Playwright (`test:e2e`), never by vitest.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
});
