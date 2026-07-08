// src/app/interceptors/auth.interceptor.ts
import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { SKIP_AUTH_INTERCEPTOR } from './auth.context';

/**
 * Global HTTP interceptor that:
 *
 *  1. Automatically attaches the Bearer JWT to every outgoing API request.
 *
 *  2. Normalises network errors (status === 0, i.e. "Failed to fetch"):
 *     Instead of leaking the raw browser TypeError message to the UI,
 *     we replace it with a clear, friendly message. Every component's
 *     `err.error?.message` fallback will now read this string instead of
 *     "Failed to fetch".
 *
 *  3. Handles 401 (session expired) and 403 (invalid/tampered token):
 *     Clears session data and redirects to /login.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  if (req.context.get(SKIP_AUTH_INTERCEPTOR)) {
    return next(req);
  }

  const router = inject(Router);
  const authState = inject(AuthStateService);

  // ── 1. Attach Bearer token if available ───────────────────────────────────
  const token = authState.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // ── 2. Handle response errors globally ───────────────────────────────────
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // ── Network error (server unreachable / no internet) ─────────────────
      // status === 0 means the browser never received an HTTP response.
      // Angular sets err.error to a TypeError with message "Failed to fetch".
      // We normalise this so every component sees a clean, friendly message.
      if (error.status === 0) {
        const networkError = new HttpErrorResponse({
          error:      { message: 'Unable to connect to the server. Please make sure the backend is running and try again.' },
          status:     0,
          statusText: 'Network Error',
          url:        error.url ?? undefined,
        });
        return throwError(() => networkError);
      }

      // ── 401 — Token expired or missing → force re-login ──────────────────
      // ── 403 — Token tampered / invalid signature ──────────────────────────
      if (error.status === 401 || error.status === 403) {
        authState.clearSession();

        const url = router.url;
        const isSellerRoute = url.startsWith('/seller-hub');

        // Keep seller users on the dedicated dashboard instead of bouncing to the generic login screen.
        if (!url.startsWith('/login') && !url.startsWith('/register') && !isSellerRoute) {
          router.navigate(['/login']);
        }
      }

      // Re-throw for individual components to handle if needed
      return throwError(() => error);
    })
  );
};
