// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Data Interfaces ───────────────────────────────────────────────────────────

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
  date_of_birth?: string;
  role?:      string;
  created_at?: string;
}

export interface Product {
  product_id:    number;
  name:          string;
  description:   string;
  price:         number;
  mrp:           number;
  stock:         number;
  unit:          string;
  category:      string;
  brand:         string;
  image_url:     string;
  images:        string[];
  rating:        number;
  review_count:  number;
  weight_grams?: number;
  seller_id?:    number;
  seller_name?:  string;
  is_active:     boolean;
  is_approved:   boolean;
  created_at:    string;
}

export interface CartItem {
  id:         number;
  product_id: number;
  quantity:   number;
  name:       string;
  price:      number;
  mrp:        number;
  image_url:  string;
  stock:      number;
  unit:       string;
}

export interface CartResponse {
  items:     CartItem[];
  total:     number;
  itemCount: number;
}

export interface OrderItem {
  product_id: number;
  quantity:   number;
  unit_price: number;
  name:       string;
  image_url:  string;
}

export interface Order {
  order_id:         number;
  status:           string;
  total:            number;
  delivery_address: string;
  payment_status:   string;
  payment_method:   string;
  tracking_number:  string;
  items:            OrderItem[];
  created_at:       string;
  delivered_at?:    string;
}

export interface Address {
  id:            number;
  label:         string;
  full_name:     string;
  phone:         string;
  address_line1: string;
  address_line2: string;
  city:          string;
  state:         string;
  pincode:       string;
  is_default:    boolean;
}

export interface Notification {
  id:         number;
  title:      string;
  message:    string;
  type:       string;
  is_read:    boolean;
  created_at: string;
}

export interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token:   string;
  user:    UserProfile;
  timestamp?: string;
  requestId?: string;
}

export interface RegisterOtpResponse {
  success: boolean;
  message: string;
  verificationRequired: boolean;
  email: string;
  expiresInMinutes: number;
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

export interface ApiErrorResponse {
  success:    false;
  code:       string;
  message:    string;
  timestamp:  string;
  requestId?: string;
}

export type ApiResponse<T = Record<string, unknown>> = {
  success:    boolean;
  message:    string;
  data?:      T;
  timestamp?: string;
  requestId?: string;
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ── Session helpers ────────────────────────────────────────────────────────

  saveSession(token: string, user: UserProfile): void {
    try {
      localStorage.setItem('token',        token);
      localStorage.setItem('user',         JSON.stringify(user));
      localStorage.setItem('customerName', user.first_name || user.email || 'Customer');
    } catch {
      console.warn('[ApiService] Could not save session to localStorage.');
    }
  }

  getToken(): string | null { return localStorage.getItem('token'); }

  getStoredUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || !parsed.email) return null;
      return parsed as UserProfile;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }

  isLoggedIn(): boolean { return !!this.getToken(); }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('customerName');
    // cart is now server-side only — no localStorage to clear
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/login`,
      { email: email.trim().toLowerCase(), password }
    );
  }

  register(data: {
    first_name: string;
    last_name:  string;
    email:      string;
    phone:      string;
    password:   string;
  }): Observable<RegisterOtpResponse> {
    return this.http.post<RegisterOtpResponse>(
      `${this.baseUrl}/auth/register`,
      { ...data, email: data.email.trim().toLowerCase() }
    );
  }

  verifyRegistrationOtp(email: string, otp: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/verify-otp`,
      { email: email.trim().toLowerCase(), otp: otp.trim() }
    );
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.baseUrl}/profile`);
  }

  updateProfile(data: Partial<UserProfile>): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.baseUrl}/profile`, data);
  }

  // ── Products ───────────────────────────────────────────────────────────────

  getProducts(filters: {
    category?: string;
    search?:   string;
    minPrice?: number;
    maxPrice?: number;
    page?:     number;
    limit?:    number;
  } = {}): Observable<ApiResponse<{ products: Product[]; pagination: Pagination }>> {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.search)   params = params.set('search',   filters.search);
    if (filters.minPrice !== undefined) params = params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params = params.set('maxPrice', filters.maxPrice.toString());
    if (filters.page)     params = params.set('page',     filters.page.toString());
    if (filters.limit)    params = params.set('limit',    filters.limit.toString());
    return this.http.get<ApiResponse<{ products: Product[]; pagination: Pagination }>>(
      `${this.baseUrl}/products`, { params }
    );
  }

  getProduct(id: number): Observable<ApiResponse<{ product: Product }>> {
    return this.http.get<ApiResponse<{ product: Product }>>(`${this.baseUrl}/products/${id}`);
  }

  getProductCategories(): Observable<ApiResponse<{ categories: string[] }>> {
    return this.http.get<ApiResponse<{ categories: string[] }>>(`${this.baseUrl}/products/categories`);
  }

  createProduct(data: Partial<Product>): Observable<ApiResponse<{ product: Product }>> {
    return this.http.post<ApiResponse<{ product: Product }>>(`${this.baseUrl}/products`, data);
  }

  updateProduct(id: number, data: Partial<Product>): Observable<ApiResponse<{ product: Product }>> {
    return this.http.put<ApiResponse<{ product: Product }>>(`${this.baseUrl}/products/${id}`, data);
  }

  deleteProduct(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/products/${id}`);
  }

  // ── Cart ──────────────────────────────────────────────────────────────────

  getCart(): Observable<ApiResponse<CartResponse>> {
    return this.http.get<ApiResponse<CartResponse>>(`${this.baseUrl}/cart`);
  }

  addToCart(productId: number, quantity: number = 1): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/cart`, { product_id: productId, quantity });
  }

  updateCartItem(productId: number, quantity: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/cart/${productId}`, { quantity });
  }

  removeFromCart(productId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/cart/${productId}`);
  }

  clearCart(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/cart`);
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  getOrders(filters: { status?: string; page?: number; limit?: number } = {}): Observable<ApiResponse<{ orders: Order[] }>> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page)   params = params.set('page',   filters.page.toString());
    if (filters.limit)  params = params.set('limit',  filters.limit.toString());
    return this.http.get<ApiResponse<{ orders: Order[] }>>(`${this.baseUrl}/orders`, { params });
  }

  getOrder(id: number): Observable<ApiResponse<{ order: Order }>> {
    return this.http.get<ApiResponse<{ order: Order }>>(`${this.baseUrl}/orders/${id}`);
  }

  placeOrder(data: {
    deliveryAddress: string;
    paymentMethod?:  string;
    notes?:          string;
    items: { product_id: number; quantity: number }[];
  }): Observable<ApiResponse<{ order: Order }>> {
    return this.http.post<ApiResponse<{ order: Order }>>(`${this.baseUrl}/orders`, data);
  }

  // ── Wishlist ──────────────────────────────────────────────────────────────

  getWishlist(): Observable<ApiResponse<{ items: any[] }>> {
    return this.http.get<ApiResponse<{ items: any[] }>>(`${this.baseUrl}/wishlist`);
  }

  addToWishlist(productId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/wishlist`, { product_id: productId });
  }

  removeFromWishlist(productId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/wishlist/${productId}`);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  getAddresses(): Observable<ApiResponse<{ addresses: Address[] }>> {
    return this.http.get<ApiResponse<{ addresses: Address[] }>>(`${this.baseUrl}/addresses`);
  }

  addAddress(data: Partial<Address>): Observable<ApiResponse<{ address: Address }>> {
    return this.http.post<ApiResponse<{ address: Address }>>(`${this.baseUrl}/addresses`, data);
  }

  updateAddress(id: number, data: Partial<Address>): Observable<ApiResponse<{ address: Address }>> {
    return this.http.put<ApiResponse<{ address: Address }>>(`${this.baseUrl}/addresses/${id}`, data);
  }

  deleteAddress(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/addresses/${id}`);
  }

  setDefaultAddress(id: number): Observable<ApiResponse<{ address: Address }>> {
    return this.http.put<ApiResponse<{ address: Address }>>(`${this.baseUrl}/addresses/${id}/default`, {});
  }

  cancelOrder(id: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/orders/${id}/cancel`, {});
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  getNotifications(limit: number = 20): Observable<ApiResponse<{ notifications: Notification[]; unreadCount: number }>> {
    return this.http.get<ApiResponse<{ notifications: Notification[]; unreadCount: number }>>(
      `${this.baseUrl}/notifications?limit=${limit}`
    );
  }

  markNotificationRead(id: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/notifications/read-all`, {});
  }

  // ── Seller Hub ─────────────────────────────────────────────────────────────

  getSellerDashboard(): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.get<ApiResponse<Record<string, unknown>>>(`${this.baseUrl}/seller/dashboard`);
  }

  getSellerOrders(filters: { status?: string; page?: number; limit?: number } = {}): Observable<ApiResponse<{ orders: any[] }>> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page)   params = params.set('page',   filters.page.toString());
    if (filters.limit)  params = params.set('limit',  filters.limit.toString());
    return this.http.get<ApiResponse<{ orders: any[] }>>(`${this.baseUrl}/seller/orders`, { params });
  }

  updateSellerOrderStatus(orderId: number, status: string, trackingNumber?: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/seller/orders/${orderId}/status`, { status, trackingNumber });
  }
}
