// Step 4: multiple tabs and popup windows — catch a new tab, switch between tabs, close them.
// Run:  npx playwright test tests/04-multiple-tabs.spec.ts --headed
//
// Key idea: in Playwright a tab, a popup window and a window.open() are all the same thing — a
// `Page`. All tabs opened from one page live in the same `BrowserContext` (same cookies, same
// login). There is no "switchTo()" like Selenium: you just hold a variable for each Page and call
// methods on whichever one you want.

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ─────────────────────────────────────────────────────────────
// 1. Catch ONE new tab opened by a click
// ─────────────────────────────────────────────────────────────

test('New Tab button: catch the popup, work in it, come back', async ({ page }) => {
  // Start waiting BEFORE the click. If you click first, the tab can open before you start
  // listening and the wait hangs until timeout. The two lines below are the standard pattern.
  const newTabPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'New Tab' }).click();
  const newTab = await newTabPromise;

  // The new tab starts at about:blank, then navigates. Wait for it to load before checking it.
  await newTab.waitForLoadState('domcontentloaded');
  await expect(newTab).toHaveURL(/pavantestingtools\.com/);

  // The original tab is still there and still usable — nothing was "switched".
  await expect(page).toHaveTitle('Automation Testing Practice');
  await page.getByPlaceholder('Enter Name').fill('still works');
  await expect(page.getByPlaceholder('Enter Name')).toHaveValue('still works');

  // Close the new tab; the original keeps running.
  await newTab.close();
  expect(newTab.isClosed()).toBe(true);
  expect(page.context().pages()).toHaveLength(1);
});

// ─────────────────────────────────────────────────────────────
// 2. ONE click opens TWO windows
// ─────────────────────────────────────────────────────────────

test('Popup Windows button: one click opens two windows, find each by URL', async ({ page, context }) => {
  // waitForEvent('popup') would only catch the FIRST window. Instead, wait until the context
  // holds 3 pages: the original + 2 popups.
  await page.getByRole('button', { name: 'Popup Windows' }).click();
  await expect.poll(() => context.pages().length, { message: 'original tab + 2 popups' }).toBe(3);

  // context.pages() lists every open tab, in opening order. Never rely on that order for popups
  // opened together — pick each one by something stable, like its URL.
  const popups = context.pages().filter((p) => p !== page);

  // A popup starts at about:blank for a moment, so wait until both have their real URL.
  await expect
    .poll(() => popups.map((p) => p.url()).join(' '), { message: 'both popups navigated' })
    .toMatch(/selenium\.dev.*playwright\.dev|playwright\.dev.*selenium\.dev/);
  const selenium = popups.find((p) => p.url().includes('selenium.dev'));
  const playwright = popups.find((p) => p.url().includes('playwright.dev'));
  expect(selenium, 'selenium.dev window').toBeDefined();
  expect(playwright, 'playwright.dev window').toBeDefined();

  await playwright!.waitForLoadState('domcontentloaded');
  await expect(playwright!).toHaveTitle(/Playwright/);

  await selenium!.waitForLoadState('domcontentloaded');
  await expect(selenium!).toHaveTitle(/Selenium/);

  // Close every popup, keep the original.
  for (const p of popups) await p.close();
  expect(context.pages()).toEqual([page]);
});

// ─────────────────────────────────────────────────────────────
// 3. Open tabs yourself
// ─────────────────────────────────────────────────────────────

test('context.newPage(): two tabs, same context, independent pages', async ({ page, context }) => {
  // A second tab in the SAME context. It shares cookies and storage with `page`, which is why a
  // logged-in user stays logged in across tabs.
  const secondTab = await context.newPage();
  await secondTab.goto('/');

  // Each tab has its own DOM: typing in one does not touch the other.
  await page.getByPlaceholder('Enter Name').fill('Tab one');
  await secondTab.getByPlaceholder('Enter Name').fill('Tab two');
  await expect(page.getByPlaceholder('Enter Name')).toHaveValue('Tab one');
  await expect(secondTab.getByPlaceholder('Enter Name')).toHaveValue('Tab two');

  // bringToFront(): only matters in --headed, when you want to SEE a tab. Actions work on a
  // background tab anyway.
  await page.bringToFront();

  expect(context.pages()).toHaveLength(2);
});

test('shared storage across tabs in one context', async ({ page, context }) => {
  // Write to localStorage in tab 1, read it in tab 2 — same origin, same context, same storage.
  await page.evaluate(() => localStorage.setItem('lesson', 'multiple-tabs'));

  const secondTab = await context.newPage();
  await secondTab.goto('/');
  expect(await secondTab.evaluate(() => localStorage.getItem('lesson'))).toBe('multiple-tabs');
});

test('a NEW context is a separate user: nothing is shared', async ({ page, browser }) => {
  await page.evaluate(() => localStorage.setItem('lesson', 'multiple-tabs'));

  // browser.newContext() is like a fresh incognito window: no cookies, no storage.
  // Use it to test two users at once (e.g. a buyer and a seller chatting).
  const otherUser = await browser.newContext();
  const otherPage = await otherUser.newPage();
  await otherPage.goto('/');
  expect(await otherPage.evaluate(() => localStorage.getItem('lesson'))).toBeNull();

  // Contexts you create yourself are NOT closed for you — close them.
  await otherUser.close();
});

// ─────────────────────────────────────────────────────────────
// 4. Listen for every tab the test opens
// ─────────────────────────────────────────────────────────────

test("context.on('page'): log every tab as it opens", async ({ page, context }) => {
  // Useful when you don't know in advance how many tabs a click will open.
  const opened: string[] = [];
  context.on('page', async (p) => {
    await p.waitForLoadState('domcontentloaded');
    opened.push(new URL(p.url()).hostname);
  });

  await page.getByRole('button', { name: 'Popup Windows' }).click();
  await expect.poll(() => opened.sort()).toEqual(['playwright.dev', 'www.selenium.dev']);
});
