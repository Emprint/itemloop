import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

const OVERRIDE_METHODS = ['PUT', 'DELETE', 'PATCH'];

/**
 * On shared hosting (e.g. OVH), Apache may block PUT/DELETE/PATCH at the
 * server level. This interceptor converts those requests to POST and adds
 * the X-Http-Method-Override header so Slim's MethodOverrideMiddleware can
 * restore the original method.
 */
export const MethodOverrideInterceptor: HttpInterceptorFn = (req, next) => {
  if (!OVERRIDE_METHODS.includes(req.method)) {
    return next(req);
  }
  const overridden = req.clone({
    method: 'POST',
    headers: req.headers.set('X-Http-Method-Override', req.method),
  });
  return next(overridden);
};
