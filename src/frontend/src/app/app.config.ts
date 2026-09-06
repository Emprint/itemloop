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
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { XsrfInterceptor } from './auth/xsrf.interceptor';
import { MethodOverrideInterceptor } from './auth/method-override.interceptor';
import { NgswBypassInterceptor } from './shared/ngsw-bypass.interceptor';
import { environment } from '../environments/environment';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
    provideHttpClient(
      withInterceptors([NgswBypassInterceptor, XsrfInterceptor, MethodOverrideInterceptor]),
    ),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'en',
      lang: 'en',
    }),
    provideServiceWorker('/ngsw-worker.js', {
      enabled: environment.serviceWorker,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
