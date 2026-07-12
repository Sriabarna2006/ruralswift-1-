// src/app/services/order.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService, Order, ApiResponse } from './api.service';

@Injectable({ providedIn: 'root' })
export class OrderService {

  private readonly baseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api'
    : '/api';

  constructor(private http: HttpClient, private api: ApiService) {}

  /** Get all orders for the logged-in customer */
  getOrders(filters: { status?: string; page?: number; limit?: number } = {}): Observable<ApiResponse<{ orders: Order[] }>> {
    return this.api.getOrders(filters);
  }

  /** Get a single order with its items */
  getOrder(id: number): Observable<ApiResponse<{ order: Order }>> {
    return this.api.getOrder(id);
  }

  /** Place a new order */
  placeOrder(data: {
    deliveryAddress: string;
    paymentMethod?: string;
    notes?: string;
    items: { product_id: number; quantity: number }[];
  }): Observable<ApiResponse<{ order: Order }>> {
    return this.api.placeOrder(data);
  }

  /** Cancel a pending order */
  cancelOrder(id: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/orders/${id}/cancel`, {});
  }
}
