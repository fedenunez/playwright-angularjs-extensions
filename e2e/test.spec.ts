import { test } from '@playwright/test';
import { expect, installAngularjsExtensions } from '../playwright-angularjs-extensions';
import * as path from 'path';

// Resolve the path to the local HTML file
const testPagePath = `file://${path.resolve(__dirname, 'index.html')}`;

test.describe('AngularJS ng-model extensions', () => {
  test.beforeEach(async ({ page }) => {
    // Install the custom extensions for the page object
    installAngularjsExtensions(page);
    
    // Navigate to the local test page
    await page.goto(testPagePath);
    
    // IMPORTANT: Wait for Angular to bootstrap and the root scope to be available
    await page.waitForFunction(() => (window as any).angular && (window as any).angular.element(document.body).scope());
  });

  test('should locate element by ng-model and fill it', async ({ page }) => {
    const nameInput = page.getByNgModel('user.name');
    await expect(nameInput).toHaveNgValue('Initial Name');
    
    await nameInput.fill('John Doe');
    await expect(nameInput).toHaveNgValue('John Doe');
  });

  test('should locate element by ng-model and its specific value', async ({ page }) => {
    // Initial value is set
    const initialEmailInput = await page.getByNgModelValue('user.email', 'initial@example.com');
    await expect(initialEmailInput).toBeVisible();

    // Change the value
    await page.getByNgModel('user.email').fill('test@example.com');
    
    // The old locator should no longer find the element
    const oldEmailInput = await page.getByNgModelValue('user.email', 'initial@example.com');
    await expect(oldEmailInput).not.toBeVisible();
    
    // The new locator should find it
    const newEmailInput = await page.getByNgModelValue('user.email', 'test@example.com');
    await expect(newEmailInput).toBeVisible();
  });

  test('should verify select dropdown ng-model value', async ({ page }) => {
    const statusSelect = page.getByNgModel('order.status');
    await expect(statusSelect).toHaveNgValue('pending');
    
    await statusSelect.selectOption('completed');
    await expect(statusSelect).toHaveNgValue('completed');
  });

  test('should work with deeply nested ng-model paths', async ({ page }) => {
    const nestedInput = page.getByNgModel('form.address.city');
    await expect(nestedInput).toHaveNgValue('Initial City');
    
    await nestedInput.fill('New York');
    await expect(nestedInput).toHaveNgValue('New York');
  });

  test('should verify checkbox ng-model boolean value', async ({ page }) => {
    const agreeCheckbox = page.getByNgModel('user.agreedToTerms');
    await expect(agreeCheckbox).toHaveNgValue(false);
    
    await agreeCheckbox.check();
    await expect(agreeCheckbox).toHaveNgValue(true);
    
    await agreeCheckbox.uncheck();
    await expect(agreeCheckbox).toHaveNgValue(false);
  });

  test('should verify radio button ng-model value', async ({ page }) => {
    const roleLocator = page.getByNgModel('user.role');
    await expect(roleLocator).toHaveNgValue('guest');

    // Check a different radio button by its value attribute
    await page.locator('[ng-model="user.role"][value="admin"]').check();
    
    // Verify the ng-model value has updated
    await expect(roleLocator).toHaveNgValue('admin');
  });
});
