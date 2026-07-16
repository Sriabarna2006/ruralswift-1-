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
    
    // Wait a tick for the DOM to render the map container
    setTimeout(() => {
      this.initMap(run);
    }, 100);
  }

  backToList() {
    this.activeRun.set(null);
    if (this.map) {
      this.map.remove();
    }
  }

  initMap(run: any) {
    if (this.map) {
      this.map.remove();
    }
    
    // Initialize map
    this.map = L.map(this.mapContainer.nativeElement).setView([28.6139, 77.2090], 12); // Default to Delhi

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    const stops = run.stops || [];
    if (stops.length > 0) {
      const latlngs: L.LatLngTuple[] = [];
      
      stops.forEach((stop: any, index: number) => {
        // Mocking lat/lng based on the hub for now (in production, use real coordinates from the stop)
        // Since we didn't send lat/lng to frontend in getDriverRuns, we'll visually mock it here 
        // to show the map working. (In real app, backend sends the lat/long for each order)
        const lat = 28.6139 + (Math.random() * 0.05 - 0.025);
        const lng = 77.2090 + (Math.random() * 0.05 - 0.025);
        latlngs.push([lat, lng]);

        L.marker([lat, lng])
          .addTo(this.map)
          .bindPopup(`<b>Stop ${index + 1}</b><br>${stop.address || 'Delivery Location'}`);
      });

      // Draw route line
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: '#4338ca', weight: 4 }).addTo(this.map);
      }

      // Fit map to markers
      if (latlngs.length > 0) {
        this.map.fitBounds(L.latLngBounds(latlngs));
      }
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
