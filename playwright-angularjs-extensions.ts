import { expect as baseExpect, Locator, Page } from '@playwright/test';

/**
 * Custom Playwright extensions for AngularJS ng-model support
 * Provides a locator strategy and custom matcher for ng-model values
 */

// Extend the Page and Locator interfaces to add our custom locators
declare module '@playwright/test' {
  interface Page {
    /**
     * Locates elements by their ng-model attribute.
     * @param ngModel - The ng-model attribute value (e.g., "user.name")
     */
    getByNgModel(ngModel: string): Locator;
    
    /**
     * Locates elements by their ng-model attribute and filters by evaluated value in the AngularJS scope.
     * @param ngModel - The ng-model attribute value (e.g., "user.name")
     * @param value - The expected evaluated value in the Angular scope
     * @returns Promise<Locator> - A promise that resolves to a locator
     */
    getByNgModelValue(ngModel: string, value: any): Promise<Locator>;
  }

  interface Locator {
    /**
     * Locates elements by their ng-model attribute within this locator.
     * @param ngModel - The ng-model attribute value
     */
    getByNgModel(ngModel: string): Locator;

    /**
     * Locates elements by their ng-model attribute and filters by evaluated value in the AngularJS scope
     * within this locator.
     * @param ngModel - The ng-model attribute value
     * @param value - The expected evaluated value
     */
    getByNgModelValue(ngModel: string, value: any): Promise<Locator>;
  }

  interface Matchers<R> {
    /**
     * Checks if an element's ng-model evaluates to the expected value in the AngularJS scope
     * @param expected - The expected value
     */
    toHaveNgValue(expected: any): R;
  }
}

/**
 * Helper function to get the evaluated ng-model value from an element
 * Uses AngularJS scope.$eval for evaluation
 */
async function getNgModelValue(locator: Locator): Promise<any> {
  return await locator.first().evaluate((element: any) => {
    const ngModel = element.getAttribute('ng-model');
    if (!ngModel) {
      throw new Error('Element does not have ng-model attribute');
    }

    const angular = (window as any).angular;
    if (!angular) {
      throw new Error('AngularJS is not loaded on the page');
    }

    const scope = angular.element(element).scope();
    if (!scope || typeof scope.$eval !== 'function') {
      throw new Error('Could not find AngularJS scope for element');
    }

    try {
      // Use $eval to evaluate the ng-model expression directly
      return scope.$eval(ngModel);
    } catch (error) {
      throw new Error(`Failed to evaluate ng-model "${ngModel}" via $eval: ${error}`);
    }
  });
}

/**
 * Custom locator strategy for ng-model without value filtering
 * Accepts either Page or Locator as root to scope the search
 */
export function getByNgModel(root: Page | Locator, ngModel: string): Locator {
  return root.locator(`[ng-model="${ngModel}"]`);
}

/**
 * Custom locator strategy for ng-model with value filtering
 * Accepts either Page or Locator as root to scope the search
 *
 * This function now polls until a matching element is found or a timeout is reached.
 * Default timeout: 5000ms, polling interval: 100ms.
 */
export async function getByNgModelValue(root: Page | Locator, ngModel: string, value: any): Promise<Locator> {
  const timeout = 5000;
  const pollInterval = 100;
  const deadline = Date.now() + timeout;

  while (Date.now() <= deadline) {
    const allElements = root.locator(`[ng-model="${ngModel}"]`);
    const handles = await allElements.elementHandles();
    const matchingSelectors: string[] = [];

    for (let i = 0; i < handles.length; i++) {
      try {
        const actualValue = await handles[i].evaluate((el: any) => {
          const ngModelAttr = el.getAttribute('ng-model');
          if (!ngModelAttr) return undefined;

          const angular = (window as any).angular;
          if (!angular) return undefined;

          const scope = angular.element(el).scope();
          if (!scope || typeof scope.$eval !== 'function') return undefined;

          try {
            return scope.$eval(ngModelAttr);
          } catch {
            return undefined;
          }
        });

        // Deep equality check for objects/arrays
        const isMatch = JSON.stringify(actualValue) === JSON.stringify(value);
        
        if (isMatch) {
          // Generate a unique selector for this specific element
          const uniqueId = await handles[i].evaluate((el: any, index: number) => {
            if (el.id) return `#${el.id}`;
            const tempAttr = 'data-pw-ng-temp';
            const tempId = `pw-ng-temp-${index}-${Date.now()}`;
            el.setAttribute(tempAttr, tempId);
            return `[${tempAttr}="${tempId}"]`;
          }, i);
          
          matchingSelectors.push(uniqueId);
        }
      } catch {
        // Ignore elements that can't be evaluated
      }
    }

    if (matchingSelectors.length > 0) {
      const combinedSelector = matchingSelectors.join(', ');
      return root.locator(combinedSelector);
    }

    // Wait a bit before retrying
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  // If timeout reached and nothing matched, return a locator that won't match
  return root.locator('[data-pw-ng-no-match="true"]');
}

/**
 * Custom matcher for ng-model values
 *
 * NOTE: Playwright's matcher context (this) may not expose a 'poll' helper in all versions.
 * To avoid relying on it, we implement our own polling logic so the matcher integrates
 * with Playwright-style waits when users pass an explicit timeout option to the matcher call.
 */
export const expect = baseExpect.extend({
  // The matcher receives: received (Locator), expected, and optional options when called like:
  // await expect(locator).toHaveNgValue(expected, { timeout: 2000 });
  async toHaveNgValue(locator: Locator, expected: any, options?: { timeout?: number }) {
    const assertionName = 'toHaveNgValue';
    const timeout = options?.timeout ?? 5000;
    const pollInterval = 50;
    const deadline = Date.now() + timeout;
    let lastActual: any = undefined;
    let lastErrorMessage: string | undefined = undefined;

    while (Date.now() <= deadline) {
      try {
        const count = await locator.count();
        if (count > 1) {
          return {
            pass: false,
            message: () => `Error: strict mode violation: locator resolved to ${count} elements, but expected 1`,
            name: assertionName,
            expected,
            actual: `Found ${count} elements`,
          };
        }

        const actual = await getNgModelValue(locator);
        lastActual = actual;
        const pass = JSON.stringify(actual) === JSON.stringify(expected);

        if (pass) {
          return {
            pass: true,
            message: () => `Expected ng-model not to have value: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(actual)}`,
            name: assertionName,
            expected,
            actual,
          };
        }
      } catch (err: any) {
        lastErrorMessage = err?.message;
        // keep retrying until deadline
      }

      // small delay before next attempt
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    // Timeout reached, report failure with useful info
    const receivedStr = typeof lastActual === 'undefined' ? `No value (last error: ${lastErrorMessage ?? 'unknown'})` : JSON.stringify(lastActual);
    return {
      pass: false,
      message: () => `Expected ng-model to have value: ${JSON.stringify(expected)}\nReceived: ${receivedStr}`,
      name: assertionName,
      expected,
      actual: lastActual,
    };
  },
});

/**
 * Install the custom extensions on Page and Locator
 * Call this function in your test setup to register the custom locators
 */
export function installAngularjsExtensions(page: Page) {
  // Page-level methods are always added to the current page instance
  (page as any).getByNgModel = (ngModel: string) => 
    getByNgModel(page, ngModel);
  (page as any).getByNgModelValue = (ngModel: string, value: any) => 
    getByNgModelValue(page, ngModel, value);

  // Get the prototype from a real Locator instance to patch it.
  const locatorPrototype = Object.getPrototypeOf(page.locator('body'));

  // Ensure we patch the prototype only once by checking if one of our methods already exists.
  if (locatorPrototype.getByNgModel) {
    return;
  }

  // Locator-level methods are added to the prototype
  locatorPrototype.getByNgModel = function(this: Locator, ngModel: string) {
    return getByNgModel(this, ngModel);
  };
  locatorPrototype.getByNgModelValue = function(this: Locator, ngModel: string, value: any) {
    return getByNgModelValue(this, ngModel, value);
  };
}
