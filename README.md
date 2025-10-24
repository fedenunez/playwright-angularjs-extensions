# Playwright AngularJS Extensions

Custom Playwright extensions for testing AngularJS applications with ng-model support.

## Features

- **Custom Locator**: `page.getByNgModel(ngModel)` - Locate elements by their ng-model attribute (synchronous)
- **Scoped Locator**: `locator.getByNgModel(ngModel)` - Locate elements within a parent locator.
- **Filtered Locator**: `page.getByNgModelValue(ngModel, value)` or `locator.getByNgModelValue(ngModel, value)` - Locate elements by ng-model and filter by the evaluated value in the Angular scope (asynchronous)
- **Custom Matcher**: `expect(locator).toHaveNgValue(expected)` - Assert that an element's ng-model evaluates to the expected value in the AngularJS scope

## Installation

Install the package from npm:

```bash
npm install -D @fedenunez/playwright-angularjs-extensions
```

### Alternative: Install from GitHub

You can also install the package directly from the GitHub repository if you need the latest unreleased changes:

```bash
npm install -D github:fedenunez/playwright-angularjs-extensions
```

## Setup and Usage

### Setup

First, ensure you have Playwright installed in your project:
```bash
npm install -D @playwright/test
```

Then, import and install the extensions in your test file or a global setup file:

```typescript
import { test } from '@playwright/test';
import { expect, installAngularjsExtensions } from '@fedenunez/playwright-angularjs-extensions';

test.beforeEach(async ({ page }) => {
  // Install the extensions for the page and locator objects
  installAngularjsExtensions(page);
  
  // Navigate to your AngularJS app
  await page.goto('https://your-app.com');
  
  // IMPORTANT: Wait for Angular to bootstrap
  await page.waitForFunction(() => (window as any).angular);
});
```

### Locator: `getByNgModel()` and `getByNgModelValue()`

Locate elements by their ng-model attribute:

```typescript
// Basic usage - find element with ng-model="user.name" (synchronous)
const nameInput = page.getByNgModel('user.name');
await nameInput.fill('John Doe');

// With value filter - find element with ng-model="user.email" 
// where the evaluated scope value equals 'test@example.com' (asynchronous)
const emailInput = await page.getByNgModelValue('user.email', 'test@example.com');
await expect(emailInput).toBeVisible();

// Works with nested paths
const cityInput = page.getByNgModel('form.address.city');
await cityInput.fill('New York');

// Filter by boolean value
const activeCheckbox = await page.getByNgModelValue('user.isActive', true);
await expect(activeCheckbox).toBeChecked();
```

### Chaining Locators

You can scope your search within another Playwright Locator. This is useful for complex pages with multiple forms or components.

```typescript
const userForm = page.locator('#user-form');

// Find an element with ng-model="user.name" ONLY inside the #user-form element
const nameInput = userForm.getByNgModel('user.name');
await nameInput.fill('Chained Locator');

// The async version also supports chaining
const activeUser = await userForm.getByNgModelValue('user.isActive', true);
await expect(activeUser).toBeVisible();
```

### Matcher: `toHaveNgValue()`

Assert that an element's ng-model evaluates to the expected value.

**Important (Strict Mode):** This matcher follows Playwright's strict mode. If the provided locator resolves to more than one element, the assertion will fail. Always ensure your locator is unique before calling `toHaveNgValue`.

```typescript
// Text input
const nameInput = page.getByNgModel('user.name');
await nameInput.fill('Jane Smith');
await expect(nameInput).toHaveNgValue('Jane Smith');

// Select dropdown
const statusSelect = page.getByNgModel('order.status');
await statusSelect.selectOption('completed');
await expect(statusSelect).toHaveNgValue('completed');

// Checkbox (boolean)
const checkbox = page.getByNgModel('user.agreedToTerms');
await checkbox.check();
await expect(checkbox).toHaveNgValue(true);

// Radio buttons
// The matcher correctly handles radio button groups where multiple elements
// share the same ng-model attribute.
await page.locator('[ng-model="user.role"][value="admin"]').check();
await expect(page.getByNgModel('user.role')).toHaveNgValue('admin');

// Nested objects
const nestedInput = page.getByNgModel('config.settings.theme');
await expect(nestedInput).toHaveNgValue('dark');
```

## How It Works

### Locator Strategies

The extension provides two locator methods that can be called on `page` or another `Locator`:

1. **`getByNgModel(ngModel)`** - Synchronous locator that finds all elements with the specified `ng-model` attribute within the given scope (page or parent locator).

2. **`getByNgModelValue(ngModel, value)`** - Asynchronous locator that:
   - Finds all elements with the specified `ng-model` attribute within the scope
   - Evaluates each element's ng-model expression in the AngularJS scope
   - Filters to only elements where the evaluated value matches the expected value
   - Returns a Playwright Locator for the matching elements
   - **Important**: This method returns a `Promise<Locator>`, so you must `await` it

### Matcher

The `toHaveNgValue()` matcher:
1. Retrieves the element's `ng-model` attribute
2. Gets the element's AngularJS scope using `angular.element(element).scope()`
3. Evaluates the ng-model expression path within the scope
4. Compares the evaluated value with the expected value

## Examples

### Testing a Login Form

```typescript
import { test } from '@playwright/test';
import { expect, installAngularjsExtensions } from '@fedenunez/playwright-angularjs-extensions';

test('should login with valid credentials', async ({ page }) => {
  installAngularjsExtensions(page);
  await page.goto('https://app.example.com/login');

  // Fill in the form
  const usernameInput = page.getByNgModel('credentials.username');
  const passwordInput = page.getByNgModel('credentials.password');
  
  await usernameInput.fill('admin');
  await passwordInput.fill('password123');

  // Verify values are set in Angular scope
  await expect(usernameInput).toHaveNgValue('admin');
  await expect(passwordInput).toHaveNgValue('password123');

  // Submit
  await page.click('button[type="submit"]');
});
```

### Testing Complex Forms

```typescript
import { test } from '@playwright/test';
import { expect, installAngularjsExtensions } from '@fedenunez/playwright-angularjs-extensions';

test('should handle complex form with nested models', async ({ page }) => {
  installAngularjsExtensions(page);
  await page.goto('https://app.example.com/profile');

  // Scope search to the user profile form
  const profileForm = page.locator('#profile-form');

  // Personal info
  await profileForm.getByNgModel('user.personal.firstName').fill('John');
  await profileForm.getByNgModel('user.personal.lastName').fill('Doe');
  
  // Address
  await profileForm.getByNgModel('user.address.street').fill('123 Main St');
  await profileForm.getByNgModel('user.address.city').fill('Boston');
  
  // Preferences
  await profileForm.getByNgModel('user.preferences.newsletter').check();
  
  // Verify all values using the matcher
  await expect(profileForm.getByNgModel('user.personal.firstName')).toHaveNgValue('John');
  await expect(profileForm.getByNgModel('user.address.city')).toHaveNgValue('Boston');
  await expect(profileForm.getByNgModel('user.preferences.newsletter')).toHaveNgValue(true);
  
  // Or locate by specific values using the filtered locator
  const johnInput = await profileForm.getByNgModelValue('user.personal.firstName', 'John');
  await expect(johnInput).toBeVisible();
});
```

## Requirements

- Playwright >= 1.20.0
- AngularJS (any version with `angular.element().scope()` support)
- TypeScript >= 4.0.0

## Limitations

- Only works with AngularJS (Angular 1.x), not modern Angular (2+)
- Requires the AngularJS `angular` object to be available on `window`
- Elements must have the `ng-model` attribute
- The ng-model expression must be evaluable in the element's scope
- **`getByNgModelValue()` is asynchronous** - Playwright's `Locator.filter()` doesn't support async predicates, so filtering by evaluated value requires using element handles and must return a Promise. Always use `await` when calling this method.
- The filtered locator uses temporary data attributes for unique identification, which are cleaned up but may briefly appear in the DOM

## Troubleshooting

**Error: "AngularJS is not loaded on the page"**
- Ensure you wait for Angular to bootstrap before using the extensions
- Add: `await page.waitForFunction(() => (window as any).angular);`

**Error: "Could not find AngularJS scope for element"**
- The element may not be part of an Angular scope
- Verify the element is within an `ng-app` or manually bootstrapped Angular application

**Error: "Failed to evaluate ng-model"**
- Check that the ng-model path exists in the scope
- Verify the ng-model syntax is correct (e.g., `user.name`, not `{{user.name}}`)

## License

MIT
