import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SKIP_AUTH_INTERCEPTOR } from '../interceptors/auth.context';
import type { ProfileResponse, UserProfile } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly baseUrl = 'http://localhost:3000/api';
  private readonly tokenKey = 'token';
  private readonly userKey = 'user';
  private readonly customerNameKey = 'customerName';

  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly userSignal = signal<UserProfile | null>(this.readUser());
  private validationPromise: Promise<void> | null = null;

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();

  constructor(private http: HttpClient) {}

  getToken(): string | null {
    return this.tokenSignal();
  }

  getUser(): UserProfile | null {
    return this.userSignal();
  }

  isLoggedIn(): boolean {
    return !!this.tokenSignal();
  }

  saveSession(token: string, user: UserProfile, remember = true): void {
    if (!token) return;

    this.persist('token', token, remember);
    this.persist('user', JSON.stringify(user), remember);
    this.persist('customerName', user.first_name || user.email || 'Customer', remember);

    this.tokenSignal.set(token);
    this.userSignal.set(user);
  }

  clearSession(): void {
    this.remove('token');
    this.remove('user');
    this.remove('customerName');
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  logout(): void {
    this.clearSession();
  }

  restoreSession(): void {
    this.tokenSignal.set(this.readToken());
    this.userSignal.set(this.readUser());
  }

  async validateSession(): Promise<void> {
    const token = this.getToken();
    if (!token) return;
    if (this.validationPromise) return this.validationPromise;

    this.validationPromise = firstValueFrom(
      this.http.get<ProfileResponse>(`${this.baseUrl}/profile`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      })
    ).then((res) => {
      if (res.user) {
        this.saveSession(token, res.user);
      }
    }).catch((err) => {
      if (err?.status === 401 || err?.status === 403) {
        this.clearSession();
      }
    }).finally(() => {
      this.validationPromise = null;
    });

    return this.validationPromise;
  }

  private readToken(): string | null {
    return this.read('token');
  }

  private readUser(): UserProfile | null {
    const raw = this.read('user');
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !('email' in parsed)) return null;
      return parsed as UserProfile;
    } catch {
      this.remove('user');
      return null;
    }
  }

  private read(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  private persist(key: string, value: string, remember: boolean): void {
    try {
      if (remember) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage failures and keep the in-memory session alive.
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  }
}
