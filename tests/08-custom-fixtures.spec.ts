// Step 8: custom fixtures. The fixtures themselves are in fixtures/my-fixtures.ts.
// Run:  npx playwright test tests/08-custom-fixtures.spec.ts --headed
//
// Watch the terminal: the [timeTest] and [workerRunId] lines show WHEN each fixture runs.

// Import `test` and `expect` from OUR fixtures file, not from '@playwright/test'.
// That is the only change needed to get the custom fixtures.
import { test, expect } from '../fixtures/my-fixtures';

// ─────────────────────────────────────────────────────────────
// 1. A data fixture: no browser needed
// ─────────────────────────────────────────────────────────────

test('formData: a fixture can be plain data', async ({ formData }) => {
  // This test never asks for `page`, so no browser page is opened at all.
  expect(formData.name).toBe('Suhas');
  expect(formData.email).toBe('suhas@example.com');
});

// ─────────────────────────────────────────────────────────────
// 2. A page-object fixture: the test starts on the right page, ready to act
// ─────────────────────────────────────────────────────────────

test('dataEntryForm: page object arrives with the site already open', async ({ dataEntryForm, formData }) => {
  // No page.goto() and no `new DataEntryForm(page)` here: the fixtures did both.
  await dataEntryForm.fill(formData);

  await expect(dataEntryForm.name).toHaveValue('Suhas');
  await expect(dataEntryForm.email).toHaveValue('suhas@example.com');
  await expect(dataEntryForm.phone).toHaveValue('9876543210');
  await expect(dataEntryForm.address).toHaveValue('Bengaluru, India');
});

test('homePage: the built-in page, already navigated', async ({ homePage }) => {
  await expect(homePage).toHaveTitle('Automation Testing Practice');
});

// ─────────────────────────────────────────────────────────────
// 3. Overriding an option fixture with test.use()
// ─────────────────────────────────────────────────────────────

test.describe('a different user', () => {
  // Every test in this block gets userName = 'Priya'. `formData` uses `userName`,
  // so its name and email change too, without touching the fixture code.
  test.use({ userName: 'Priya' });

  test('formData follows the overridden option', async ({ formData }) => {
    expect(formData.name).toBe('Priya');
    expect(formData.email).toBe('priya@example.com');
  });

  test('form is filled with the overridden user', async ({ dataEntryForm, formData }) => {
    await dataEntryForm.fill(formData);
    await expect(dataEntryForm.name).toHaveValue('Priya');
  });
});

// ─────────────────────────────────────────────────────────────
// 4. A worker fixture: built once, shared by the tests in that worker
// ─────────────────────────────────────────────────────────────

test('workerRunId: first test in this worker', async ({ workerRunId }) => {
  // In the terminal, [workerRunId] CREATED appears once per worker, not once per test.
  expect(workerRunId).toMatch(/^worker-\d+-\d+$/);
});

test('workerRunId: second test gets the same value', async ({ workerRunId }) => {
  expect(workerRunId).toMatch(/^worker-\d+-\d+$/);
});
