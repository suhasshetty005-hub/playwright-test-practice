// Step 3: form inputs — text boxes, radios, checkboxes, dropdowns, date pickers.
// Run:  npx playwright test tests/03-form-inputs.spec.ts --headed

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ─────────────────────────────────────────────────────────────
// 1. Text boxes and text area
// ─────────────────────────────────────────────────────────────

test('text box: fill, clear, type key by key, read value', async ({ page }) => {
  const name = page.getByPlaceholder('Enter Name');

  // Starts empty and editable
  await expect(name).toBeEmpty();
  await expect(name).toBeEditable();

  // fill(): clears, then sets the whole value in one go (fast, the normal choice)
  await name.fill('Suhas');
  await expect(name).toHaveValue('Suhas');

  // fill() again REPLACES the text, it does not append
  await name.fill('Suhas Shetty');
  await expect(name).toHaveValue('Suhas Shetty');

  // clear(): empties the field
  await name.clear();
  await expect(name).toBeEmpty();

  // pressSequentially(): types one key at a time, like a real user.
  // Use it only when the page reacts to each key press (autocomplete, live search, input masks).
  await name.pressSequentially('QA', { delay: 100 }); // 100 ms between keys, so you can watch it in --headed
  await expect(name).toHaveValue('QA');

  // press(): a single key or shortcut
  await name.press('Control+A');
  await name.press('Backspace');
  await expect(name).toBeEmpty();

  // inputValue(): read the value into a variable when you need it in code (no retry, unlike expect)
  await name.fill('read me');
  const value = await name.inputValue();
  expect(value.toUpperCase()).toBe('READ ME');
});

test('text area: multi-line text', async ({ page }) => {
  const address = page.getByLabel('Address:');

  // \n is a line break inside a textarea
  await address.fill('12 MG Road\nBengaluru\nIndia');
  await expect(address).toHaveValue('12 MG Road\nBengaluru\nIndia');
});

test('fill the whole Data Entry form', async ({ page }) => {
  await page.getByPlaceholder('Enter Name').fill('Suhas');
  await page.getByPlaceholder('Enter EMail').fill('suhas@example.com');
  await page.getByPlaceholder('Enter Phone').fill('9876543210');
  await page.getByLabel('Address:').fill('Bengaluru, India');

  await expect(page.getByPlaceholder('Enter Name')).toHaveValue('Suhas');
  await expect(page.getByPlaceholder('Enter EMail')).toHaveValue('suhas@example.com');
  await expect(page.getByPlaceholder('Enter Phone')).toHaveValue('9876543210');
  await expect(page.getByLabel('Address:')).toHaveValue('Bengaluru, India');
});

// ─────────────────────────────────────────────────────────────
// 2. Radio buttons — only one in a group can be selected
// ─────────────────────────────────────────────────────────────

test('radio: selecting one unselects the other', async ({ page }) => {
  const male = page.getByRole('radio', { name: 'Male', exact: true });
  const female = page.getByRole('radio', { name: 'Female' });

  // Nothing selected at the start
  await expect(male).not.toBeChecked();
  await expect(female).not.toBeChecked();

  await male.check();
  await expect(male).toBeChecked();
  await expect(female).not.toBeChecked();

  // Same group (name="gender"), so checking Female unchecks Male automatically
  await female.check();
  await expect(female).toBeChecked();
  await expect(male).not.toBeChecked();

  // ⚠ male.uncheck() would FAIL: a radio cannot be unchecked by clicking it.
});

// ─────────────────────────────────────────────────────────────
// 3. Checkboxes — any number can be selected
// ─────────────────────────────────────────────────────────────

test('checkbox: check, uncheck, setChecked', async ({ page }) => {
  const sunday = page.getByRole('checkbox', { name: 'Sunday' });

  await sunday.check();
  await expect(sunday).toBeChecked();

  // check() on an already-checked box does nothing (it does NOT toggle). click() would toggle.
  await sunday.check();
  await expect(sunday).toBeChecked();

  await sunday.uncheck();
  await expect(sunday).not.toBeChecked();

  // setChecked(true/false): handy when the state comes from test data
  const wantChecked = true;
  await sunday.setChecked(wantChecked);
  await expect(sunday).toBeChecked();
});

test('checkbox: loop over a list of days', async ({ page }) => {
  const weekend = ['Saturday', 'Sunday'];
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Check only the weekend days
  for (const day of weekend) {
    await page.getByRole('checkbox', { name: day }).check();
  }

  // Weekend checked, weekdays not
  for (const day of allDays) {
    const box = page.getByRole('checkbox', { name: day });
    if (weekend.includes(day)) {
      await expect(box).toBeChecked();
    } else {
      await expect(box).not.toBeChecked();
    }
  }
});

test('checkbox: check ALL of them without listing names', async ({ page }) => {
  // The 7 day checkboxes all have class form-check-input and type checkbox
  const dayBoxes = page.locator('input.form-check-input[type="checkbox"]');
  await expect(dayBoxes).toHaveCount(7);

  // .all() turns a multi-element locator into an array you can loop over
  for (const box of await dayBoxes.all()) {
    await box.check();
  }
  for (const box of await dayBoxes.all()) {
    await expect(box).toBeChecked();
  }
});

// ─────────────────────────────────────────────────────────────
// 4. Single-select dropdown (<select>) → role "combobox"
// ─────────────────────────────────────────────────────────────

test('single dropdown: select by label, value, index', async ({ page }) => {
  const country = page.getByRole('combobox', { name: 'Country:' });

  // Default selection
  await expect(country).toHaveValue('usa');

  // By visible text
  await country.selectOption({ label: 'Japan' });
  await expect(country).toHaveValue('japan');

  // By value attribute
  await country.selectOption({ value: 'germany' });
  await expect(country).toHaveValue('germany');

  // By position (0-based) — fragile, use rarely
  await country.selectOption({ index: 1 });
  await expect(country).toHaveValue('canada');

  // Check the visible text of the selected option
  await expect(country.locator('option:checked')).toHaveText('Canada');
});

test('single dropdown: check the list of options', async ({ page }) => {
  const options = page.getByRole('combobox', { name: 'Country:' }).locator('option');

  await expect(options).toHaveCount(10);

  // toHaveText with an array checks every option, in order.
  // (Each option's text has spaces/new lines around it in the HTML; toHaveText ignores those.)
  await expect(options).toHaveText([
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
    'Australia', 'Japan', 'China', 'Brazil', 'India',
  ]);

  // Or just check that one option exists
  await expect(options.filter({ hasText: 'India' })).toHaveCount(1);
});

// ─────────────────────────────────────────────────────────────
// 5. Multi-select (<select multiple>) → role "listbox"
// ─────────────────────────────────────────────────────────────

test('multi-select: pick several, check them, clear them', async ({ page }) => {
  const animals = page.getByRole('listbox', { name: 'Sorted List:' });

  // Pass an ARRAY to select several at once (by value or label)
  await animals.selectOption(['cat', 'dog', 'zebra']);
  await expect(animals).toHaveValues(['cat', 'dog', 'zebra']); // toHaveValues, plural

  // Selecting again REPLACES the selection, it does not add to it
  await animals.selectOption(['lion']);
  await expect(animals).toHaveValues(['lion']);

  // Empty array = deselect everything
  await animals.selectOption([]);
  await expect(animals).toHaveValues([]);
});

test('multi-select: "Sorted List" really is sorted', async ({ page }) => {
  const texts = await page.getByRole('listbox', { name: 'Sorted List:' }).locator('option').allTextContents();
  const trimmed = texts.map(t => t.trim());

  // Copy the array, sort the copy, compare. ([...x] copies; .sort() alone would change the original.)
  const sorted = [...trimmed].sort();
  expect(trimmed).toEqual(sorted);
});

test('multi-select: "Colors" list has duplicate options (a real data bug)', async ({ page }) => {
  const texts = (await page.getByRole('listbox', { name: 'Colors:' }).locator('option').allTextContents())
    .map(t => t.trim());

  // Keep every item whose FIRST position (indexOf) is not its own position → it appeared earlier = duplicate.
  const duplicates = texts.filter((t, i) => texts.indexOf(t) !== i);
  expect(duplicates).toEqual(['Red', 'Green']);
  // In a real project this test would assert `toEqual([])` and FAIL, and you would raise a bug.
});

// ─────────────────────────────────────────────────────────────
// 6. Custom dropdown (NOT a <select>) — "Scrolling DropDown"
// ─────────────────────────────────────────────────────────────

test('custom dropdown: click to open, click an option', async ({ page }) => {
  const combo = page.getByPlaceholder('Select an item');
  const list = page.locator('#dropdown');

  // selectOption() would fail here: it's an <input> + <div>s, not a <select>.
  await expect(list).toBeHidden();
  await combo.click();
  await expect(list).toBeVisible();

  // The options are plain <div class="option"> with no role → use getByText inside the list.
  // exact: true, otherwise 'Item 5' also matches 'Item 50' … 'Item 59'.
  await list.getByText('Item 5', { exact: true }).click();

  await expect(combo).toHaveValue('Item 5');
  await expect(list).toBeHidden();
});

// ─────────────────────────────────────────────────────────────
// 7. Date pickers — 3 different kinds on this page
// ─────────────────────────────────────────────────────────────

test('date picker 1 (jQuery, typing allowed): just fill it', async ({ page }) => {
  const dp1 = page.locator('#datepicker');

  // If the input accepts typing, filling it is the fastest and most stable option.
  await dp1.fill('12/25/2026');
  await expect(dp1).toHaveValue('12/25/2026');
});

test('date picker 1 (jQuery): pick a date by clicking through the calendar', async ({ page }) => {
  // Use this when you must test the calendar widget itself.
  const targetMonth = 'March';
  const targetYear = '2027';
  const targetDay = '15';

  await page.locator('#datepicker').click();

  const calendar = page.locator('#ui-datepicker-div');
  await expect(calendar).toBeVisible();

  // Click "Next" until the header shows the target month and year.
  // The header text is like "October 2026". The loop has a safety limit so it can't run forever.
  for (let i = 0; i < 24; i++) {
    const month = await calendar.locator('.ui-datepicker-month').textContent();
    const year = await calendar.locator('.ui-datepicker-year').textContent();
    if (month === targetMonth && year === targetYear) break;
    await calendar.getByTitle('Next').click();
  }
  await expect(calendar.locator('.ui-datepicker-title')).toHaveText(`${targetMonth} ${targetYear}`);

  // Day cells are <a>15</a>. Always use exact: true for day numbers:
  // without it, '1' would also match 10–19 and 21, 31; '15' is safe only by luck.
  await calendar.locator('td a').getByText(targetDay, { exact: true }).click();

  await expect(page.locator('#datepicker')).toHaveValue('03/15/2027');
  await expect(calendar).toBeHidden();
});

test('date picker 2 (readonly, dd/mm/yyyy): use the month/year dropdowns', async ({ page }) => {
  const dp2 = page.locator('#txtDate');

  // readonly="readonly" → fill() refuses to type into it. Prove it:
  await expect(dp2).not.toBeEditable();

  await dp2.click();
  const calendar = page.locator('#ui-datepicker-div');

  // This calendar has real <select>s for month and year → selectOption works.
  await calendar.locator('select.ui-datepicker-year').selectOption('2025');
  await calendar.locator('select.ui-datepicker-month').selectOption({ label: 'Jun' });
  await calendar.locator('td a').getByText('10', { exact: true }).click();

  // dd/mm/yyyy: 10 June 2025
  await expect(dp2).toHaveValue('10/06/2025');
});

test('date picker 3 (native <input type="date">): date range + result', async ({ page }) => {
  const start = page.getByPlaceholder('Start Date');
  const end = page.getByPlaceholder('End Date');
  const submit = page.locator('.submit-btn'); // 5 "Submit" buttons on the page; this one has a unique class
  const result = page.locator('#result');

  // Native date inputs ALWAYS take 'yyyy-mm-dd' in fill(), whatever format the browser displays.
  await start.fill('2026-01-01');
  await end.fill('2026-01-31');
  await expect(start).toHaveValue('2026-01-01');

  await submit.click();
  await expect(result).toHaveText('You selected a range of 30 days.');
});

test('date picker 3: validation messages', async ({ page }) => {
  const start = page.getByPlaceholder('Start Date');
  const end = page.getByPlaceholder('End Date');
  const submit = page.locator('.submit-btn');
  const result = page.locator('#result');

  // Nothing filled
  await submit.click();
  await expect(result).toHaveText('Please select both start and end dates.');

  // Start after end
  await start.fill('2026-12-31');
  await end.fill('2026-01-01');
  await submit.click();
  await expect(result).toHaveText('End date must be after start date.');
});
