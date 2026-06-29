// src/app/app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Registers the global auth interceptor:
    //   - Attaches Bearer token to every HTTP request automatically
    //   - Handles 401/403 globally (clears session, redirects to /login)
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
