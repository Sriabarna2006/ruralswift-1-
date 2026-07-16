// src/app/services/seller.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse, Product } from './api.service';

export interface SellerDashboard {
  totalProducts:  number;
  totalOrders:    number;
  totalRevenue:   number;
  lowStockCount:  number;
  // Legacy display aliases (mapped from API fields)
  totalSales:     number;
  activeOrders:   number;
  productsListed: number;
  lowStock:       number;
}

export interface SellerOrder {
  order_id:         number;
  status:           string;
  total:            number;
  delivery_address: string;
  created_at:       string;
  customer_name:    string;
  customer_phone:   string;
  has_medicine?:    boolean;
}

export interface SellerProfile {
  id:               number;
  user_id:          number;
  business_name:    string;
  gst_number:       string;
  pan_number:       string;
  business_address: string;
  is_verified:      boolean;
  name:             string;
  email:            string;
  phone:            string;
}

@Injectable({ providedIn: 'root' })
export class SellerService {

  private readonly baseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api'
    : '/api';

  constructor(private http: HttpClient, private api: ApiService) {}

  /** Register as a seller */
  register(data: {
    business_name: string;
    gst_number?: string;
    pan_number?: string;
    business_address?: string;
  }): Observable<ApiResponse<{ profile: SellerProfile }>> {
    return this.http.post<ApiResponse<{ profile: SellerProfile }>>(
      `${this.baseUrl}/seller/register`, data
    );
  }

  /** Get seller profile */
  getProfile(): Observable<ApiResponse<{ profile: SellerProfile }>> {
    return this.http.get<ApiResponse<{ profile: SellerProfile }>>(
      `${this.baseUrl}/seller/profile`
    );
  }

  /** Get seller dashboard stats */
  getDashboard(): Observable<ApiResponse<SellerDashboard>> {
    return this.api.getSellerDashboard() as unknown as Observable<ApiResponse<SellerDashboard>>; // safe cast
  }

  /** Get seller's own products */
  getProducts(filters: { search?: string; page?: number; limit?: number } = {}): Observable<ApiResponse<{ products: Product[] }>> {
    let url = `${this.baseUrl}/seller/products`;
    const params: string[] = [];
    if (filters.search) params.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters.page)   params.push(`page=${filters.page}`);
    if (filters.limit)  params.push(`limit=${filters.limit}`);
    if (params.length)  url += '?' + params.join('&');
    return this.http.get<ApiResponse<{ products: Product[] }>>(url);
  }

  /** Add a new product */
  addProduct(data: Partial<Product>): Observable<ApiResponse<{ product: Product }>> {
    return this.http.post<ApiResponse<{ product: Product }>>(
      `${this.baseUrl}/seller/products`, data
    );
  }

  /** Update a product */
  updateProduct(id: number, data: Partial<Product>): Observable<ApiResponse<{ product: Product }>> {
    return this.http.put<ApiResponse<{ product: Product }>>(
      `${this.baseUrl}/seller/products/${id}`, data
    );
  }

  /** Delete (soft) a product */
  deleteProduct(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/seller/products/${id}`);
  }

  // ── Delivery / Drivers ──────────────────────────────────────────────

  getDrivers(): Observable<ApiResponse<{ drivers: any[] }>> {
    return this.http.get<ApiResponse<{ drivers: any[] }>>(`${this.baseUrl}/seller/drivers`);
  }

  createDeliveryRun(driverId: number, orderIds: number[]): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/delivery-runs`, { driverId, orderIds });
  }

  /** Get orders for seller's products */
  getOrders(filters: { status?: string; page?: number; limit?: number } = {}): Observable<ApiResponse<{ orders: SellerOrder[] }>> {
    return this.api.getSellerOrders(filters) as Observable<ApiResponse<{ orders: SellerOrder[] }>>;
  }

  /** Update order status */
  updateOrderStatus(orderId: number, status: string, options?: { trackingNumber?: string, deliveryOtp?: string }): Observable<ApiResponse> {
    return this.api.updateSellerOrderStatus(orderId, status, options?.trackingNumber, options?.deliveryOtp);
  }
}
