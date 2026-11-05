import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

// Runs against the dev server and the Neon `dev` branch. Test accounts use
// e2e+<timestamp>@example.com and are deleted by e2e/global-teardown.ts.
// Set E2E_BASE_URL to run against something already serving instead, such as a
// production build (`npm run build && npx vite preview --port 4173`).
const externalBaseURL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: externalBaseURL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000/sign-in',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
