import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { XsrfInterceptor } from './auth/xsrf.interceptor';
import { MethodOverrideInterceptor } from './auth/method-override.interceptor';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([XsrfInterceptor, MethodOverrideInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'en',
      lang: 'en',
    }),
    provideServiceWorker('/ngsw-worker.js', {
      enabled: false, // Disabled for now - service worker generation not fully supported in Angular 20
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
