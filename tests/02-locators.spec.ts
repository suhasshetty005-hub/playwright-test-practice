// Step 2: locators — every way to find an element, practised on the same page.
// Run:  npx playwright test tests/02-locators.spec.ts --headed
//
// Preferred order (most user-facing first):
//   getByRole > getByLabel > getByPlaceholder > getByText > getByAltText/getByTitle > getByTestId > CSS > XPath
//
// Tip: `npx playwright codegen https://testautomationpractice.blogspot.com/` and use the
// "Pick locator" button to see what Playwright would choose for any element.

import { test, expect } from '@playwright/test';

// Every test in this file starts on the home page.
// (Hooks like beforeEach get their own step later; for now just read it as "run this first".)
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ─────────────────────────────────────────────────────────────
// 1. getByRole — role + accessible name
// ─────────────────────────────────────────────────────────────

test('getByRole: links, radios, checkboxes, dropdowns, buttons', async ({ page }) => {
  // <a href="...">Udemy Courses</a>  → role "link", name = its text
  await expect(page.getByRole('link', { name: 'Udemy Courses' })).toBeVisible();

  // <input type="radio" id="male"> with <label for="male">Male</label> → role "radio", name from the label
  await page.getByRole('radio', { name: 'Male', exact: true }).check();
  await expect(page.getByRole('radio', { name: 'Male', exact: true })).toBeChecked();
  // Why exact: true? Name matching is substring + case-insensitive by default,
  // so 'Male' would ALSO match 'Female' → 2 elements → strict-mode error on check().

  // <input type="checkbox" id="monday"> → role "checkbox"
  await page.getByRole('checkbox', { name: 'Monday' }).check();
  await expect(page.getByRole('checkbox', { name: 'Monday' })).toBeChecked();

  // <select id="country"> (single select) → role "combobox"
  await page.getByRole('combobox', { name: 'Country:' }).selectOption('India');
  await expect(page.getByRole('combobox', { name: 'Country:' })).toHaveValue('india'); // value attr, not label

  // <select multiple id="colors"> → role "listbox"
  await expect(page.getByRole('listbox', { name: 'Colors:' })).toBeVisible();

  // Heading by level: <h2>Upload Files</h2>
  await expect(page.getByRole('heading', { name: 'Upload Files', level: 2 })).toBeVisible();
});

// ─────────────────────────────────────────────────────────────
// 2. getByLabel — form fields connected to a <label>
// ─────────────────────────────────────────────────────────────

test('getByLabel: works only when the label is really connected', async ({ page }) => {
  // <label for="textarea">Address:</label> + <textarea id="textarea"> → connected, works.
  await page.getByLabel('Address:').fill('Bengaluru, India');
  await expect(page.getByLabel('Address:')).toHaveValue('Bengaluru, India');

  // <label for="country">Country:</label> + <select id="country">
  await expect(page.getByLabel('Country:')).toBeVisible();

  // <label for="amount">Price range:</label> + <input id="amount" readonly>
  await expect(page.getByLabel('Price range:')).toHaveValue('$75 - $300');

  // REAL-WORLD BUG on this page: <label for="textbox">Name:</label> but the input is id="name".
  // The `for` points at nothing, so the label is NOT connected and getByLabel finds nothing.
  await expect(page.getByLabel('Name:')).toHaveCount(0);
  // → Use getByPlaceholder for that field instead (next test). In a real project, report it as an a11y bug.
});

// ─────────────────────────────────────────────────────────────
// 3. getByPlaceholder — inputs that show hint text
// ─────────────────────────────────────────────────────────────

test('getByPlaceholder: fill Name, Email, Phone', async ({ page }) => {
  await page.getByPlaceholder('Enter Name').fill('Suhas');
  await page.getByPlaceholder('Enter EMail').fill('suhas@example.com');
  await page.getByPlaceholder('Enter Phone').fill('9876543210');

  await expect(page.getByPlaceholder('Enter Name')).toHaveValue('Suhas');
  await expect(page.getByPlaceholder('Enter EMail')).toHaveValue('suhas@example.com');
  await expect(page.getByPlaceholder('Enter Phone')).toHaveValue('9876543210');

  // Same field, found via role: when there is no label, the placeholder becomes the accessible name.
  await expect(page.getByRole('textbox', { name: 'Enter Name' })).toHaveValue('Suhas');
});

// ─────────────────────────────────────────────────────────────
// 4. getByText — non-interactive text (paragraphs, spans, labels, messages)
// ─────────────────────────────────────────────────────────────

test('getByText: substring vs exact vs regex', async ({ page }) => {
  // Substring, case-insensitive (default)
  await expect(page.getByText('for selenium, cypress')).toBeVisible();

  // exact: true → whole text, case-sensitive
  await expect(page.getByText('Drag me to my target', { exact: true })).toBeVisible();

  // Regex → flexible patterns
  await expect(page.getByText(/^Move the mouse over the button/)).toBeVisible();

  // The "Mobile Labels" are plain <label> elements without inputs → getByText is the natural choice
  await expect(page.getByText('Real Me')).toBeVisible();

  // ⚠ For buttons and links prefer getByRole: getByText('Submit') would hit several elements.
});

// ─────────────────────────────────────────────────────────────
// 5. CSS selectors — page.locator('css')
// ─────────────────────────────────────────────────────────────

test('CSS: id, class, attribute, descendant, :has-text', async ({ page }) => {
  // #id
  await page.locator('#email').fill('css@example.com');
  await expect(page.locator('#email')).toHaveValue('css@example.com');

  // tag.class
  await expect(page.locator('button.start')).toHaveText('START');

  // [attribute="value"]
  await expect(page.locator('input[placeholder="Enter Phone"]')).toBeVisible();
  await expect(page.locator('table[name="BookTable"]')).toBeVisible();

  // Descendant: "a with class link inside #laptops"
  await expect(page.locator('#laptops a.link')).toHaveCount(3);

  // Playwright-only CSS extension: :has-text()
  await expect(page.locator('#laptops a:has-text("Dell")')).toHaveAttribute('href', 'https://www.dell.com/');
});

// ─────────────────────────────────────────────────────────────
// 6. XPath — page.locator('//...')  (strings starting with // or xpath= are treated as XPath)
// ─────────────────────────────────────────────────────────────

test('XPath: attribute, text(), contains(), axes', async ({ page }) => {
  // By attribute
  await expect(page.locator('//input[@id="phone"]')).toBeVisible();

  // By exact text
  await expect(page.locator('//button[text()="Copy Text"]')).toBeVisible();

  // contains()
  await expect(page.locator('//a[contains(@href, "lenovo")]')).toHaveText('Lenovo');

  // Axis: the price cell in the row whose book name is "Learn Java"
  // (go to the <td> with that text, then to its 3rd following sibling)
  const price = page.locator('//table[@name="BookTable"]//td[text()="Learn Java"]/following-sibling::td[3]');
  await expect(price).toHaveText('500');

  // XPath works, but it is long and tied to the DOM structure. Compare with the filter() version below.
});

// ─────────────────────────────────────────────────────────────
// 7. Strict mode + nth / first / last
// ─────────────────────────────────────────────────────────────

test('nth, first, last: picking one of many', async ({ page }) => {
  const submitButtons = page.getByRole('button', { name: 'Submit' });

  // 5 buttons are called "Submit" on this page.
  await expect(submitButtons).toHaveCount(5);

  // Strict mode: acting on a locator that matches >1 element throws. Uncomment to see the error:
  // await submitButtons.click();

  // nth is 0-based
  await expect(submitButtons.first()).toHaveClass('submit-btn');
  await expect(submitButtons.nth(2)).toHaveAttribute('id', 'btn1');
  await expect(submitButtons.last()).toHaveAttribute('id', 'btn3');

  // ⚠ nth depends on page ORDER. If a button is added above, your test clicks the wrong one.
  // Prefer narrowing by context (next tests) and use nth only when position is what you mean.
});

// ─────────────────────────────────────────────────────────────
// 8. Chaining — search inside another locator
// ─────────────────────────────────────────────────────────────

test('chaining: scope a search to a section', async ({ page }) => {
  // Instead of "the 4th Submit on the page", say "the Submit inside Section 2".
  const section2 = page.locator('#section2');

  await section2.getByRole('textbox').fill('typed in section 2');
  await expect(section2.getByRole('textbox')).toHaveValue('typed in section 2');
  await expect(section2.getByRole('button', { name: 'Submit' })).toHaveAttribute('id', 'btn2');
});

// ─────────────────────────────────────────────────────────────
// 9. filter — narrow a list by text or by what it contains
// ─────────────────────────────────────────────────────────────

test('filter: hasText, has, hasNot', async ({ page }) => {
  const bookRows = page.locator('table[name="BookTable"]').getByRole('row');

  // 1 header row + 6 data rows
  await expect(bookRows).toHaveCount(7);

  // hasText: rows that mention Mukesh
  await expect(bookRows.filter({ hasText: 'Mukesh' })).toHaveCount(2);

  // Same "Learn Java price" as the XPath test, but readable:
  const learnJavaRow = bookRows.filter({ hasText: 'Learn Java' });
  await expect(learnJavaRow.getByRole('cell').nth(3)).toHaveText('500');

  // has: rows that CONTAIN a matching element (here, a cell with exact text "Selenium")
  const seleniumRows = bookRows.filter({ has: page.getByRole('cell', { name: 'Selenium', exact: true }) });
  await expect(seleniumRows).toHaveCount(2);

  // hasNot: data rows without a checkbox → none in the product table, so 0
  const productRows = page.locator('#productTable tbody tr');
  await expect(productRows.filter({ hasNot: page.getByRole('checkbox') })).toHaveCount(0);

  // Combining filter + chaining: tick the checkbox in the "Tablet" row
  await productRows.filter({ hasText: 'Tablet' }).getByRole('checkbox').check();
  await expect(productRows.filter({ hasText: 'Tablet' }).getByRole('checkbox')).toBeChecked();
});

test('filter on a DYNAMIC table: rows AND columns move, the locator still works', async ({ page }) => {
  // In #taskTable the row order, the column order and the values all change on every page load.
  // So neither "3rd row" nor "3rd column" is safe.

  // Rows: find the row by its content, not its position.
  const chromeRow = page.locator('#taskTable tbody tr').filter({ hasText: 'Chrome' });
  await expect(chromeRow).toHaveCount(1);

  // Columns: read the header texts, then find where "CPU (%)" is THIS time.
  // allTextContents() returns string[] right now (no auto-wait/retry, unlike expect).
  const headers = await page.locator('#taskTable thead th').allTextContents();
  const cpuIndex = headers.indexOf('CPU (%)');
  expect(cpuIndex).toBeGreaterThan(-1); // plain (non-web-first) assertion on a value

  // The number is random, so check its shape: e.g. "3.9%"
  await expect(chromeRow.getByRole('cell').nth(cpuIndex)).toHaveText(/^\d+(\.\d+)?%$/);
});
