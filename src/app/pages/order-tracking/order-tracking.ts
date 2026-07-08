// src/app/pages/order-tracking/order-tracking.ts
import {
  Component, OnInit, ChangeDetectionStrategy, inject, signal
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Order } from '../../services/api.service';
import { ImageKitService } from '../../services/imagekit.service';

interface TimelineStep {
  label:     string;
  emoji:     string;
  date:      string;
  time:      string;
  completed: boolean;
  current:   boolean;
}

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackingComponent implements OnInit {
  public api    = inject(ApiService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  public imageKit = inject(ImageKitService);
  public readonly placeholderImage = this.imageKit.placeholder();

  public searchId   = signal('');
  public isLoading  = signal(false);
  public error      = signal('');
  public order      = signal<Order | null>(null);
  public timeline   = signal<TimelineStep[]>([]);

  private readonly STATUSES = [
    { key: 'pending',          label: 'Order Placed',      emoji: '📦' },
    { key: 'confirmed',        label: 'Confirmed',          emoji: '✅' },
    { key: 'packed',           label: 'Packed',             emoji: '📫' },
    { key: 'shipped',          label: 'Shipped',            emoji: '🚚' },
    { key: 'out_for_delivery', label: 'Out for Delivery',   emoji: '🛵' },
    { key: 'delivered',        label: 'Delivered',          emoji: '🎉' },
  ];

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        this.searchId.set(String(params['orderId']));
        this.trackOrder();
      }
    });
  }

  trackOrder(): void {
    const raw = this.searchId().trim().replace(/[^0-9]/g, '');
    const id = parseInt(raw, 10);
    if (!id) { this.error.set('Please enter a valid order ID.'); return; }

    this.isLoading.set(true);
    this.error.set('');
    this.order.set(null);

    this.api.getOrder(id).subscribe({
      next: (res) => {
        const o = res.data?.order;
        if (!o) { this.isLoading.set(false); this.error.set('Order not found.'); return; }
        this.order.set(o);
        this.timeline.set(this.buildTimeline(o));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.error.set('Please log in to track your order.');
        } else if (err.status === 404) {
          this.error.set('Order not found. Please check the order ID.');
        } else {
          this.error.set('Failed to load order. Please try again.');
        }
      }
    });
  }

  private buildTimeline(o: Order): TimelineStep[] {
    const rawStatus = o.status?.toLowerCase() ?? 'pending';
    const currentIdx = this.STATUSES.findIndex(s => s.key === rawStatus);
    const base = new Date(o.created_at);

    return this.STATUSES.map((s, i) => {
      const completed = i <= currentIdx;
      const current   = i === currentIdx;
      let date = '', time = '';
      if (completed) {
        const d = new Date(base);
        d.setHours(d.getHours() + i * 6);
        if (s.key === 'delivered' && o.delivered_at) {
          const dd = new Date(o.delivered_at);
          date = dd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          time = dd.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } else {
          date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }
      }
      return { label: s.label, emoji: s.emoji, date, time, completed, current };
    });
  }

  get progressPercent(): number {
    const t = this.timeline();
    const last = [...t].reverse().findIndex(s => s.completed);
    const idx = last === -1 ? 0 : t.length - 1 - last;
    return Math.round((idx / (this.STATUSES.length - 1)) * 100);
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      delivered: 'status--delivered', cancelled: 'status--cancelled',
      shipped: 'status--shipped', confirmed: 'status--confirmed',
      pending: 'status--pending', out_for_delivery: 'status--shipped',
    };
    return m[status?.toLowerCase()] ?? 'status--pending';
  }
}
