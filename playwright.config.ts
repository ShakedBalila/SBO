import { defineConfig } from '@playwright/test';
import 'dotenv/config';
export default defineConfig({
  testDir: './tests/e2e', timeout: 60000, workers: 1, fullyParallel: false,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure', channel:'msedge',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {} },
  reporter: 'list'
});
