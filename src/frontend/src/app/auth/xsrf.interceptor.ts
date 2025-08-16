import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

export const getCsrfCookie = (): string | null => getCookie('XSRF-TOKEN');

export const XsrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(environment.apiUrl)) {
    const isCsrfCookie = req.url.includes('csrf-cookie');
    // const isRegister = req.url.includes('register');
    if (!isCsrfCookie) {
      // && !isRegister) {
      const xsrfToken = getCsrfCookie();
      if (xsrfToken) {
        const cloned = req.clone({
          setHeaders: {
            'X-XSRF-TOKEN': xsrfToken,
          },
          withCredentials: true,
        });
        return next(cloned);
      }
    }
  }
  return next(req);
};
