// Step 2b: pick the "JAVA" cell in the Static Web Table — 4 ways, including within() (Playwright 1.64+).
// Run:  npx playwright test tests/02b-within-java-cell.spec.ts --headed
//
// The table (table[name="BookTable"]):
//   BookName            | Author  | Subject    | Price
//   Learn Selenium      | Amit    | Selenium   | 300
//   Learn Java          | Mukesh  | Java       | 500
//   Learn JS            | Animesh | Javascript | 300
//   Master In Selenium  | Mukesh  | Selenium   | 3000
//   Master In Java      | Amod    | JAVA       | 2000   ← target
//   Master In JS        | Amit    | Javascript | 1000

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('A) exact cell text', async ({ page }) => {
  const table = page.locator('table[name="BookTable"]');

  // Whole text must be exactly "JAVA" (case-sensitive) → 1 cell.
  await expect(table.getByRole('cell', { name: 'JAVA', exact: true })).toHaveText('JAVA');

  // Without exact: substring + case-insensitive → 6 cells:
  // Learn Java, Java, Javascript, Master In Java, JAVA, Javascript.
  await expect(table.getByRole('cell', { name: 'JAVA' })).toHaveCount(6);
});

test('B) chaining: find the row, then the 3rd cell inside it', async ({ page }) => {
  const table = page.locator('table[name="BookTable"]');
  const masterInJavaRow = table.getByRole('row').filter({ hasText: 'Master In Java' });

  // nth is 0-based: 0 = BookName, 1 = Author, 2 = Subject
  await expect(masterInJavaRow.getByRole('cell').nth(2)).toHaveText('JAVA');
});

test('C) within: "3rd cell, within that row"', async ({ page }) => {
  const table = page.locator('table[name="BookTable"]');
  const masterInJavaRow = table.getByRole('row').filter({ hasText: 'Master In Java' });

  // Same result as B, written in the other order.
  // ⚠ The INNER locator must start from `page`, not `table`:
  //   x.within(row) means row.locator(x) — it searches for x INSIDE the row,
  //   and there is no <table> inside a <tr>, so table.getByRole('cell')... would find nothing.
  await expect(page.getByRole('cell').nth(2).within(masterInJavaRow)).toHaveText('JAVA');
});

test('D) within for a whole column, then filter to JAVA', async ({ page }) => {
  const table = page.locator('table[name="BookTable"]');

  // nth(2) is applied inside EACH row → the 3rd cell of every row = the Subject column.
  // (The header row has columnheader, not cell, so it contributes nothing.)
  const subjectColumn = page.getByRole('cell').nth(2).within(table.getByRole('row'));
  await expect(subjectColumn).toHaveText(['Selenium', 'Java', 'Javascript', 'Selenium', 'JAVA', 'Javascript']);

  // Compare: WITHOUT within, nth(2) counts across the whole table → just one cell, "Selenium".
  await expect(table.getByRole('cell').nth(2)).toHaveText('Selenium');

  // Regex /^JAVA$/: whole text, case-sensitive → only "JAVA", not "Java" or "Javascript".
  await expect(subjectColumn.filter({ hasText: /^JAVA$/ })).toHaveText('JAVA');
});
