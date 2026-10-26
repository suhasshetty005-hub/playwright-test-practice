// Step 6: iframes and shadow DOM — two kinds of "page inside a page".
// Run:  npx playwright test tests/06-iframes-shadow-dom.spec.ts --headed
//
// Key ideas:
//   iframe     = a separate document. A normal locator can NOT see inside it. You step in with
//                frameLocator() / contentFrame() first, then use locators as usual.
//   shadow DOM = a hidden subtree inside a web component. Playwright's CSS and getBy* locators
//                go through OPEN shadow roots automatically — no special code needed.
//                XPath does not, and nothing reaches into a CLOSED shadow root.
//
// The practice site has a shadow DOM section but no iframes, so the iframe tests build their own
// small page with page.setContent(). That also keeps them working when the site changes.

import { test, expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────
// A small page with iframes, built inside the test
// ─────────────────────────────────────────────────────────────

// srcdoc puts the iframe's HTML inline. &quot; is how a " is written inside an attribute.
const INNER_FORM = `
  <h2>Payment</h2>
  <label>Card number <input id="card"></label>
  <button onclick="document.getElementById('msg').textContent = 'Paid with ' + document.getElementById('card').value">Pay</button>
  <p id="msg"></p>
  <iframe id="nested" title="Terms" srcdoc="<label><input type=checkbox id=agree> I agree</label>"></iframe>
`;

async function openIframePage(page: Page) {
  await page.setContent(`
    <h1>Checkout</h1>
    <p id="outside">Outside the frame</p>
    <iframe id="payment" name="paymentFrame" title="Payment form" srcdoc="${INNER_FORM.replace(/"/g, '&quot;')}"></iframe>
    <iframe id="ads" title="Ads" srcdoc="<p>Buy now!</p>"></iframe>
  `);
}

// ─────────────────────────────────────────────────────────────
// 1. iframes
// ─────────────────────────────────────────────────────────────

test('iframe: a normal locator cannot see inside a frame', async ({ page }) => {
  await openIframePage(page);

  // The card input exists, but it is in another document, so the main page has 0 matches.
  await expect(page.locator('#card')).toHaveCount(0);
  await expect(page.locator('#outside')).toBeVisible();
});

test('iframe: frameLocator() — step in, then use locators as usual', async ({ page }) => {
  await openIframePage(page);

  // frameLocator() is the normal choice: it waits for the frame and retries like any locator.
  const payment = page.frameLocator('#payment');
  await payment.getByLabel('Card number').fill('4111 1111 1111 1111');
  await payment.getByRole('button', { name: 'Pay' }).click();
  await expect(payment.locator('#msg')).toHaveText('Paid with 4111 1111 1111 1111');

  // Back on the main page: no "switch back" needed, just use `page` again.
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
});

test('iframe: locator.contentFrame() — find the <iframe> element first', async ({ page }) => {
  await openIframePage(page);

  // Same result, written as: locate the iframe element by any locator, then go into it.
  // Handy when the frame is easiest to find by its title or role.
  const payment = page.getByTitle('Payment form').contentFrame();
  await payment.getByLabel('Card number').fill('5500 0000 0000 0004');
  await expect(payment.getByLabel('Card number')).toHaveValue('5500 0000 0000 0004');
});

test('iframe: nested frames — chain frameLocator()', async ({ page }) => {
  await openIframePage(page);

  // A frame inside a frame: step in one level at a time.
  const terms = page.frameLocator('#payment').frameLocator('#nested');
  await terms.getByLabel('I agree').check();
  await expect(terms.getByLabel('I agree')).toBeChecked();
});

test('iframe: page.frame() and page.frames() — the Frame object', async ({ page }) => {
  await openIframePage(page);

  // page.frames() lists every frame: the main page + payment + nested + ads = 4.
  expect(page.frames()).toHaveLength(4);

  // page.frame() finds one by its name="" attribute (or by URL). It returns a Frame, which has
  // the same methods as Page: locator(), getByRole(), evaluate()...
  const payment = page.frame({ name: 'paymentFrame' });
  expect(payment).not.toBeNull();
  await payment!.locator('#card').fill('from Frame');
  expect(await payment!.locator('#card').inputValue()).toBe('from Frame');

  // Prefer frameLocator() in tests; use Frame when you need frame-level things like
  // childFrames() or evaluate() inside the frame.
  expect(payment!.childFrames()).toHaveLength(1);
});

// ─────────────────────────────────────────────────────────────
// 2. Shadow DOM — the practice site's "ShadowDOM" section
// ─────────────────────────────────────────────────────────────
//
//   <div id="shadow_host">
//     #shadow-root (open)
//       <span id="shadow_content"><span class="info">Mobiles</span></span>
//       <div id="nested_shadow_host">
//         #shadow-root (open)
//           <div id="nested_shadow_content"><div>Laptops</div></div>
//       </div>
//       <a>Blog</a>  <input type="text">  <input type="checkbox">  <input type="file">

test.describe('shadow DOM on the practice site', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('CSS locators go through an open shadow root automatically', async ({ page }) => {
    // No special syntax: Playwright looks inside open shadow roots for you.
    await expect(page.locator('#shadow_content')).toHaveText('Mobiles');

    // Scoping from the host works too, and reads more clearly.
    const host = page.locator('#shadow_host');
    await expect(host.locator('.info')).toHaveText('Mobiles');
  });

  test('nested shadow roots: still just a normal locator', async ({ page }) => {
    // Two shadow roots deep — no chaining needed (unlike iframes).
    await expect(page.locator('#nested_shadow_content')).toHaveText('Laptops');
  });

  test('getBy* locators work inside shadow DOM', async ({ page }) => {
    const host = page.locator('#shadow_host');
    await expect(host.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', 'https://www.pavantestingtools.com/');
    await expect(host.getByText('Laptops')).toBeVisible();
  });

  test('inputs inside shadow DOM: fill, check, upload', async ({ page }) => {
    const host = page.locator('#shadow_host');

    await host.locator('input[type="text"]').fill('typed inside shadow DOM');
    await expect(host.locator('input[type="text"]')).toHaveValue('typed inside shadow DOM');

    await host.locator('input[type="checkbox"]').check();
    await expect(host.locator('input[type="checkbox"]')).toBeChecked();

    await host.locator('input[type="file"]').setInputFiles({
      name: 'shadow.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    expect(await host.locator('input[type="file"]').evaluate((el: HTMLInputElement) => el.files?.[0]?.name)).toBe(
      'shadow.txt',
    );
  });

  test('XPath does NOT go through shadow DOM', async ({ page }) => {
    // A common interview trap: the same element, found by CSS but not by XPath.
    await expect(page.locator('#shadow_content')).toHaveCount(1);
    await expect(page.locator('xpath=//*[@id="shadow_content"]')).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Closed shadow root — the one case locators cannot reach
// ─────────────────────────────────────────────────────────────

test('closed shadow root: invisible to locators, test what the user sees', async ({ page }) => {
  await page.setContent(`
    <div id="open-host"></div>
    <div id="closed-host"></div>
    <script>
      document.getElementById('open-host').attachShadow({ mode: 'open' }).innerHTML = '<b class="label">Open</b>';
      document.getElementById('closed-host').attachShadow({ mode: 'closed' }).innerHTML = '<b class="label">Closed</b>';
    </script>
  `);

  await expect(page.locator('#open-host .label')).toHaveText('Open');

  // mode: 'closed' hides the root even from JavaScript (host.shadowRoot is null), so no
  // locator can get in. In practice: ask the developers for an open root or a test hook, or
  // check the result the user sees somewhere else on the page.
  await expect(page.locator('#closed-host .label')).toHaveCount(0);
  expect(await page.locator('#closed-host').evaluate((el) => el.shadowRoot)).toBeNull();
});
