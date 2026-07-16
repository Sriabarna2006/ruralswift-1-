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
    try {
      // 1. Try full address
      let query = encodeURIComponent(address);
      let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      let data = await res.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }

      // 2. Fallback: Try extracting a 6-digit Indian PIN code
      const pinMatch = address.match(/\b\d{6}\b/);
      if (pinMatch) {
        query = encodeURIComponent(`${pinMatch[0]}, India`);
        res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        data = await res.json();
        if (data && data.length > 0) {
          return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
      }

      // 3. Fallback: Try just the last two words (usually city, state)
      const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) {
        const shortAddress = parts.slice(-2).join(', ');
        query = encodeURIComponent(shortAddress);
        res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        data = await res.json();
        if (data && data.length > 0) {
          return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
      }

    } catch (err) {
      console.error('Geocoding failed', err);
    }
    return null;
  }

  async initMap(): Promise<void> {
    if (!this.mapContainer) return;
    if (this.map) { this.map.remove(); }
    
    // Default to New Delhi
    let baseLat = 28.6139;
    let baseLng = 77.2090;

    // Try to get real coordinates from the delivery address
    const orderData = this.order();
    if (orderData && orderData.delivery_address) {
      const coords = await this.geocodeAddress(orderData.delivery_address);
      if (coords) {
        baseLat = coords[0];
        baseLng = coords[1];
      }
    }
    
    this.map = L.map(this.mapContainer.nativeElement).setView([baseLat, baseLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
    
    // Calculate a starting point for the driver (e.g., a few km away)
    let driverLat = baseLat - 0.015;
    let driverLng = baseLng - 0.015;
    
    const driverMarker = L.marker([driverLat, driverLng]).addTo(this.map).bindPopup('🛵 Driver Location').openPopup();
    const homeMarker = L.marker([baseLat, baseLng]).addTo(this.map).bindPopup('🏠 Delivery Address');
    
    // Fetch real road route from OSRM (Open Source Routing Machine)
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${baseLng},${baseLat}?overview=full&geometries=geojson`;
      const routeRes = await fetch(osrmUrl);
      const routeData = await routeRes.json();
      
      if (routeData.routes && routeData.routes.length > 0) {
        // OSRM returns GeoJSON coordinates as [Lng, Lat], Leaflet uses [Lat, Lng]
        const coordinates = routeData.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
        
        // Draw the real road route (Styled to look exactly like Google Maps routes)
        const routeLine = L.polyline(coordinates, { 
          color: '#00a8ff', // Google Maps vibrant blue
          weight: 6, 
          opacity: 0.8,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(this.map!);
        this.map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

        // Simulate Live Movement along the actual roads (takes 15 mins)
        const totalPoints = coordinates.length;
        const totalDurationMs = 15 * 60 * 1000; // 15 minutes
        const updateIntervalMs = 2000; // 2 seconds
        const totalSteps = totalDurationMs / updateIntervalMs;
        const pointsPerStep = totalPoints / totalSteps;
        
        let currentProgress = 0;
        
        const animate = () => {
          if (currentProgress >= totalPoints - 1 || !this.map) {
            driverMarker.setLatLng([baseLat, baseLng]);
            return;
          }
          
          currentProgress += pointsPerStep;
          const pointIndex = Math.min(Math.floor(currentProgress), totalPoints - 1);
          const currentPoint = coordinates[pointIndex];
          
          driverMarker.setLatLng([currentPoint[0], currentPoint[1]]);
          
          // Update the route line to shrink behind the driver
          const remainingPath = coordinates.slice(pointIndex);
          routeLine.setLatLngs(remainingPath);
          
          setTimeout(animate, updateIntervalMs);
        };
        
        setTimeout(animate, 1000);
      }
    } catch (err) {
      console.error('OSRM Routing failed:', err);
      // Fallback to straight line if OSRM fails
      const routeLine = L.polyline([[driverLat, driverLng], [baseLat, baseLng]], { color: '#00a8ff', weight: 6, dashArray: '10, 10', opacity: 0.8 }).addTo(this.map);
      this.map.fitBounds(L.latLngBounds([[driverLat, driverLng], [baseLat, baseLng]]), { padding: [30, 30] });
    }
  }
}
