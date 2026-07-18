// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ImageKitService } from './imagekit.service';
import { AuthStateService } from './auth-state.service';

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
  delivery_otp?:    string;
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

/** Returned when a duplicate registration attempt uses the correct password. */
export interface DirectLoginResponse {
  success: boolean;
  message: string;
  directLogin: true;
  token: string;
  user: UserProfile;
  timestamp?: string;
  requestId?: string;
}

/** Union of the two possible register() outcomes. */
export type RegisterResponse = RegisterOtpResponse | DirectLoginResponse;

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

  private readonly baseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api'
    : '/api';

  constructor(private http: HttpClient, private authState: AuthStateService, private imageKit: ImageKitService) {}

  // ── Session helpers ────────────────────────────────────────────────────────

  saveSession(token: string, user: UserProfile, remember = true): void {
    this.authState.saveSession(token, user, remember);
  }

  getToken(): string | null { return this.authState.getToken(); }

  getStoredUser(): UserProfile | null {
    return this.authState.getUser();
  }

  isLoggedIn(): boolean { return this.authState.isLoggedIn(); }

  clearSession(): void {
    this.authState.clearSession();
    // cart is now server-side only — no localStorage to clear
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/login`,
      { email: credentials.email.trim().toLowerCase(), password: credentials.password }
    );
  }

  logout(): void {
    this.authState.logout();
  }

  register(data: {
    first_name: string;
    last_name:  string;
    email:      string;
    phone:      string;
    password:   string;
  }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
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

  // Alias for auth-overlay compatibility
  verifyOtp(data: { email: string; otp: string }): Observable<AuthResponse> {
    return this.verifyRegistrationOtp(data.email, data.otp);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/auth/forgot-password`,
      { email: email.trim().toLowerCase() }
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/auth/reset-password`,
      { token: token.trim(), password: newPassword }
    );
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.baseUrl}/profile?_t=${Date.now()}`).pipe(
      map(res => ({ ...res, user: this.normalizeUser(res.user) }))
    );
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
    ).pipe(map(res => this.normalizeProductsResponse(res)));
  }

  getProduct(id: number): Observable<ApiResponse<{ product: Product }>> {
    return this.http.get<ApiResponse<{ product: Product }>>(`${this.baseUrl}/products/${id}`).pipe(
      map(res => ({ ...res, data: res.data ? { product: this.normalizeProduct(res.data.product) } : res.data }))
    );
  }

  getProductCategories(): Observable<ApiResponse<{ categories: string[] }>> {
    return this.http.get<ApiResponse<{ categories: string[] }>>(`${this.baseUrl}/products/categories`);
  }

  createProduct(data: Partial<Product>): Observable<ApiResponse<{ product: Product }>> {
    return this.http.post<ApiResponse<{ product: Product }>>(`${this.baseUrl}/products`, data);
  }

  updateAvatar(avatarUrl: string): Observable<ApiResponse<{ user: UserProfile }>> {
    return this.http.patch<ApiResponse<{ user: UserProfile }>>(`${this.baseUrl}/profile/avatar`, { avatar_url: avatarUrl });
  }

  becomeDriver(): Observable<ApiResponse<{ user: UserProfile }>> {
    return this.http.post<ApiResponse<{ user: UserProfile }>>(`${this.baseUrl}/profile/become-driver`, {});
  }

  updateProduct(id: number, data: Partial<Product>): Observable<ApiResponse<{ product: Product }>> {
    return this.http.put<ApiResponse<{ product: Product }>>(`${this.baseUrl}/products/${id}`, data);
  }

  deleteProduct(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/products/${id}`);
  }

  // ── Cart ──────────────────────────────────────────────────────────────────

  getCart(): Observable<ApiResponse<CartResponse>> {
    return this.http.get<ApiResponse<CartResponse>>(`${this.baseUrl}/cart?_t=${Date.now()}`).pipe(
      map(res => ({ ...res, data: res.data ? this.normalizeCart(res.data) : res.data }))
    );
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
    return this.http.get<ApiResponse<{ orders: Order[] }>>(`${this.baseUrl}/orders`, { params }).pipe(
      map(res => ({ ...res, data: res.data ? { orders: res.data.orders.map(order => this.normalizeOrder(order)) } : res.data }))
    );
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
    return this.http.get<ApiResponse<{ items: any[] }>>(`${this.baseUrl}/wishlist?_t=${Date.now()}`).pipe(
      map(res => ({ ...res, data: res.data ? { items: res.data.items.map(item => this.normalizeAnyImageItem(item)) } : res.data }))
    );
  }

  addToWishlist(productId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/wishlist`, { product_id: productId });
  }

  removeFromWishlist(productId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/wishlist/${productId}`);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  getAddresses(): Observable<ApiResponse<{ addresses: Address[] }>> {
    return this.http.get<ApiResponse<{ addresses: Address[] }>>(`${this.baseUrl}/addresses?_t=${Date.now()}`);
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
    ).pipe(map(res => ({ ...res, data: res.data ? { ...res.data, notifications: res.data.notifications.map(notification => this.normalizeAnyImageItem(notification)) } : res.data })));
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
    return this.http.get<ApiResponse<{ orders: any[] }>>(`${this.baseUrl}/seller/orders`, { params }).pipe(
      map(res => ({ ...res, data: res.data ? { orders: res.data.orders.map(order => this.normalizeOrder(order)) } : res.data }))
    );
  }

  updateSellerOrderStatus(orderId: number, status: string, trackingNumber?: string, deliveryOtp?: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/seller/orders/${orderId}/status`, { status, trackingNumber, deliveryOtp });
  }

  // ── Delivery Runs (Driver Hub) ─────────────────────────────────────────────

  getDriverRuns(): Observable<ApiResponse<{ runs: any[] }>> {
    return this.http.get<ApiResponse<{ runs: any[] }>>(`${this.baseUrl}/delivery-runs`);
  }

  getCompletedDeliveries(): Observable<ApiResponse<{ deliveries: any[] }>> {
    return this.http.get<ApiResponse<{ deliveries: any[] }>>(`${this.baseUrl}/completed-deliveries`);
  }

  updateDriverOrderStatus(orderId: number, status: string, deliveryOtp?: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/delivery-runs/orders/${orderId}/status`, { status, deliveryOtp });
  }

  /** Driver pushes their live GPS coords to the backend (called every 5s) */
  updateDriverLocation(lat: number, lng: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/delivery/location`, { lat, lng });
  }

  /** Customer polls driver's current location + ETA for their order */
  getOrderDriverLocation(orderId: number): Observable<ApiResponse<{
    driverAssigned: boolean;
    locationAvailable: boolean;
    lat?: number;
    lng?: number;
    updatedAt?: string;
    isStale?: boolean;
  }>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/delivery/orders/${orderId}/driver-location`);
  }

  private normalizeProductsResponse(res: ApiResponse<{ products: Product[]; pagination: Pagination }>): ApiResponse<{ products: Product[]; pagination: Pagination }> {
    return {
      ...res,
      data: res.data ? {
        ...res.data,
        products: res.data.products.map(product => this.normalizeProduct(product)),
      } : res.data,
    };
  }

  private normalizeProduct(product: Product): Product {
    return {
      ...product,
      image_url: this.imageKit.resolve(product.image_url, 'product'),
      images: (product.images ?? []).map(image => this.imageKit.resolve(image, 'product')),
    };
  }

  private normalizeCart(cart: CartResponse): CartResponse {
    return {
      ...cart,
      items: cart.items.map(item => ({
        ...item,
        image_url: this.imageKit.resolve(item.image_url, 'cart'),
      })),
    };
  }

  private normalizeOrder(order: Order | any): Order | any {
    return {
      ...order,
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            ...item,
            image_url: this.imageKit.resolve(item.image_url, 'cart'),
          }))
        : order.items,
    };
  }

  private normalizeUser(user: UserProfile): UserProfile {
    return {
      ...user,
      avatar_url: this.imageKit.resolve(user.avatar_url, 'profile'),
    };
  }

  private normalizeAnyImageItem<T extends Record<string, any>>(item: T): T {
    const next: Record<string, any> = { ...item };

    if (typeof next['image_url'] === 'string') {
      next['image_url'] = this.imageKit.resolve(next['image_url'], 'product');
    }

    if (typeof next['avatar_url'] === 'string') {
      next['avatar_url'] = this.imageKit.resolve(next['avatar_url'], 'profile');
    }

    if (Array.isArray(next['images'])) {
      next['images'] = next['images'].map((image: any) => typeof image === 'string'
        ? this.imageKit.resolve(image, 'product')
        : image);
    }

    return next as T;
  }
}
