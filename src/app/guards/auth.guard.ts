import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot): boolean | UrlTree => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
