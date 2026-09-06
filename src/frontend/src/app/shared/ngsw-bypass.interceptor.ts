import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Keeps API calls away from the service worker.
 *
 * ngsw intercepts *every* request, including POSTs, and forwards the ones it
 * cannot serve with `fetch(event.request)`. Re-issuing a Request whose body is a
 * stream — which is what a FormData carrying a File is — sends it chunked, with
 * no Content-Length. Apache/PHP-FPM on OVH then hands PHP an empty body, so
 * $_FILES and php://input are both empty and image uploads fail with no
 * server-side trace. The `ngsw-bypass` header makes ngsw ignore the request, and
 * the browser performs it natively with a proper Content-Length.
 *
 * No API response is cached by the service worker (ngsw-config.json only lists
 * /storage/products/**), so bypassing it costs nothing.
 */
export const NgswBypassInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'ngsw-bypass': 'true' } }));
};
