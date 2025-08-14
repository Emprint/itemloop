
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export const XsrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(environment.backendUrl)) {
    const isCsrfCookie = req.url.includes('sanctum/csrf-cookie');
    const isRegister = req.url.includes('api/register');
    if (!isCsrfCookie && !isRegister) {
      const xsrfToken = getCookie('XSRF-TOKEN');
      if (xsrfToken) {
        const cloned = req.clone({
          setHeaders: {
            'X-XSRF-TOKEN': xsrfToken
          },
          withCredentials: true
        });
        return next(cloned);
      }
    }
  }
  return next(req);
};
