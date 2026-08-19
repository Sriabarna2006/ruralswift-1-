import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './driver-dashboard.html',
  styleUrl: './driver-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DriverDashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @ViewChild('map') mapContainer!: ElementRef;
  private map!: L.Map;
  private liveWatchId: number | null = null;
  private locationPushInterval: any = null;
  private availableMapInst: L.Map | null = null;

  public runs = signal<any[]>([]);
  public isLoading = signal(true);
  public activeRun = signal<any | null>(null);
  public stopEtas = signal<string[]>([]);
  public completedDeliveries = signal<any[]>([]);
  public availableOrders = signal<any[]>([]);
  public activeTab = signal<'available' | 'runs' | 'completed' | 'settings'>('available');

  // Profile Settings
  public homeAddress = signal('');
  public isSavingSettings = signal(false);

  // Auth & State
  public isAuthenticated = signal(false);
  public isDriver = signal(false);
  public isUpgrading = signal(false);

  ngOnInit() {
    this.checkAuth();
  }

  ngOnDestroy() {
    this.stopGpsTracking();
  }

  checkAuth() {
    this.isAuthenticated.set(this.api.isLoggedIn());
    const user = this.api.getStoredUser();
    this.isDriver.set(user?.role === 'delivery');
    this.homeAddress.set(user?.address || '');

    if (this.isAuthenticated()) {
      this.loadAvailableOrders();
      if (this.isDriver()) {
        this.loadRuns();
        this.loadCompletedDeliveries();
      } else {
        this.isLoading.set(false);
      }
    } else {
      this.isLoading.set(false);
    }
  }

  /** Returns how many stops in a run are already delivered */
  getDeliveredCount(run: any): number {
    return (run.stops || []).filter((s: any) => s.status === 'delivered').length;
  }

  becomeDriver() {
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.isUpgrading.set(true);
    this.api.becomeDriver().subscribe({
      next: (res) => {
        this.isDriver.set(true);
        const updatedUser = res.data?.user || (res as any).user;
        localStorage.setItem('rs_user', JSON.stringify(updatedUser));
        this.toast.success('Welcome to RuralSwift Logistics!');
        this.isUpgrading.set(false);
        this.loadRuns();
      },
      error: () => {
        this.toast.error('Failed to register as delivery partner.');
        this.isUpgrading.set(false);
      }
    });
  }

  saveSettings() {
    if (!this.homeAddress().trim()) {
      this.toast.error('Please enter a valid base location.');
      return;
    }
    this.isSavingSettings.set(true);
    this.api.updateProfile({ address: this.homeAddress() }).subscribe({
      next: (res) => {
        this.toast.success('Base location saved successfully!');
        this.isSavingSettings.set(false);
        const updatedUser = { ...this.api.getStoredUser(), address: this.homeAddress() } as any;
        localStorage.setItem('rs_user', JSON.stringify(updatedUser));
      },
      error: () => {
        this.toast.error('Failed to save location.');
        this.isSavingSettings.set(false);
      }
    });
  }

  loadRuns() {
    this.isLoading.set(true);
    this.api.getDriverRuns().subscribe({
      next: (res) => {
        this.runs.set(res.data?.runs || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load delivery runs.');
        this.isLoading.set(false);
      }
    });
  }

  viewRun(run: any) {
    this.activeRun.set(run);
    setTimeout(() => { this.initMap(run); }, 150);
  }

  backToList() {
    this.activeRun.set(null);
    this.stopEtas.set([]);
    this.stopGpsTracking();
    if (this.map) { this.map.remove(); }
  }

  stopGpsTracking() {
    if (this.liveWatchId !== null) {
      navigator.geolocation.clearWatch(this.liveWatchId);
      this.liveWatchId = null;
    }
    if (this.locationPushInterval) {
      clearInterval(this.locationPushInterval);
      this.locationPushInterval = null;
    }
  }

  // ─── Geocoding ────────────────────────────────────────────────────────────

  async geocodeIndianAddress(address: string): Promise<[number, number] | null> {
    const headers = { 'Accept-Language': 'en' };
    const tryFetch = async (query: string): Promise<[number, number] | null> => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`,
          { headers }
        );
        const data = await res.json();
        if (data?.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      } catch { }
      return null;
    };

    const pinMatch = address.match(/\b(\d{6})\b/);
    if (pinMatch) {
      const r = await tryFetch(`${pinMatch[1]}, India`);
      if (r) return r;
    }
    const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 3) {
      const r = await tryFetch(parts.slice(-3).join(', ') + ', India');
      if (r) return r;
    }
    if (parts.length >= 2) {
      const r = await tryFetch(parts.slice(-2).join(', ') + ', India');
      if (r) return r;
    }
    return tryFetch(address + ', India');
  }

  // ─── OSRM Route ───────────────────────────────────────────────────────────

  async getOsrmRouteData(waypoints: [number, number][]): Promise<any | null> {
    try {
      const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        return {
          coordinates: data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
          legs: data.routes[0].legs
        };
      }
    } catch { }
    return null;
  }

  /** Haversine distance in km */
  distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─── Map Initialization ───────────────────────────────────────────────────

  async initAvailableMap() {
    if (this.availableMapInst) {
      this.availableMapInst.remove();
      this.availableMapInst = null;
    }

    const mapEl = document.getElementById('available-map-driver') || document.getElementById('available-map-freelance');
    if (!mapEl) return;

    let dLat = 20.5937;
    let dLng = 78.9629;
    let hasGps = false;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 })
      );
      dLat = pos.coords.latitude;
      dLng = pos.coords.longitude;
      hasGps = true;
    } catch { }

    this.availableMapInst = L.map(mapEl).setView([dLat, dLng], hasGps ? 13 : 5);
    
    setTimeout(() => {
      if (this.availableMapInst) {
        this.availableMapInst.invalidateSize();
      }
    }, 250);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(this.availableMapInst);

    if (hasGps) {
      const driverIcon = L.divIcon({
        className: '',
        html: `<div style="background:#1a73e8;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 5px rgba(0,0,0,0.3);border:2px solid #fff;">📍</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15]
      });
      L.marker([dLat, dLng], { icon: driverIcon }).addTo(this.availableMapInst).bindPopup('<b>You are here</b>').openPopup();
    }

    const orders = this.availableOrders();
    const markers: L.Marker[] = [];
    const updatedOrders = [...orders];

    for (let i = 0; i < updatedOrders.length; i++) {
      const order = updatedOrders[i];
      const coords = await this.geocodeIndianAddress(order.delivery_address || '');
      if (coords) {
        if (hasGps) {
          order.distanceKm = this.distanceKm(dLat, dLng, coords[0], coords[1]);
        }
        const pinIcon = L.divIcon({
          className: '',
          html: `<div style="background:#ea4335;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid #fff;">📦</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12]
        });
        const m = L.marker([coords[0], coords[1]], { icon: pinIcon })
          .addTo(this.availableMapInst)
          .bindPopup(`<b>Order #${order.order_id}</b><br>${order.delivery_address}`);
        markers.push(m);
      }
    }

    if (hasGps) {
      updatedOrders.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
    }
    this.availableOrders.set(updatedOrders);

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      if (hasGps) {
        group.addLayer(L.marker([dLat, dLng]));
      }
      this.availableMapInst.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
  }

  async initMap(run: any) {
    if (this.map) { this.map.remove(); }
    this.stopGpsTracking();

    // ── Step 1: Get driver's real GPS ──────────────────────────────────────
    let driverLat = 20.5937;
    let driverLng = 78.9629;
    let hasGps = false;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0
        })
      );
      driverLat = pos.coords.latitude;
      driverLng = pos.coords.longitude;
      hasGps = true;
    } catch {
      this.toast.error('📍 GPS unavailable. Map centered on delivery area.');
    }

    // ── Step 2: Geocode each stop's real address ───────────────────────────
    const stops = (run.stops || []).slice().sort((a: any, b: any) => a.sequence - b.sequence);
    if (stops.length === 0) return;

    const stopCoords: [number, number][] = [];
    for (const stop of stops) {
      const addr = stop.address || stop.delivery_address || '';
      const coords = addr ? await this.geocodeIndianAddress(addr) : null;
      if (coords) {
        stopCoords.push(coords);
      } else {
        stopCoords.push([driverLat + stopCoords.length * 0.01, driverLng + stopCoords.length * 0.01]);
      }
    }

    // ── Step 3: If GPS failed, center on first stop ────────────────────────
    if (!hasGps && stopCoords.length > 0) {
      driverLat = stopCoords[0][0] - 0.02;
      driverLng = stopCoords[0][1] - 0.02;
    }

    // ── Step 4: Calculate ETAs per stop using real road geometry ───────────
    const waypoints: [number, number][] = [[driverLat, driverLng], ...stopCoords];
    const routeData = await this.getOsrmRouteData(waypoints);
    const etaStrings: string[] = [];

    if (routeData && routeData.legs) {
      // Use real OSRM driving durations (seconds)
      let cumulativeSeconds = 0;
      for (const leg of routeData.legs) {
        cumulativeSeconds += leg.duration;
        const etaMins = Math.round(cumulativeSeconds / 60);
        const etaDate = new Date(Date.now() + etaMins * 60 * 1000);
        etaStrings.push(`~${etaMins} min (${etaDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`);
      }
    } else {
      // Fallback straight-line haversine approximation
      const avgSpeedKmh = 30;
      let cumulativeKm = 0;
      let prevLat = driverLat, prevLng = driverLng;
      for (const [sLat, sLng] of stopCoords) {
        cumulativeKm += this.distanceKm(prevLat, prevLng, sLat, sLng);
        const etaMins = Math.round((cumulativeKm / avgSpeedKmh) * 60);
        const etaDate = new Date(Date.now() + etaMins * 60 * 1000);
        etaStrings.push(`~${etaMins} min (${etaDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`);
        prevLat = sLat; prevLng = sLng;
      }
    }
    this.stopEtas.set(etaStrings);

    // ── Step 5: Init map ───────────────────────────────────────────────────
    const centerLat = stopCoords[0][0];
    const centerLng = stopCoords[0][1];
    this.map = L.map(this.mapContainer.nativeElement).setView([centerLat, centerLng], 13);

    // Force Leaflet to recalculate container size (fixes the blank grey map issue)
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 250);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.map);

    // ── Step 6: Driver marker ──────────────────────────────────────────────
    const driverIcon = L.divIcon({
      className: '',
      html: `<div style="background:#1a73e8;color:#fff;border-radius:50%;
        width:42px;height:42px;display:flex;align-items:center;justify-content:center;
        font-size:22px;box-shadow:0 3px 10px rgba(26,115,232,0.6);border:3px solid #fff;">🛵</div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });

    let driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
      .addTo(this.map)
      .bindPopup(`<b>📍 Your Location</b>${hasGps ? '' : '<br><small>(GPS unavailable)</small>'}`)
      .openPopup();

    // ── Step 7: Stop markers ───────────────────────────────────────────────
    stops.forEach((stop: any, i: number) => {
      const [sLat, sLng] = stopCoords[i];
      const stopIcon = L.divIcon({
        className: '',
        html: `<div style="background:#ea4335;color:#fff;border-radius:50%;
          width:38px;height:38px;display:flex;align-items:center;justify-content:center;
          font-size:15px;font-weight:bold;box-shadow:0 3px 10px rgba(234,67,53,0.6);border:3px solid #fff;">${i + 1}</div>`,
        iconSize: [38, 38], iconAnchor: [19, 19]
      });
      L.marker([sLat, sLng], { icon: stopIcon })
        .addTo(this.map)
        .bindPopup(`<b>Stop ${i + 1}</b><br>${stop.address || 'Delivery Location'}<br><small>ETA: ${etaStrings[i]}</small>`);
    });

    // ── Step 8: Draw OSRM road route through all waypoints ─────────────────
    if (routeData) {
      L.polyline(routeData.coordinates, {
        color: '#1a73e8', weight: 6, opacity: 0.85, lineJoin: 'round', lineCap: 'round'
      }).addTo(this.map);
      this.map.fitBounds(L.latLngBounds(routeData.coordinates), { padding: [50, 50] });
    } else {
      // Fallback straight lines
      L.polyline(waypoints, { color: '#1a73e8', weight: 5, dashArray: '10, 8' }).addTo(this.map);
      this.map.fitBounds(L.latLngBounds(waypoints), { padding: [50, 50] });
    }

    // ── Step 9: Push GPS to backend & watch for updates ────────────────────
    const pushLocation = (lat: number, lng: number) => {
      this.api.updateDriverLocation(lat, lng).subscribe({ error: () => {} });
    };

    if (hasGps) {
      pushLocation(driverLat, driverLng);

      this.liveWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          driverMarker.setLatLng([newLat, newLng]);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000 }
      );

      this.locationPushInterval = setInterval(() => {
        const pos = driverMarker.getLatLng();
        pushLocation(pos.lat, pos.lng);
      }, 5000);
    }
  }

  markDelivered(orderId: number) {
    const otp = prompt('Please ask the customer for their Delivery OTP:');
    if (!otp) return;

    this.api.updateDriverOrderStatus(orderId, 'delivered', otp).subscribe({
      next: () => {
        this.toast.success('Order delivered successfully!');
        
        // Reload driver runs and keep active run if there are remaining stops
        this.api.getDriverRuns().subscribe({
          next: (resUpdated) => {
            const updatedRuns = resUpdated.data?.runs || [];
            this.runs.set(updatedRuns);
            
            // Reload completed deliveries list
            this.loadCompletedDeliveries();

            const currentActive = this.activeRun();
            if (currentActive) {
              const freshRun = updatedRuns.find((r: any) => r.id === currentActive.id);
              if (freshRun) {
                if (freshRun.status === 'completed') {
                  this.activeRun.set(null);
                  this.stopGpsTracking();
                  if (this.map) { this.map.remove(); }
                  this.toast.success('Awesome! Delivery run is complete!');
                } else {
                  // Keep driver on active run screen with remaining stops
                  this.activeRun.set(freshRun);
                  setTimeout(() => { this.initMap(freshRun); }, 150);
                }
              } else {
                this.activeRun.set(null);
                this.stopGpsTracking();
                if (this.map) { this.map.remove(); }
              }
            }
          }
        });
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to verify OTP.');
      }
    });
  }

  loadCompletedDeliveries() {
    this.api.getCompletedDeliveries().subscribe({
      next: (res) => {
        this.completedDeliveries.set(res.data?.deliveries || []);
      },
      error: () => {
        this.toast.error('Failed to load completed deliveries.');
      }
    });
  }

  loadAvailableOrders() {
    this.api.getAvailableOrders().subscribe({
      next: (res) => {
        this.availableOrders.set(res.data?.orders || []);
        setTimeout(() => this.initAvailableMap(), 150);
      },
      error: () => {
        this.toast.error('Failed to load available orders.');
      }
    });
  }

  claimOrder(orderId: number) {
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.isUpgrading.set(true);
    this.api.claimOrder(orderId).subscribe({
      next: (res) => {
        this.toast.success('Order claimed successfully! Start your delivery run.');
        this.isDriver.set(true);
        const updatedUser = { ...this.api.getStoredUser(), role: 'delivery' };
        localStorage.setItem('rs_user', JSON.stringify(updatedUser));
        this.isUpgrading.set(false);
        this.setTab('runs');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to claim order.');
        this.isUpgrading.set(false);
        this.loadAvailableOrders();
      }
    });
  }

  unclaimOrder(orderId: number) {
    if (!confirm('Are you sure you want to cancel this delivery? It will be returned to the available orders list.')) return;
    this.api.unclaimOrder(orderId).subscribe({
      next: () => {
        this.toast.success('Delivery cancelled successfully.');
        
        // Refresh runs
        this.api.getDriverRuns().subscribe({
          next: (resUpdated) => {
            const updatedRuns = resUpdated.data?.runs || [];
            this.runs.set(updatedRuns);
            
            const currentActive = this.activeRun();
            if (currentActive) {
              const freshRun = updatedRuns.find((r: any) => r.id === currentActive.id);
              if (freshRun) {
                if (freshRun.status === 'completed' || freshRun.stops?.length === 0) {
                  this.activeRun.set(null);
                  this.stopGpsTracking();
                  if (this.map) { this.map.remove(); }
                } else {
                  this.activeRun.set(freshRun);
                  setTimeout(() => { this.initMap(freshRun); }, 150);
                }
              } else {
                this.activeRun.set(null);
                this.stopGpsTracking();
                if (this.map) { this.map.remove(); }
              }
            }
          }
        });
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to cancel delivery.');
      }
    });
  }

  setTab(tab: 'available' | 'runs' | 'completed') {
    this.activeTab.set(tab);
    if (tab === 'completed') {
      this.loadCompletedDeliveries();
    } else if (tab === 'runs') {
      this.loadRuns();
    } else {
      this.loadAvailableOrders();
    }
  }
}
