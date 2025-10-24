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
    const nameInput = page.getByNgModel('user.name').first();
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
    await expect(roleLocator.first()).toHaveNgValue('guest');

    // Check a different radio button by its value attribute
    await page.locator('[ng-model="user.role"][value="admin"]').check();
    
    // Verify the ng-model value has updated
    await expect(roleLocator.first()).toHaveNgValue('admin');
  });

  test.describe('Parent Locators', () => {
    test('should scope getByNgModel to a parent locator', async ({ page }) => {
        const userForm = page.locator('#user-form');
        const duplicateContainer = page.locator('#duplicate-container');

        // Locate within the user form
        const nameInputInForm = userForm.getByNgModel('user.name');
        await expect(nameInputInForm).toHaveAttribute('id', 'name');

        // Locate within the duplicate container
        const nameInputInDup = duplicateContainer.getByNgModel('user.name');
        await expect(nameInputInDup).toHaveAttribute('id', 'name-dup');

        // Ensure they are distinct locators but share the same model
        await nameInputInForm.fill('Scoped Change');
        await expect(nameInputInForm).toHaveNgValue('Scoped Change');
        await expect(nameInputInDup).toHaveNgValue('Scoped Change');
        await expect(nameInputInDup).toHaveValue('Scoped Change');
    });

    test('should scope getByNgModelValue to a parent locator', async ({ page }) => {
        const userForm = page.locator('#user-form');
        
        // This should find the email input inside the form
        const emailInput = await userForm.getByNgModelValue('user.email', 'initial@example.com');
        await expect(emailInput).toHaveAttribute('id', 'email');
        await expect(emailInput).toBeVisible();

        // This should NOT find anything, as the model is not in the order form
        const orderForm = page.locator('#order-form');
        const emailInputInOrderForm = await orderForm.getByNgModelValue('user.email', 'initial@example.com');
        await expect(emailInputInOrderForm).not.toBeVisible();
    });
  });

  test.describe('Dynamic content with ng-if', () => {
    test('should find elements inside a visible ng-if block', async ({ page }) => {
        const adminInput = page.getByNgModel('user.adminDetails');
        await expect(adminInput).not.toBeVisible();

        // Make the ng-if block visible
        await page.locator('[ng-model="user.role"][value="admin"]').check();
        
        // The input should now be visible
        await expect(adminInput).toBeVisible();
        await expect(adminInput).toHaveNgValue('loading...');
    });

    test('should wait for async ng-model value change', async ({ page }) => {
        const adminInput = page.getByNgModel('user.adminDetails');

        // Make the ng-if block visible
        await page.locator('[ng-model="user.role"][value="admin"]').check();
        
        // The value is 'loading...' initially, then changes to 'loaded!' after 1s
        // toHaveNgValue includes Playwright's auto-waiting mechanism
        await expect(adminInput).toHaveNgValue('loaded!', { timeout: 2000 });
    });

    test('should locate by async value using getByNgModelValue', async ({ page }) => {
         // Make the ng-if block visible
         await page.locator('[ng-model="user.role"][value="admin"]').check();

         // getByNgModelValue should wait until an element with the matching value appears
         const loadedInput = await page.getByNgModelValue('user.adminDetails', 'loaded!');
         await expect(loadedInput).toBeVisible();
    });
  });

  test.describe('Strict Mode', () => {
    test('should fail with strict mode violation if multiple elements are found', async ({ page }) => {
      // This test is expected to fail because the matcher will find multiple elements.
      test.fail();

      // This locator matches two inputs on the test page
      const multiElementLocator = page.getByNgModel('user.name');
      
      // This assertion should throw a strict mode error because it resolves to 2 elements.
      await expect(multiElementLocator).toHaveNgValue('Initial Name');
    });
  });
});
