import { test, expect } from '@playwright/test';


test('Home page has the right title', async ({page}) =>
{
  await page.goto('/');
  await expect(page).toHaveTitle('Automation Testing Practice');

});


test('Verify the url of the website', async ({page}) =>
{
   await page.goto('/');
   await expect(page).toHaveURL('https://testautomationpractice.blogspot.com/');

});


test('Verify heading is visible', async ({page}) =>
{
   await page.goto('/');
   const header =  page.getByRole('heading', { name : 'Automation Testing Practice'}).first();
   await expect(header).toBeVisible();
});


test('Type into a text box and read the value sback', async ({page}) =>
{
   await page.goto('/');
   const namebox = page.getByPlaceholder('Name');
   namebox.fill('Suhas');
   expect(namebox).toHaveValue('Suhas');
});