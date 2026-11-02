import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so the TanStack Start and Netlify plugins stay out of unit tests.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ['src/**/*.test.ts'] },
})
