// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Data Interfaces ──────────────────────────────────────────────────────────

export interface UserProfile {
  id?:        number;
  first_name: string;
  last_name:  string;
  name?:      string;
  email:      string;
  phone:      string;
  address?:   string;
  gender?:    string;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthResponse {
  success:  boolean;
  message:  string;
  token:    string;
  user:     UserProfile;
  timestamp?: string;
  requestId?: string;
}

export interface ProfileResponse {
  success:  boolean;
  message:  string;
  user:     UserProfile;
  timestamp?: string;
  requestId?: string;
}

/** Standard error body returned by the backend */
export interface ApiErrorResponse {
  success:    false;
  code:       string;
  message:    string;
  timestamp:  string;
  requestId?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Session helpers (localStorage — token/user cache)
  // The auth interceptor reads 'token' automatically for every request.
  // ─────────────────────────────────────────────────────────────────────────────

  /** Save JWT and user info to localStorage after login/register */
  saveSession(token: string, user: UserProfile): void {
    try {
      localStorage.setItem('token',        token);
      localStorage.setItem('user',         JSON.stringify(user));
      localStorage.setItem('customerName', user.first_name || user.email || 'Customer');
    } catch {
      // localStorage can throw in private browsing with storage quota exceeded
      console.warn('[ApiService] Could not save session to localStorage.');
    }
  }

  /** Get stored JWT token */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get stored user profile from localStorage.
   * Safe: catches malformed JSON (e.g., corrupted localStorage) and returns null.
   */
  getStoredUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Validate it looks like a UserProfile (basic shape check)
      if (typeof parsed !== 'object' || !parsed.email) return null;
      return parsed as UserProfile;
    } catch {
      // Malformed JSON — clear corrupted entry
      localStorage.removeItem('user');
      return null;
    }
  }

  /** Clear session on logout */
  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('customerName');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Auth API calls
  // Note: Bearer token is attached globally by authInterceptor (app.config.ts)
  // ─────────────────────────────────────────────────────────────────────────────

  /** POST /api/auth/login */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/login`,
      { email: email.trim().toLowerCase(), password }
    );
  }

  /** POST /api/auth/register */
  register(data: {
    first_name: string;
    last_name:  string;
    email:      string;
    phone:      string;
    password:   string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/register`,
      { ...data, email: data.email.trim().toLowerCase() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Profile API calls (Bearer token attached by interceptor)
  // ─────────────────────────────────────────────────────────────────────────────

  /** GET /api/profile */
  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.baseUrl}/profile`);
  }

  /** PUT /api/profile */
  updateProfile(data: Partial<UserProfile>): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.baseUrl}/profile`, data);
  }
}
