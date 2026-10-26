import { test, expect } from '@playwright/test';

test('Test get by Role', async ({page}) =>
{
  await page.goto('/');

  const title = page.getByRole('link', {name : 'Udemy Courses' });
  await expect(title).toBeVisible();


  const checkbox = page.getByRole('checkbox', {name : 'Sunday'});
  await checkbox.check();
  await expect(checkbox).toBeChecked();


  const radiobutton = page.getByRole('radio', { name : 'Male', exact: true} );
  await radiobutton.check();
  await expect(radiobutton).toBeChecked();

  const dropdown = page.getByRole('combobox', { name : 'Country:'} );
  await dropdown.selectOption('germany');
  await expect(dropdown).toHaveValue('germany');

});


test('Test get by label', async({page})=>
{
   await page.goto('/');

   const textarea = await page.getByLabel('Address:');
   await textarea.fill('Bangalore , India');
   await expect(textarea).toHaveValue('Bangalore , India');

   const range = await page.getByLabel('Price range:');
   await expect(range).toHaveValue('$75 - $300');


});


test('Test by placeholder', async ({page}) =>
{
   await page.goto('/');

   const textarea = await page.getByPlaceholder('Enter Name');
   await textarea.fill('Suhas');
   await expect(textarea).toHaveValue('Suhas');

   const textarea2 = await page.getByRole('textbox', {name : 'Enter EMail'});
   await textarea2.fill('Shetty');
   await expect(textarea2).toHaveValue('Shetty');

   

});