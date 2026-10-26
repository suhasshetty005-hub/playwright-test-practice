import { defineConfig, devices } from '@playwright/test';

// GitHub Actions (and most CI tools) set CI=true on every run. One flag, two behaviours:
// fast and strict on the laptop, forgiving and well-reported on the runner.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  // CI: a test.only left in by mistake fails the run instead of silently skipping everything else
  forbidOnly: isCI,
  // laptop: 4 = one per thread. CI: the GitHub runner has 2 CPUs, so 2 workers
  workers: isCI ? 2 : 4,
  // CI: retry twice so one network blip on a live site doesn't fail the build.
  // A test that passes on retry is reported as "flaky", not hidden.
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://testautomationpractice.blogspot.com/',
    // CI: record a trace only when a test is retried, so the run stays fast
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
