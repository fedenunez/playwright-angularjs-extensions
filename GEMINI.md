## Project Overview

This project is a TypeScript-based Playwright extension that provides custom locators and matchers for testing AngularJS applications. The primary goal of this extension is to simplify interaction with and verification of elements that use the `ng-model` directive.

The main features include:
- **`getByNgModel(ngModel)`**: A synchronous locator to find elements by their `ng-model` attribute.
- **`getByNgModelValue(ngModel, value)`**: An asynchronous locator that finds elements by `ng-model` and filters them based on their evaluated value in the AngularJS scope.
- **`toHaveNgValue(expected)`**: A custom matcher to assert that an element's `ng-model` evaluates to a specific value.

The extension is designed to be used with Playwright and is written in TypeScript.

## Building and Running

### Installation

To install the project dependencies, run:
```bash
npm ci
```

After installing the dependencies, you also need to install the Playwright browsers:
```bash
npx playwright install --with-deps
```

### Building

To compile the TypeScript source code into JavaScript, run the following command. The output will be placed in the `dist` directory.
```bash
npm run build
```

### Testing

To run the end-to-end tests, use the following command:
```bash
npm test
```
This command executes the Playwright tests located in the `e2e` directory.

## Development Conventions

- **Language**: The project is written in TypeScript.
- **Testing Framework**: Tests are written using `@playwright/test`.
- **Test File Location**: End-to-end tests are located in the `e2e/` directory.
- **Extension Initialization**: In each test, the AngularJS extensions must be installed for the `page` object by calling `installAngularjsExtensions(page)`.
- **Waiting for AngularJS**: Before interacting with AngularJS elements, it is crucial to wait for the AngularJS framework to bootstrap. This is typically done using:
  ```typescript
  await page.waitForFunction(() => (window as any).angular);
  ```
- **Coding Style**: The codebase follows standard TypeScript and Playwright coding practices. The source code is well-documented with TSDoc comments.
