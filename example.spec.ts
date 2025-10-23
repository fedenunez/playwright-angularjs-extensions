import { test } from '@playwright/test';
import { expect, installAngularjsExtensions } from './playwright-angularjs-extensions';

/**
 * Example test demonstrating the AngularJS ng-model extensions
 */

test.describe('AngularJS ng-model tests', () => {
  test.beforeEach(async ({ page }) => {
    // Install the custom extensions
    installAngularjsExtensions(page);
    
    // Navigate to your AngularJS application
    await page.goto('https://your-angular-app.com');
    
    // Wait for AngularJS to bootstrap
    await page.waitForFunction(() => (window as any).angular);
  });

  test('should locate element by ng-model attribute', async ({ page }) => {
    // Locate an input with ng-model="user.name"
    const nameInput = page.getByNgModel('user.name');
    
    // Interact with the element
    await nameInput.fill('John Doe');
    
    // Verify the ng-model value was updated in the Angular scope
    await expect(nameInput).toHaveNgValue('John Doe');
  });

  test('should locate element by ng-model and specific value', async ({ page }) => {
    // Set up some data first
    await page.locator('[ng-model="user.email"]').fill('test@example.com');
    
    // Wait for Angular to digest the change
    await page.waitForTimeout(100);
    
    // Locate the element by ng-model and its evaluated value (async method)
    const emailInput = await page.getByNgModelValue('user.email', 'test@example.com');
    
    // Verify it exists and is visible
    await expect(emailInput).toBeVisible();
  });

  test('should verify ng-model value matches expected', async ({ page }) => {
    // Interact with a select dropdown
    const statusSelect = page.getByNgModel('order.status');
    await statusSelect.selectOption('completed');
    
    // Verify the ng-model value in the Angular scope
    await expect(statusSelect).toHaveNgValue('completed');
  });

  test('should work with nested ng-model paths', async ({ page }) => {
    // Test with deeply nested ng-model
    const nestedInput = page.getByNgModel('form.address.city');
    await nestedInput.fill('New York');
    
    // Verify the nested value
    await expect(nestedInput).toHaveNgValue('New York');
  });

  test('should verify checkbox ng-model boolean value', async ({ page }) => {
    // Work with checkbox
    const agreeCheckbox = page.getByNgModel('user.agreedToTerms');
    await agreeCheckbox.check();
    
    // Verify the boolean value in scope
    await expect(agreeCheckbox).toHaveNgValue(true);
    
    await agreeCheckbox.uncheck();
    await expect(agreeCheckbox).toHaveNgValue(false);
  });

  test('should verify radio button ng-model value', async ({ page }) => {
    // Select a radio button
    const radioOption = page.locator('[ng-model="user.role"][value="admin"]');
    await radioOption.check();
    
    // Verify the ng-model value
    await expect(page.getByNgModel('user.role')).toHaveNgValue('admin');
  });
});
