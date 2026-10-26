// Page object for the "Data Entry" form at the top of the practice site.
// Used by the custom fixtures lesson (fixtures/my-fixtures.ts, tests/08-custom-fixtures.spec.ts).

import { Page, Locator } from '@playwright/test';

export type FormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export class DataEntryForm {
  readonly name: Locator;
  readonly email: Locator;
  readonly phone: Locator;
  readonly address: Locator;

  constructor(private readonly page: Page) {
    this.name = page.getByPlaceholder('Enter Name');
    this.email = page.getByPlaceholder('Enter EMail');
    this.phone = page.getByPlaceholder('Enter Phone');
    this.address = page.getByLabel('Address:');
  }

  async fill(data: FormData): Promise<void> {
    await this.name.fill(data.name);
    await this.email.fill(data.email);
    await this.phone.fill(data.phone);
    await this.address.fill(data.address);
  }
}
