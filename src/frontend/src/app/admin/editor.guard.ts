import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth-response';
import { Router } from '@angular/router';

export const editorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user || (user.role !== UserRole.Editor && user.role !== UserRole.Admin)) {
    router.navigate(['/']);
    return false;
  }
  return true;
};
