// src/app/pages/order-tracking/order-tracking.ts
import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Order } from '../../services/api.service';
import { ImageKitService } from '../../services/imagekit.service';
import * as L from 'leaflet';

interface TimelineStep {
  key?:      string;
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
export class OrderTrackingComponent implements OnInit, OnDestroy {
  public api    = inject(ApiService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  public imageKit = inject(ImageKitService);
  public readonly placeholderImage = this.imageKit.placeholder();

  public searchId    = signal('');
  public isLoading   = signal(false);
  public isCancelling = signal(false);
  public error       = signal('');
  public order           = signal<Order | null>(null);
  public timeline        = signal<TimelineStep[]>([]);
  public fastTrackLoading = signal(false);
  public fastTrack       = signal<{ standard: number, optimized: number, saved: number, unit: string, distKm: number } | null>(null);
  public driverLocation  = signal<{ lat: number; lng: number; isStale: boolean } | null>(null);
  public etaWindow       = signal<{ earliest: string; latest: string; etaMins: number } | null>(null);

  @ViewChild('trackingMap') mapContainer?: ElementRef;
  private map?: L.Map;
  private driverPollInterval: any = null;
  private driverMarker?: L.Marker;

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

  ngOnDestroy(): void {
    if (this.driverPollInterval) clearInterval(this.driverPollInterval);
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

        // Kick off real distance → FastTrack calculation in background
        this.computeFastTrack(o);

        if (o.status === 'out_for_delivery') {
          setTimeout(() => this.initMap(), 100);
          this.startDriverPolling(o.order_id);
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

  /** Build the order status timeline steps */
  private buildTimeline(o: Order): TimelineStep[] {
    const rawStatus = o.status?.toLowerCase() ?? 'pending';
    const base = new Date(o.created_at);

    if (rawStatus === 'cancelled') {
      return [
        {
          key: 'pending', label: 'Order Placed', emoji: '📦',
          completed: true, current: false,
          date: this.formatDate(o.created_at || ''),
          time: new Date(o.created_at || '').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        },
        {
          key: 'cancelled', label: 'Order Cancelled', emoji: '❌',
          completed: true, current: true,
          date: this.formatDate(o.cancelled_at || o.updated_at || ''),
          time: new Date(o.cancelled_at || o.updated_at || '').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }
      ];
    }

    const currentIdx = this.STATUSES.findIndex(s => s.key === rawStatus);

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

  // ── Real-World FastTrack ETA Calculation ───────────────────────────────────

  /**
   * Determines accurate delivery ETA by:
   * 1. Using seller GPS (if stored) OR geocoding seller's business address
   * 2. Geocoding the customer's delivery address
   * 3. Getting OSRM road distance (actual road km, not straight-line)
   * 4. Applying real rural India delivery speed benchmarks
   */
  async computeFastTrack(o: Order): Promise<void> {
    this.fastTrackLoading.set(true);
    this.fastTrack.set(null);

    try {
      // Step 1 — Get seller coordinates
      let sellerLat: number | null = o.seller_lat ?? null;
      let sellerLng: number | null = o.seller_lng ?? null;

      // If not stored, try geocoding seller's business address
      if ((!sellerLat || !sellerLng) && o.seller_address) {
        const coords = await this.geocodeAddress(o.seller_address);
        if (coords) { sellerLat = coords[0]; sellerLng = coords[1]; }
      }

      // Step 2 — Get customer delivery coordinates
      if (!o.delivery_address) { this.fastTrackLoading.set(false); return; }
      const deliveryCoords = await this.geocodeAddress(o.delivery_address);
      if (!deliveryCoords) { this.fastTrackLoading.set(false); return; }

      const [deliveryLat, deliveryLng] = deliveryCoords;

      // Step 3 — Get OSRM road distance (real road km)
      let roadKm = 0;
      let osrmMins = 0;
      let gotOsrm = false;

      if (sellerLat && sellerLng) {
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/` +
            `${sellerLng},${sellerLat};${deliveryLng},${deliveryLat}?overview=false`;
          const res = await fetch(osrmUrl);
          const data = await res.json();
          if (data.routes?.length > 0) {
            roadKm   = data.routes[0].distance / 1000;        // metres → km
            osrmMins = data.routes[0].duration / 60;          // seconds → mins
            gotOsrm  = true;
          }
        } catch { /* fall through to Haversine */ }
      }

      if (!gotOsrm) {
        // Haversine straight-line × 1.35 road-factor as fallback
        roadKm = this.distanceKm(
          sellerLat ?? deliveryLat,
          sellerLng ?? deliveryLng,
          deliveryLat,
          deliveryLng
        ) * 1.35;
        osrmMins = (roadKm / 30) * 60; // assume 30 km/h rural average
      }

      // Step 4 — Calculate FastTrack stats
      this.fastTrack.set(this.calcFastTrackStats(roadKm, osrmMins));
    } catch {
      // Silent fail — FastTrack section just won't show
    } finally {
      this.fastTrackLoading.set(false);
    }
  }

  /**
   * Converts real road distance + OSRM travel time into human-readable
   * Standard vs Optimized delivery estimates.
   *
   * Standard = typical courier / unoptimized route speed
   * Optimized = RuralSwift batched route (25-30% faster)
   *
   * Speed benchmarks for rural India deliveries:
   *   < 5 km   → same-village: 20–45 min
   *   5–20 km  → local town:   45–120 min
   *   20–80 km → inter-town:   3–6 hrs
   *   80–300km → inter-city:   same day or next day
   *   300+ km  → long haul:    multiple days
   */
  private calcFastTrackStats(
    roadKm: number,
    osrmMins: number
  ): { standard: number; optimized: number; saved: number; unit: string; distKm: number } {

    const round1 = (n: number) => Math.round(n * 10) / 10;

    if (roadKm < 5) {
      // ── Hyperlocal (same village / colony) ────────────────────────────────
      const optimized = Math.max(10, Math.round(osrmMins * 1.1));   // ~10% overhead (loading, handoff)
      const standard  = Math.max(20, Math.round(osrmMins * 1.6));   // typical unoptimized local delivery
      return { standard, optimized, saved: standard - optimized, unit: 'Mins', distKm: round1(roadKm) };

    } else if (roadKm < 20) {
      // ── Local town (< 20 km) ──────────────────────────────────────────────
      const optimized = Math.max(20, Math.round(osrmMins * 1.15));
      const standard  = Math.max(45, Math.round(osrmMins * 1.55));
      return { standard, optimized, saved: standard - optimized, unit: 'Mins', distKm: round1(roadKm) };

    } else if (roadKm < 80) {
      // ── Inter-town / district (20–80 km) — show in Hours ─────────────────
      const optimizedH = round1(osrmMins / 60 * 1.15);   // ~15% buffer for rural stops
      const standardH  = round1(osrmMins / 60 * 1.6);    // courier does ~2 trips a day, less efficient
      return {
        standard:  standardH,
        optimized: optimizedH,
        saved:     round1(standardH - optimizedH),
        unit: 'Hours',
        distKm: round1(roadKm)
      };

    } else if (roadKm < 300) {
      // ── Inter-city / large district (80–300 km) — Hours or same-day ──────
      const optimizedH = round1(roadKm / 55);   // ~55 km/h highway average
      const standardH  = round1(roadKm / 35);   // ~35 km/h courier with multiple stops
      if (optimizedH <= 12) {
        return {
          standard:  round1(standardH),
          optimized: round1(optimizedH),
          saved:     round1(standardH - optimizedH),
          unit: 'Hours',
          distKm: round1(roadKm)
        };
      }
      // > 12 hours → show in Days
      return {
        standard:  Math.ceil(standardH  / 10), // working-hour days
        optimized: Math.ceil(optimizedH / 10),
        saved:     Math.ceil(standardH / 10) - Math.ceil(optimizedH / 10),
        unit: 'Days',
        distKm: round1(roadKm)
      };

    } else {
      // ── Long-haul / inter-state (300+ km) ────────────────────────────────
      const standardDays  = Math.ceil(roadKm / 200);  // courier: ~200 km/day
      const optimizedDays = Math.ceil(roadKm / 300);  // RuralSwift express: ~300 km/day
      return {
        standard:  standardDays,
        optimized: optimizedDays,
        saved:     standardDays - optimizedDays,
        unit: 'Days',
        distKm: round1(roadKm)
      };
    }
  }

  /** Haversine distance in km */
  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Poll backend for driver's live GPS every 8 seconds */
  startDriverPolling(orderId: number) {
    if (this.driverPollInterval) clearInterval(this.driverPollInterval);

    const poll = () => {
      this.api.getOrderDriverLocation(orderId).subscribe({
        next: (res) => {
          const d = res.data;
          if (!d?.locationAvailable || !d.lat || !d.lng) return;

          this.driverLocation.set({ lat: d.lat, lng: d.lng, isStale: d.isStale ?? false });

          // Update driver marker on map
          if (this.driverMarker) {
            this.driverMarker.setLatLng([d.lat, d.lng]);
          }

          // Calculate ETA to delivery address
          const order = this.order();
          // We have the geocoded delivery coords stored after initMap runs
          const deliverCoords = (this as any)._deliveryCoords as [number, number] | undefined;
          if (deliverCoords) {
            const distKm = this.distanceKm(d.lat, d.lng, deliverCoords[0], deliverCoords[1]);
            const etaMins = Math.round((distKm / 30) * 60); // 30 km/h avg rural speed
            const minMins = Math.max(1, etaMins - 5);
            const maxMins = etaMins + 10;
            const earliest = new Date(Date.now() + minMins * 60000);
            const latest = new Date(Date.now() + maxMins * 60000);
            this.etaWindow.set({
              etaMins,
              earliest: earliest.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              latest: latest.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
          }
        },
        error: () => {}
      });
    };

    poll();
    this.driverPollInterval = setInterval(poll, 8000);
  }

  get progressPercent(): number {
    const t = this.timeline();
    if (t.some(s => s.key === 'cancelled')) return 100;
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

    // --- Step 3: Initialize map at delivery location ---
    this.map = L.map(this.mapContainer.nativeElement).setView([deliveryLat, deliveryLng], 14);
    
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 250);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Store delivery coords so driver polling can calculate ETA
    (this as any)._deliveryCoords = [deliveryLat, deliveryLng];

    // --- Step 4: Delivery address marker (always shown) ---
    const homeIcon = L.divIcon({
      className: '',
      html: `<div style="background:#ea4335;color:#fff;border-radius:50%;
        width:42px;height:42px;display:flex;align-items:center;
        justify-content:center;font-size:20px;
        box-shadow:0 3px 10px rgba(234,67,53,0.5);border:3px solid #fff;">🏠</div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });
    L.marker([deliveryLat, deliveryLng], { icon: homeIcon })
      .addTo(this.map)
      .bindPopup(`<b>🏠 Your Delivery Address</b><br>${orderData?.delivery_address || ''}`);

    // --- Step 5: Driver marker (uses real GPS if available, else offset) ---
    const liveLoc = this.driverLocation();
    const hasRealDriverLoc = liveLoc?.lat && liveLoc?.lng;
    if (hasRealDriverLoc) {
      driverLat = liveLoc!.lat;
      driverLng = liveLoc!.lng;
    }

    const driverIcon = L.divIcon({
      className: '',
      html: `<div style="background:#1a73e8;color:#fff;border-radius:50%;
        width:42px;height:42px;display:flex;align-items:center;
        justify-content:center;font-size:20px;
        box-shadow:0 3px 10px rgba(26,115,232,0.5);border:3px solid #fff;">🛵</div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });

    // Store as class property so driver polling can update it
    this.driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
      .addTo(this.map)
      .bindPopup('<b>🛵 Driver is on the way!</b>')
      .openPopup();

    // --- Step 6: OSRM road route ---
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`;
      const routeRes = await fetch(osrmUrl);
      const routeData = await routeRes.json();

      if (routeData.routes?.length > 0) {
        const coordinates: [number, number][] = routeData.routes[0].geometry.coordinates
          .map((c: number[]) => [c[1], c[0]] as [number, number]);

        L.polyline(coordinates, {
          color: '#1a73e8', weight: 6, opacity: 0.85, lineJoin: 'round', lineCap: 'round'
        }).addTo(this.map!);

        this.map.fitBounds(L.latLngBounds(coordinates), { padding: [50, 50] });

        // Animate driver along road only if no real location available (simulation)
        if (!hasRealDriverLoc) {
          const totalPoints = coordinates.length;
          const pointsPerStep = totalPoints / (15 * 60 * 1000 / 2000);
          let progress = 0;
          const animate = () => {
            if (progress >= totalPoints - 1 || !this.map) return;
            progress += pointsPerStep;
            const idx = Math.min(Math.floor(progress), totalPoints - 1);
            const currentPos = coordinates[idx];
            this.driverMarker?.setLatLng(currentPos);

            // Update simulated ETA
            const distKm = this.distanceKm(currentPos[0], currentPos[1], deliveryLat, deliveryLng);
            const etaMins = Math.round((distKm / 30) * 60);
            const minMins = Math.max(1, etaMins - 5);
            const maxMins = etaMins + 10;
            const earliest = new Date(Date.now() + minMins * 60000);
            const latest = new Date(Date.now() + maxMins * 60000);
            this.etaWindow.set({
              etaMins,
              earliest: earliest.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              latest: latest.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });

            setTimeout(animate, 2000);
          };
          setTimeout(animate, 1000);
        }
      }
    } catch {
      L.polyline([[driverLat, driverLng], [deliveryLat, deliveryLng]], {
        color: '#1a73e8', weight: 5, dashArray: '10, 8', opacity: 0.75
      }).addTo(this.map);
      this.map.fitBounds(L.latLngBounds([[driverLat, driverLng], [deliveryLat, deliveryLng]]), { padding: [50, 50] });
    }
  }

  /** Cancel a pending order */
  cancelOrder(): void {
    const o = this.order();
    if (!o) return;
    if (!confirm('Are you sure you want to cancel this order?')) return;

    this.isCancelling.set(true);
    this.error.set('');

    this.api.cancelOrder(o.order_id).subscribe({
      next: () => {
        this.isCancelling.set(false);
        // Reload the full order to properly populate items array and trigger UI updates
        this.trackOrder();
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.error.set(err.error?.message || 'Failed to cancel order. Please try again.');
      }
    });
  }
}
