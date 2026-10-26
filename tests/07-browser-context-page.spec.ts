// Step 7: Browser, BrowserContext and Page — print live information about each one.
// Run:  npx playwright test tests/07-browser-context-page.spec.ts --workers=1 --reporter=list
//       (--workers=1 so all three tests share one worker, and you can see what is reused)
//
//   Browser          one browser process, started once per WORKER and shared by its tests
//    └─ BrowserContext  an incognito-like session (cookies, storage), NEW for every test
//        └─ Page          one tab inside that context, NEW for every test

import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

// Give each object a short ID the first time we see it, so we can tell whether two tests got the
// SAME object or a NEW one. The WeakMap lives in the worker process, like the browser does.
const ids = new WeakMap<object, string>();
const counters = { browser: 0, context: 0, page: 0 };
function idOf(obj: Browser | BrowserContext | Page, kind: keyof typeof counters): string {
  if (!ids.has(obj)) ids.set(obj, `${kind}#${++counters[kind]}`);
  return ids.get(obj)!;
}

async function report(label: string, browser: Browser, context: BrowserContext, page: Page) {
  // Read a few things from INSIDE the page, the way the website sees the browser.
  const inPage = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localStorageKeys: Object.keys(localStorage),
  }));
  const cookies = await context.cookies();

  console.log(`
════════ ${label}  (worker ${test.info().workerIndex}) ════════
BROWSER   ${idOf(browser, 'browser')}
  type ............. ${browser.browserType().name()}
  version .......... ${browser.version()}
  connected ........ ${browser.isConnected()}
  open contexts .... ${browser.contexts().length}

CONTEXT   ${idOf(context, 'context')}
  belongs to ....... ${idOf(context.browser()!, 'browser')}
  open pages ....... ${context.pages().length}
  cookies .......... ${cookies.length} (${cookies.map((c) => c.name).join(', ') || 'none'})
  user agent ....... ${inPage.userAgent.slice(0, 70)}…
  language ......... ${inPage.language}
  timezone ......... ${inPage.timezone}

PAGE      ${idOf(page, 'page')}
  belongs to ....... ${idOf(page.context(), 'context')}
  url .............. ${page.url()}
  title ............ ${await page.title()}
  viewport ......... ${JSON.stringify(page.viewportSize())}
  frames ........... ${page.frames().length}
  localStorage ..... ${JSON.stringify(inPage.localStorageKeys)}
  closed ........... ${page.isClosed()}`);
}

test('1) the three objects Playwright gives a test', async ({ browser, context, page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('setByTest1', 'yes'));
  await report('TEST 1', browser, context, page);

  // The chain: page → its context → its browser.
  expect(page.context()).toBe(context);
  expect(context.browser()).toBe(browser);
});

test('2) next test: same browser, but a brand-new context and page', async ({ browser, context, page }) => {
  await page.goto('/');
  await report('TEST 2', browser, context, page);

  // Test 1 saved something in localStorage. This test's new context starts empty.
  expect(await page.evaluate(() => localStorage.getItem('setByTest1'))).toBeNull();
});

test('3) open more: a second tab, and a second context', async ({ browser, context, page }) => {
  await page.goto('/');

  // Second tab in the SAME context: shares cookies and storage with `page`.
  const secondTab = await context.newPage();
  await secondTab.goto('/');

  // A second context: a separate user, with its own settings.
  const mobileUser = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    userAgent: 'Mozilla/5.0 (iPhone) PracticeBot/1.0',
  });
  const mobilePage = await mobileUser.newPage();
  await mobilePage.goto('/');

  await report('TEST 3 — default context, tab 1', browser, context, page);
  await report('TEST 3 — default context, tab 2', browser, context, secondTab);
  await report('TEST 3 — second context (mobile, German, Berlin)', browser, mobileUser, mobilePage);

  expect(browser.contexts()).toHaveLength(2);
  await mobileUser.close(); // contexts you create yourself, you close yourself
});
