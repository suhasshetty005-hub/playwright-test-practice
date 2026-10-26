// Step 5: file upload — one file, several files, files built in memory, and the file chooser.
// Run:  npx playwright test tests/05-file-upload.spec.ts --headed
//
// Key idea: Playwright never opens the OS file dialog. setInputFiles() puts files straight into an
// <input type="file">, so uploads are fast and work headless. The sample files live in test-data/.

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Build paths from this file's folder, so the test works no matter where you run it from.
const DATA = path.join(__dirname, '..', 'test-data');
const TXT = path.join(DATA, 'sample.txt');
const CSV = path.join(DATA, 'users.csv');
const JSON_FILE = path.join(DATA, 'config.json');

// The page reports each file's size in bytes, so read the real size instead of hard-coding it.
const sizeOf = (file: string) => fs.statSync(file).size;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ─────────────────────────────────────────────────────────────
// 1. Single file
// ─────────────────────────────────────────────────────────────

test('single file: upload one file and check name, size and type', async ({ page }) => {
  const input = page.locator('#singleFileInput');

  // setInputFiles(): select a file from disk. No click on the input, no OS dialog.
  await input.setInputFiles(TXT);

  // The file is now on the input — check it before submitting.
  expect(await input.evaluate((el: HTMLInputElement) => el.files?.[0]?.name)).toBe('sample.txt');

  await page.getByRole('button', { name: 'Upload Single File' }).click();
  await expect(page.locator('#singleFileStatus')).toHaveText(
    `Single file selected: sample.txt, Size: ${sizeOf(TXT)} bytes, Type: text/plain`,
  );
});

test('single file: submit with nothing selected shows an error', async ({ page }) => {
  // Negative test: always check what happens when the user skips the upload.
  await page.getByRole('button', { name: 'Upload Single File' }).click();
  await expect(page.locator('#singleFileStatus')).toHaveText('No file selected.');
});

test('single file: replace and clear the selection', async ({ page }) => {
  const input = page.locator('#singleFileInput');
  const fileName = () => input.evaluate((el: HTMLInputElement) => el.files?.[0]?.name ?? null);

  await input.setInputFiles(TXT);
  expect(await fileName()).toBe('sample.txt');

  // Calling it again REPLACES the selection, it does not add to it.
  await input.setInputFiles(CSV);
  expect(await fileName()).toBe('users.csv');

  // An empty array clears the input — like the user removing the file.
  await input.setInputFiles([]);
  expect(await fileName()).toBeNull();

  await page.getByRole('button', { name: 'Upload Single File' }).click();
  await expect(page.locator('#singleFileStatus')).toHaveText('No file selected.');
});

// ─────────────────────────────────────────────────────────────
// 2. Multiple files
// ─────────────────────────────────────────────────────────────

test('multiple files: upload three files at once', async ({ page }) => {
  // Pass an ARRAY of paths. Only works on an input with the `multiple` attribute.
  const files = [TXT, CSV, JSON_FILE];
  await page.locator('#multipleFilesInput').setInputFiles(files);

  await page.getByRole('button', { name: 'Upload Multiple Files' }).click();

  const status = page.locator('#multipleFilesStatus');
  await expect(status).toContainText('Multiple files selected:');
  // One check per file, so a failure tells you WHICH file is wrong.
  await expect(status).toContainText(`sample.txt, Size: ${sizeOf(TXT)} bytes, Type: text/plain`);
  await expect(status).toContainText(`users.csv, Size: ${sizeOf(CSV)} bytes, Type: text/csv`);
  await expect(status).toContainText(`config.json, Size: ${sizeOf(JSON_FILE)} bytes, Type: application/json`);
});

test('multiple files: count the selected files', async ({ page }) => {
  const input = page.locator('#multipleFilesInput');
  await input.setInputFiles([TXT, CSV]);

  // Read the list of names straight from the input.
  const names = await input.evaluate((el: HTMLInputElement) => Array.from(el.files ?? []).map((f) => f.name));
  expect(names).toEqual(['sample.txt', 'users.csv']);
});

test('multiple files: submit with nothing selected shows an error', async ({ page }) => {
  await page.getByRole('button', { name: 'Upload Multiple Files' }).click();
  await expect(page.locator('#multipleFilesStatus')).toHaveText('No files selected.');
});

// ─────────────────────────────────────────────────────────────
// 3. Files built in memory (no file on disk)
// ─────────────────────────────────────────────────────────────

test('in-memory file: create the file inside the test', async ({ page }) => {
  // Useful for generated data: a unique name per run, or a file of an exact size.
  const content = 'id,amount\n1,250\n2,990\n';
  await page.locator('#singleFileInput').setInputFiles({
    name: 'invoice.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(content),
  });

  await page.getByRole('button', { name: 'Upload Single File' }).click();
  await expect(page.locator('#singleFileStatus')).toHaveText(
    `Single file selected: invoice.csv, Size: ${Buffer.byteLength(content)} bytes, Type: text/csv`,
  );
});

// ─────────────────────────────────────────────────────────────
// 4. The file chooser (when there is no input you can reach)
// ─────────────────────────────────────────────────────────────

test("filechooser event: click the upload control, then answer the dialog", async ({ page }) => {
  // Some apps hide the <input type="file"> behind a styled button or a drag-and-drop area. Then you
  // click what the user clicks and catch the file chooser instead. Same pattern as tabs: start
  // waiting BEFORE the click.
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#multipleFilesInput').click();
  const chooser = await chooserPromise;

  // The chooser knows whether it accepts several files.
  expect(chooser.isMultiple()).toBe(true);
  await chooser.setFiles([TXT, JSON_FILE]);

  await page.getByRole('button', { name: 'Upload Multiple Files' }).click();
  await expect(page.locator('#multipleFilesStatus')).toContainText('sample.txt');
  await expect(page.locator('#multipleFilesStatus')).toContainText('config.json');
});
