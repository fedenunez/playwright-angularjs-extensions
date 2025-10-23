import { expect as baseExpect, Locator, Page } from '@playwright/test';

/**
 * Custom Playwright extensions for AngularJS ng-model support
 * Provides a locator strategy and custom matcher for ng-model values
 */

// Extend the Page interface to add our custom locator
declare module '@playwright/test' {
  interface Page {
    /**
     * Locates elements by their ng-model attribute
     * @param ngModel - The ng-model attribute value (e.g., "user.name")
     */
    getByNgModel(ngModel: string): Locator;
    
    /**
     * Locates elements by their ng-model attribute and filters by evaluated value in the AngularJS scope
     * @param ngModel - The ng-model attribute value (e.g., "user.name")
     * @param value - The expected evaluated value in the Angular scope
     * @returns Promise<Locator> - A promise that resolves to a locator
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
 */
async function getNgModelValue(locator: Locator): Promise<any> {
  return await locator.evaluate((element: any) => {
    // Check if element has ng-model attribute
    const ngModel = element.getAttribute('ng-model');
    if (!ngModel) {
      throw new Error('Element does not have ng-model attribute');
    }

    // Get the AngularJS scope
    const angular = (window as any).angular;
    if (!angular) {
      throw new Error('AngularJS is not loaded on the page');
    }

    // Get the element's scope
    const scope = angular.element(element).scope();
    if (!scope) {
      throw new Error('Could not find AngularJS scope for element');
    }

    // Evaluate the ng-model expression in the scope
    try {
      // Parse the ng-model path and traverse the scope
      const path = ngModel.split('.');
      let value = scope;
      
      for (const key of path) {
        value = value[key];
        if (value === undefined) {
          return undefined;
        }
      }
      
      return value;
    } catch (error) {
      throw new Error(`Failed to evaluate ng-model "${ngModel}": ${error}`);
    }
  });
}

/**
 * Custom locator strategy for ng-model without value filtering
 */
export function getByNgModel(page: Page, ngModel: string): Locator {
  return page.locator(`[ng-model="${ngModel}"]`);
}

/**
 * Custom locator strategy for ng-model with value filtering
 * Returns a locator that matches elements with the specified ng-model and evaluated value
 * Note: This is async and returns a Promise<Locator>
 */
export async function getByNgModelValue(page: Page, ngModel: string, value: any): Promise<Locator> {
  const allElements = page.locator(`[ng-model="${ngModel}"]`);
  const handles = await allElements.elementHandles();
  const matchingSelectors: string[] = [];

  for (let i = 0; i < handles.length; i++) {
    try {
      const actualValue = await handles[i].evaluate((el: any) => {
        const ngModel = el.getAttribute('ng-model');
        if (!ngModel) return undefined;

        const angular = (window as any).angular;
        if (!angular) return undefined;

        const scope = angular.element(el).scope();
        if (!scope) return undefined;

        // Evaluate the ng-model expression in the scope
        const path = ngModel.split('.');
        let value = scope;
        for (const key of path) {
          value = value?.[key];
          if (value === undefined) return undefined;
        }
        return value;
      });

      // Deep equality check for objects/arrays
      const isMatch = JSON.stringify(actualValue) === JSON.stringify(value);
      
      if (isMatch) {
        // Generate a unique selector for this specific element
        const uniqueId = await handles[i].evaluate((el: any, index: number) => {
          // Try to use existing id or data attribute
          if (el.id) return `#${el.id}`;
          
          // Create a temporary unique identifier
          const tempId = `pw-ng-temp-${index}-${Date.now()}`;
          el.setAttribute('data-pw-ng-temp', tempId);
          return `[data-pw-ng-temp="${tempId}"]`;
        }, i);
        
        matchingSelectors.push(uniqueId);
      }
    } catch (error) {
      // Ignore elements that can't be evaluated
      console.warn(`Failed to evaluate ng-model for element:`, error);
    }
  }

  if (matchingSelectors.length === 0) {
    // Return a locator that will never match
    return page.locator('[data-pw-ng-no-match="true"]');
  }

  // Combine all matching selectors
  return page.locator(matchingSelectors.join(', '));
}

/**
 * Custom matcher for ng-model values
 */
export const expect = baseExpect.extend({
  async toHaveNgValue(locator: Locator, expected: any) {
    const assertionName = 'toHaveNgValue';
    let pass: boolean;
    let matcherResult: any;

    try {
      // Get the actual ng-model value
      const actual = await getNgModelValue(locator);

      // Compare values using deep equality for objects/arrays
      pass = JSON.stringify(actual) === JSON.stringify(expected);

      matcherResult = {
        message: () => {
          const not = pass ? 'not ' : '';
          return `Expected ng-model ${not}to have value: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(actual)}`;
        },
        pass,
        name: assertionName,
        expected,
        actual,
      };
    } catch (error: any) {
      pass = false;
      matcherResult = {
        message: () => `Failed to evaluate ng-model: ${error.message}`,
        pass,
        name: assertionName,
      };
    }

    return matcherResult;
  },
});

/**
 * Install the custom extensions
 * Call this function in your test setup to register the custom locators
 */
export function installAngularjsExtensions(page: Page) {
  (page as any).getByNgModel = (ngModel: string) => 
    getByNgModel(page, ngModel);
  
  (page as any).getByNgModelValue = (ngModel: string, value: any) => 
    getByNgModelValue(page, ngModel, value);
}
