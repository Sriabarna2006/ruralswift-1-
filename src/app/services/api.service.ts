import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────
  // Session helpers (localStorage for token/user)
  // ─────────────────────────────────────────────

  /** Save JWT and user info to localStorage after login/register */
  saveSession(token: string, user: UserProfile): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('customerName', user.first_name || user.email);
  }

  /** Get stored JWT token */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /** Get stored user profile from localStorage */
  getStoredUser(): UserProfile | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  /** Clear session on logout */
  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('customerName');
  }

  /** Build Authorization header */
  private authHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });
  }

  // ─────────────────────────────────────────────
  // Auth API calls → Express → NeonDB
  // ─────────────────────────────────────────────

  /** POST /api/auth/login */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password });
  }

  /** POST /api/auth/register */
  register(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, data);
  }

  // ─────────────────────────────────────────────
  // Profile API calls → Express → NeonDB
  // ─────────────────────────────────────────────

  /** GET /api/profile */
  getProfile(): Observable<{ user: UserProfile }> {
    return this.http.get<{ user: UserProfile }>(
      `${this.baseUrl}/profile`,
      { headers: this.authHeaders() }
    );
  }

  /** PUT /api/profile */
  updateProfile(data: Partial<UserProfile>): Observable<{ message: string; user: UserProfile }> {
    return this.http.put<{ message: string; user: UserProfile }>(
      `${this.baseUrl}/profile`,
      data,
      { headers: this.authHeaders() }
    );
  }
}
