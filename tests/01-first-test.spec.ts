// Step 1: your first Playwright tests.
// Run:  npx playwright test tests/01-first-test.spec.ts --headed

// `test` defines a test case, `expect` makes assertions.
// Both come from @playwright/test (the test runner), not from `playwright` (the bare library).
import { test, expect } from '@playwright/test';

// Every test gets a fresh `page` (a new browser tab in a clean, isolated context).
// The `{ page }` in the arguments is a "fixture": Playwright creates it before the test and closes it after.
test('home page has the right title', async ({ page }) => {
  // goto('/') opens baseURL from playwright.config.ts.
  // Every Playwright action is async, so always `await` it.
  await page.goto('/');

  // Web-first assertion: it keeps retrying until the title matches,
  // or fails after the expect timeout (5s in our config). No manual waits needed.
  await expect(page).toHaveTitle('Automation Testing Practice');
});

test('home page URL is correct', async ({ page }) => {
  await page.goto('/');

  // A regex matches part of the URL, so trailing slashes or query strings don't break it.
  await expect(page).toHaveURL(/testautomationpractice\.blogspot\.com/);
});

test('main heading is visible', async ({ page }) => {
  await page.goto('/');

  // A locator describes HOW to find an element. Nothing is looked up until you act or assert on it.
  // getByRole is the recommended way: it finds elements the way a user or screen reader sees them.
  const heading = page.getByRole('heading', { name: 'Automation Testing Practice' });

  await expect(heading).toBeVisible();
});

test('type into a text box and read the value back', async ({ page }) => {
  await page.goto('/');

  // CSS selector by id. Fine for learning; step 2 covers when to prefer getByRole / getByLabel.
  const nameBox = page.locator('#name');

  // fill() clears the field and then types the text.
  await nameBox.fill('Suhas');

  // toHaveValue checks what is inside an input (toHaveText is for an element's visible text).
  await expect(nameBox).toHaveValue('Suhas');
});
