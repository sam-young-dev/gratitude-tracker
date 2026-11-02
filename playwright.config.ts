import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

// Runs against the dev server and the Neon `dev` branch. Test accounts use
// e2e+<timestamp>@example.com and are deleted by e2e/global-teardown.ts.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/sign-in',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
