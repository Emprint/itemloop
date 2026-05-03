import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserStatus } from './auth-response';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) {
    router.navigate(['/auth/login']);
    return false;
  }
  if (user.status === UserStatus.Pending) {
    router.navigate(['/auth/login'], { queryParams: { pending: 1 } });
    return false;
  }
  return true;
};
