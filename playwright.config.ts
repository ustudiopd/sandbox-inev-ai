import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 설정
 * Realtime 부하 테스트용
 */
export default defineConfig({
  testDir: './tests/loadtest',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 10, // 로컬에서는 10개 워커
  reporter: 'html',
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://eventflow.kr',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
