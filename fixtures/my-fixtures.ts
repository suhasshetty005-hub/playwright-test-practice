// Step 8: custom fixtures. The tests that use these live in tests/08-custom-fixtures.spec.ts.
//
// Key idea: a fixture is something a test ASKS FOR by name in its arguments, like `{ page }`.
// Playwright builds it before the test, hands it over, and tidies it up after the test.
// You make your own with `test.extend()`, then import THIS `test` instead of '@playwright/test'.
//
// Every fixture has the same shape:
//
//   myFixture: async ({ otherFixtures }, use) => {
//     // 1. SETUP     runs before the test
//     await use(value);   // 2. the TEST runs here and receives `value`
//     // 3. TEARDOWN  runs after the test, even if it failed
//   },
//
// A fixture is only created if a test (or another fixture) asks for it. Unused = never built.

import { test as base, expect, Page } from '@playwright/test';
import { DataEntryForm, FormData } from '../pages/DataEntryForm';

// The types tell TypeScript what each fixture gives the test.
type MyFixtures = {
  userName: string;              // 1. an OPTION: a value a test file can override
  formData: FormData;            // 2. plain test data, built from another fixture
  homePage: Page;                // 3. the built-in `page`, already on the home page
  dataEntryForm: DataEntryForm;  // 4. a page object, ready to use
  timeTest: void;                // 5. an AUTO fixture: runs for every test, gives nothing
};

// Worker fixtures live in a separate type: they are created once per worker, not per test.
type MyWorkerFixtures = {
  workerRunId: string;           // 6. shared by all tests in one worker process
};

export const test = base.extend<MyFixtures, MyWorkerFixtures>({
  // ── 1. Option fixture ──────────────────────────────────────
  // [default value, { option: true }]. Override it with test.use({ userName: '...' })
  // in a spec file, or per project in playwright.config.ts.
  userName: ['Suhas', { option: true }],

  // ── 2. Data fixture ────────────────────────────────────────
  // Fixtures can use other fixtures: this one asks for `userName`.
  // It needs no browser, so a test that only asks for `formData` never opens a page.
  formData: async ({ userName }, use) => {
    await use({
      name: userName,
      email: `${userName.toLowerCase()}@example.com`,
      phone: '9876543210',
      address: 'Bengaluru, India',
    });
  },

  // ── 3. Fixture built on a built-in fixture ─────────────────
  // Takes Playwright's own `page`, does the common first step, then hands it over.
  // This replaces a `beforeEach(() => page.goto('/'))` in every file.
  homePage: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },

  // ── 4. Page-object fixture ─────────────────────────────────
  // Asks for `homePage`, so the site is already open when the test gets the form.
  // Chain: page → homePage → dataEntryForm. Playwright works out the order for you.
  dataEntryForm: async ({ homePage }, use) => {
    await use(new DataEntryForm(homePage));
  },

  // ── 5. Auto fixture with setup AND teardown ────────────────
  // { auto: true } = runs for EVERY test that imports this `test`, even if not asked for.
  // The code after `await use()` is the teardown: it runs once the test has finished.
  // `testInfo` (3rd argument) tells you about the current test: title, status, duration...
  timeTest: [
    async ({}, use, testInfo) => {
      const start = Date.now();
      console.log(`[timeTest] START  "${testInfo.title}"`);
      await use();
      console.log(`[timeTest] END    "${testInfo.title}" → ${testInfo.status} in ${Date.now() - start} ms`);
    },
    { auto: true },
  ],

  // ── 6. Worker-scoped fixture ───────────────────────────────
  // { scope: 'worker' } = built ONCE per worker process and reused by every test in it.
  // Use it for expensive things: a DB connection, an API token, a test account.
  // Worker fixtures can only use other worker fixtures (not `page`, which is per test).
  workerRunId: [
    async ({}, use, workerInfo) => {
      const id = `worker-${workerInfo.workerIndex}-${Date.now()}`;
      console.log(`[workerRunId] CREATED ${id}`);
      await use(id);
      console.log(`[workerRunId] DISPOSED ${id}`);
    },
    { scope: 'worker' },
  ],
});

export { expect };
