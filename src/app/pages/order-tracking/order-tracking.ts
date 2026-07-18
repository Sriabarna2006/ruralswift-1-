// src/app/pages/order-tracking/order-tracking.ts
import {
  Component, OnInit, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Order } from '../../services/api.service';
import { ImageKitService } from '../../services/imagekit.service';
import * as L from 'leaflet';

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
  public fastTrack  = signal<{ standard: number, optimized: number, saved: number, unit: string } | null>(null);

  @ViewChild('trackingMap') mapContainer?: ElementRef;
  private map?: L.Map;

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
        
        // --- RuralSwift FastTrack Optimization Logic ---
        // For presentation: dynamically show how RuralSwift cuts down delivery time.
        // We use the order.id to pseudo-randomly pick long, medium, or short distances.
        const idVal = o.order_id || 1;
        if (idVal % 3 === 0) {
          // Simulate Long-Distance Village Delivery
          this.fastTrack.set({ standard: 8, optimized: 5, saved: 3, unit: 'Days' });
        } else if (idVal % 3 === 1) {
          // Simulate Inter-city/District Delivery
          this.fastTrack.set({ standard: 48, optimized: 24, saved: 24, unit: 'Hours' });
        } else {
          // Simulate Near/Local Village Delivery
          this.fastTrack.set({ standard: 45, optimized: 20, saved: 25, unit: 'Mins' });
        }
        
        this.order.set(o);
        this.timeline.set(this.buildTimeline(o));
        this.isLoading.set(false);
        if (o.status === 'out_for_delivery') {
          setTimeout(() => this.initMap(), 100);
        }
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
        
        // Calculate the optimized spread between steps based on FastTrack
        const fTrack = this.fastTrack();
        let optimizedHours = 30; // Default ~1.25 days
        
        if (fTrack) {
          if (fTrack.unit === 'Days') optimizedHours = fTrack.optimized * 24;
          else if (fTrack.unit === 'Hours') optimizedHours = fTrack.optimized;
          else if (fTrack.unit === 'Mins') optimizedHours = fTrack.optimized / 60;
        }
        
        const hoursPerStep = optimizedHours / (this.STATUSES.length - 1);
        
        // Add calculated time to the base date
        const extraMs = i * hoursPerStep * 60 * 60 * 1000;
        d.setTime(d.getTime() + extraMs);
        
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

  async geocodeAddress(address: string): Promise<[number, number] | null> {
    const headers = { 'Accept-Language': 'en' };

    const tryFetch = async (query: string): Promise<[number, number] | null> => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`,
          { headers }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
      } catch (err) {
        console.error('Geocoding attempt failed:', err);
      }
      return null;
    };

    // 1. Try PIN code first — most reliable for India
    const pinMatch = address.match(/\b(\d{6})\b/);
    if (pinMatch) {
      const result = await tryFetch(`${pinMatch[1]}, India`);
      if (result) return result;
    }

    // 2. Try last 3 comma-parts (locality, city, state)
    const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 3) {
      const result = await tryFetch(parts.slice(-3).join(', ') + ', India');
      if (result) return result;
    }

    // 3. Try last 2 comma-parts (city, state)
    if (parts.length >= 2) {
      const result = await tryFetch(parts.slice(-2).join(', ') + ', India');
      if (result) return result;
    }

    // 4. Full address as last resort
    return tryFetch(address + ', India');
  }

  async initMap(): Promise<void> {
    if (!this.mapContainer) return;
    if (this.map) { this.map.remove(); }

    const orderData = this.order();

    // --- Step 1: Geocode the real delivery address ---
    let deliveryLat = 20.5937;
    let deliveryLng = 78.9629;
    if (orderData?.delivery_address) {
      const coords = await this.geocodeAddress(orderData.delivery_address);
      if (coords) { [deliveryLat, deliveryLng] = coords; }
    }

    // --- Step 2: Get customer's live GPS for driver start point ---
    let driverLat = deliveryLat - 0.02;
    let driverLng = deliveryLng - 0.02;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 8000, maximumAge: 0
        })
      );
      driverLat = pos.coords.latitude;
      driverLng = pos.coords.longitude;
    } catch {
      // use fallback offset from delivery address
    }

    // --- Step 3: Initialize map ---
    this.map = L.map(this.mapContainer.nativeElement).setView([deliveryLat, deliveryLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // --- Step 4: Custom markers ---
    const driverIcon = L.divIcon({
      className: '',
      html: `<div style="background:#1a73e8;color:#fff;border-radius:50%;
        width:40px;height:40px;display:flex;align-items:center;
        justify-content:center;font-size:20px;
        box-shadow:0 2px 8px rgba(26,115,232,0.5);border:3px solid #fff;">🛵</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20]
    });
    const homeIcon = L.divIcon({
      className: '',
      html: `<div style="background:#ea4335;color:#fff;border-radius:50%;
        width:40px;height:40px;display:flex;align-items:center;
        justify-content:center;font-size:20px;
        box-shadow:0 2px 8px rgba(234,67,53,0.5);border:3px solid #fff;">🏠</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20]
    });

    const driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
      .addTo(this.map).bindPopup('<b>🛵 Driver is on the way!</b>').openPopup();

    L.marker([deliveryLat, deliveryLng], { icon: homeIcon })
      .addTo(this.map)
      .bindPopup(`<b>🏠 Delivery Address</b><br>${orderData?.delivery_address || ''}`);

    // --- Step 5: Fetch OSRM real road route ---
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`;
      const routeRes = await fetch(osrmUrl);
      const routeData = await routeRes.json();

      if (routeData.routes && routeData.routes.length > 0) {
        const coordinates: [number, number][] = routeData.routes[0].geometry.coordinates
          .map((c: number[]) => [c[1], c[0]] as [number, number]);

        const routeLine = L.polyline(coordinates, {
          color: '#1a73e8',
          weight: 6,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(this.map!);

        this.map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

        // --- Step 6: Animate driver along real road (15 min simulation) ---
        const totalPoints = coordinates.length;
        const totalMs = 15 * 60 * 1000;
        const intervalMs = 2000;
        const pointsPerStep = totalPoints / (totalMs / intervalMs);
        let progress = 0;

        const animate = () => {
          if (progress >= totalPoints - 1 || !this.map) {
            driverMarker.setLatLng([deliveryLat, deliveryLng]);
            return;
          }
          progress += pointsPerStep;
          const idx = Math.min(Math.floor(progress), totalPoints - 1);
          driverMarker.setLatLng(coordinates[idx]);
          routeLine.setLatLngs(coordinates.slice(idx));
          setTimeout(animate, intervalMs);
        };
        setTimeout(animate, 1000);
      }
    } catch {
      // Fallback straight line
      const routeLine = L.polyline([[driverLat, driverLng], [deliveryLat, deliveryLng]], {
        color: '#1a73e8', weight: 5, dashArray: '10, 8', opacity: 0.75
      }).addTo(this.map);
      this.map.fitBounds(L.latLngBounds([[driverLat, driverLng], [deliveryLat, deliveryLng]]), { padding: [40, 40] });
    }
  }
}

