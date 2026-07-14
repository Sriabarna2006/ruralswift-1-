// src/app/pages/orders/orders.ts
import { Component, OnInit, ChangeDetectionStrategy, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Order } from '../../services/api.service';
import { ImageKitService } from '../../services/imagekit.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiService);
  public imageKit = inject(ImageKitService);
  public readonly placeholderImage = this.imageKit.placeholder();

  public orders = signal<Order[]>([]);
  public isLoading = signal(true);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.api.getOrders().subscribe({
      next: (res) => {
        this.orders.set(res.data?.orders ?? []);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      delivered: 'status--delivered',
      cancelled: 'status--cancelled',
      shipped:   'status--shipped',
      processing:'status--processing',
      pending:   'status--pending',
    };
    return map[status?.toLowerCase()] || 'status--pending';
  }
}
