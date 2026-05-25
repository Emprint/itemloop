# ItemloopFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

> **Note:** The service worker is disabled in `ng serve` mode. Use the [PWA local testing setup](#testing-the-pwa-locally) below to test offline behaviour.

## Testing the PWA locally

The Angular service worker only activates in production builds, not in `ng serve` dev mode. Use the following process to run a full PWA build locally with the service worker active.

### Prerequisites

- PHP backend running on `:8000`
- Node.js available on your PATH

### Steps

**1. Start the PHP backend**

```bash
cd src/backend
php -S localhost:8000 -t public
```

**2. Build with the `local-pwa` configuration**

This configuration enables the service worker and uses relative API URLs (`/api/`) suitable for local proxying:

```bash
cd src/frontend
ng build --configuration local-pwa
```

**3. Start the PWA dev server**

```bash
node src/frontend/pwa-server.mjs 4300
```

This serves the built app from `dist/` and proxies `/api/` and `/storage/` requests to the PHP backend on `:8000`.

**4. Open the app**

Navigate to `http://localhost:4300` in your browser.

To test offline mode, open DevTools → Application → Service Workers and tick **Offline**, or use the Network tab to throttle to offline.

### How it works

| Config | Service worker | API URL |
|--------|---------------|---------|
| `ng serve` (default) | ❌ disabled | `http://localhost:4200/api/` via proxy |
| `ng build` (production) | ✅ enabled | Configured via `APP_URL` env |
| `ng build --configuration local-pwa` | ✅ enabled | `/api/` proxied by `pwa-server.mjs` |

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.


Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
