import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './driver-dashboard.html',
  styleUrl: './driver-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DriverDashboardComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @ViewChild('map') mapContainer!: ElementRef;
  private map!: L.Map;
  
  public runs = signal<any[]>([]);
  public isLoading = signal(true);
  public activeRun = signal<any | null>(null);

  // Auth & State
  public isAuthenticated = signal(false);
  public isDriver = signal(false);
  public isUpgrading = signal(false);

  ngOnInit() {
    this.checkAuth();
  }

  checkAuth() {
    this.isAuthenticated.set(this.api.isLoggedIn());
    const user = this.api.getStoredUser();
    this.isDriver.set(user?.role === 'delivery');

    if (this.isAuthenticated() && this.isDriver()) {
      this.loadRuns();
    } else {
      this.isLoading.set(false);
    }
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

  ngAfterViewInit() {
    // We'll initialize the map when an active run is selected
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

    // Wait a tick for the DOM to render the map container, then geocode & render
    setTimeout(() => {
      this.initMap(run);
    }, 100);
  }

  backToList() {
    this.activeRun.set(null);
    if (this.liveWatchId !== null) {
      navigator.geolocation.clearWatch(this.liveWatchId);
      this.liveWatchId = null;
    }
    if (this.map) {
      this.map.remove();
    }
  }

  async geocodeIndianAddress(address: string): Promise<[number, number] | null> {
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
      } catch { /* ignore */ }
      return null;
    };

    // 1. Try PIN code first (most reliable for India)
    const pinMatch = address.match(/\b(\d{6})\b/);
    if (pinMatch) {
      const result = await tryFetch(`${pinMatch[1]}, India`);
      if (result) return result;
    }

    // 2. Try last 3 parts (city, state, pin)
    const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 3) {
      const result = await tryFetch(parts.slice(-3).join(', ') + ', India');
      if (result) return result;
    }

    // 3. Try last 2 parts (city, state)
    if (parts.length >= 2) {
      const result = await tryFetch(parts.slice(-2).join(', ') + ', India');
      if (result) return result;
    }

    // 4. Full address fallback
    return tryFetch(address + ', India');
  }

  private liveWatchId: number | null = null;

  getLivePosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  }

  async drawOsrmRoute(map: L.Map, fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<void> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]] as [number, number]
        );
        L.polyline(coords, {
          color: '#1a73e8',
          weight: 6,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);
      }
    } catch {
      // Fallback to straight dashed line
      L.polyline([[fromLat, fromLng], [toLat, toLng]], {
        color: '#1a73e8', weight: 5, dashArray: '10, 8', opacity: 0.7
      }).addTo(map);
    }
  }

  async initMap(run: any) {
    if (this.map) { this.map.remove(); }
    if (this.liveWatchId !== null) {
      navigator.geolocation.clearWatch(this.liveWatchId);
      this.liveWatchId = null;
    }

    // --- Step 1: Get driver's live GPS position ---
    let driverLat = 20.5937;
    let driverLng = 78.9629;
    let hasLiveLocation = false;

    try {
      const pos = await this.getLivePosition();
      driverLat = pos.coords.latitude;
      driverLng = pos.coords.longitude;
      hasLiveLocation = true;
    } catch {
      this.toast.error('📍 Could not get live location. Using last known position.');
    }

    // --- Step 2: Initialize map at driver's real location ---
    this.map = L.map(this.mapContainer.nativeElement).setView([driverLat, driverLng], 14);

    // Free OpenStreetMap tiles (no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // --- Step 3: Driver live location marker ---
    const driverIcon = L.divIcon({
      className: '',
      html: `<div style="
        background:#1a73e8;color:#fff;border-radius:50%;
        width:40px;height:40px;display:flex;align-items:center;
        justify-content:center;font-size:20px;
        box-shadow:0 2px 8px rgba(26,115,232,0.5);
        border:3px solid #fff;">🛵</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    let driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
      .addTo(this.map)
      .bindPopup(`<b>📍 Your Live Location</b>${hasLiveLocation ? '' : '<br><small>(Approximate)</small>'}`)
      .openPopup();

    // --- Step 4: Geocode & add stop markers ---
    const stops = run.stops || [];
    const stopCoords: [number, number][] = [];

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const address = stop.address || stop.delivery_address || '';
      let sLat = driverLat + (i + 1) * 0.01;
      let sLng = driverLng + (i + 1) * 0.01;

      const coords = address ? await this.geocodeIndianAddress(address) : null;
      if (coords) { [sLat, sLng] = coords; }

      stopCoords.push([sLat, sLng]);

      const stopIcon = L.divIcon({
        className: '',
        html: `<div style="
          background:#ea4335;color:#fff;border-radius:50%;
          width:36px;height:36px;display:flex;align-items:center;
          justify-content:center;font-size:16px;font-weight:bold;
          box-shadow:0 2px 8px rgba(234,67,53,0.5);
          border:3px solid #fff;">${i + 1}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      L.marker([sLat, sLng], { icon: stopIcon })
        .addTo(this.map)
        .bindPopup(`<b>Stop ${i + 1}</b><br>${address || 'Delivery Location'}`);

      // Draw OSRM road route from driver to this stop
      await this.drawOsrmRoute(this.map, driverLat, driverLng, sLat, sLng);
    }

    // --- Step 5: Fit map to show driver + all stops ---
    const allPoints: [number, number][] = [[driverLat, driverLng], ...stopCoords];
    if (allPoints.length > 1) {
      this.map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
    }

    // --- Step 6: Watch live GPS and update driver marker in real time ---
    if (hasLiveLocation && navigator.geolocation) {
      this.liveWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          driverMarker.setLatLng([newLat, newLng]);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
    }
  }

  markDelivered(orderId: number) {
    const otp = prompt('Please ask the customer for their Delivery OTP:');
    if (!otp) return;

    this.api.updateDriverOrderStatus(orderId, 'delivered', otp).subscribe({
      next: () => {
        this.toast.success('Order delivered successfully!');
        this.loadRuns(); // Reload data
        this.activeRun.set(null); // Go back to list
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to verify OTP.');
      }
    });
  }
}
