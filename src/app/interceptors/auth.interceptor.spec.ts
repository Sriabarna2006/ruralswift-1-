import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  it('keeps the user on the seller hub page after a seller auth failure', () => {
    const router = {
      url: '/seller-hub',
      navigate: vi.fn()
    } as unknown as Router;

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }]
    });

    const req = new HttpRequest('GET', '/api/seller/profile');
    const next = () => throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    const result = TestBed.runInInjectionContext(() => authInterceptor(req, next as any));

    result.subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
