import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure logic tests run in node; component tests opt into jsdom via a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
