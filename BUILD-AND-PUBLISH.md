# How to Build and Publish to NPM

This guide outlines the steps to build the TypeScript source and publish the package to the npm registry.

## Prerequisites

1.  **Node.js and npm**: Ensure you have Node.js (which includes npm) installed.
2.  **npm Account**: You need an account on [npmjs.com](https://www.npmjs.com/).
3.  **Logged in to npm**: Log in to your npm account via the command line:
    ```bash
    npm login
    ```

## Publishing Steps

```bash
npm install                 # install development dependencies
npm run build               # compile TypeScript to JavaScript in dist/
npm version patch           # bump patch version & create git tag
npm version minor           # bump minor version & create git tag
npm version major           # bump major version & create git tag
npm publish --access public # publish scoped package on npm
git push && git push --tags # push commits and tags to GitHub
```
