// src/app/pages/order-tracking/order-tracking.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar';
import { ApiService } from '../../services/api.service';

interface TimelineStep {
  status:    string;
  date:      string;
  time:      string;
  completed: boolean;
}

interface OrderDetails {
  orderId:         string;
  date:            string;
  status:          string;
  deliveryAddress: string;
  paymentMethod:   string;
  trackingNumber:  string;
  deliveryType:    string;
  deliveryPartner: string;
  contact:         string;
  total:           number;
  items:           any[];
  timeline:        TimelineStep[];
}

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.css'
})
export class OrderTrackingComponent implements OnInit {

  searchId      = '';
  loading       = false;
  error         = '';
  orderDetails!: OrderDetails;

  readonly statuses = ['Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // If navigated with ?orderId=xxx, auto-search
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        this.searchId = params['orderId'];
        this.trackOrder();
      }
    });
  }

  trackOrder(): void {
    const id = parseInt(this.searchId.replace(/[^0-9]/g, ''));
    if (!id) { this.error = 'Please enter a valid order ID.'; return; }

    this.loading      = true;
    this.error        = '';

    this.api.getOrder(id).subscribe({
      next: (res) => {
        const o = (res as any).data?.order;
        if (!o) { this.loading = false; this.error = 'Order not found.'; return; }

        this.orderDetails = {
          orderId:         String(o.order_id),
          date:            new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          status:          this._displayStatus(o.status),
          deliveryAddress: o.delivery_address || 'N/A',
          paymentMethod:   o.payment_method === 'cod' ? 'Cash on Delivery (COD)' : (o.payment_method || 'COD'),
          trackingNumber:  o.tracking_number || 'N/A',
          deliveryType:    'Standard Delivery',
          deliveryPartner: 'RuralSwift Logistics',
          contact:         '+91 9876543210',
          total:           o.total,
          items:           o.items || [],
          timeline:        this._buildTimeline(o.status, o.created_at, o.delivered_at)
        };
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.status === 404
          ? 'Order not found. Please check the order ID.'
          : err.status === 401
            ? 'Please log in to track your order.'
            : 'Failed to load order details. Please try again.';
      }
    });
  }

  private _displayStatus(raw: string): string {
    const map: Record<string, string> = {
      pending:           'Order Placed',
      confirmed:         'Confirmed',
      packed:            'Packed',
      shipped:           'Shipped',
      out_for_delivery:  'Out for Delivery',
      delivered:         'Delivered',
      cancelled:         'Cancelled'
    };
    return map[raw?.toLowerCase()] || 'Order Placed';
  }

  private _buildTimeline(rawStatus: string, createdAt: string, deliveredAt?: string): TimelineStep[] {
    const display     = this._displayStatus(rawStatus);
    const currentIdx  = this.statuses.indexOf(display);
    const createdDate = new Date(createdAt);

    return this.statuses.map((s, i) => {
      const isCompleted = i <= currentIdx;
      let date = '--', time = '--';

      if (isCompleted) {
        const d = new Date(createdDate);
        d.setHours(d.getHours() + i * 6);
        if (s === 'Delivered' && deliveredAt) {
          const dd = new Date(deliveredAt);
          date = dd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          time = dd.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } else {
          date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }
      }
      return { status: s, date, time, completed: isCompleted };
    });
  }

  get currentStepIndex(): number {
    if (!this.orderDetails?.status) return -1;
    return this.statuses.indexOf(this.orderDetails.status);
  }

  get progressPercent(): number {
    return ((this.currentStepIndex) / (this.statuses.length - 1)) * 100;
  }

  get reversedTimeline(): (TimelineStep & { realIndex: number })[] {
    return [...(this.orderDetails?.timeline ?? [])]
      .map((step, i) => ({ ...step, realIndex: i }))
      .reverse();
  }

  isCompleted(index: number): boolean { return index <= this.currentStepIndex; }
  isCurrent(index: number):   boolean { return index === this.currentStepIndex; }

  getStepIcon(status: string): string {
    const icons: Record<string, string> = {
      'Order Placed': 'box', 'Confirmed': 'check', 'Packed': 'package',
      'Shipped': 'truck', 'Out for Delivery': 'map-pin', 'Delivered': 'check-circle'
    };
    return icons[status] || 'box';
  }
}
