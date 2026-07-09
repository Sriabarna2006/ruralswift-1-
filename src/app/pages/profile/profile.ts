// src/app/pages/profile/profile.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, UserProfile, Address } from '../../services/api.service';
import { NavbarComponent } from '../../components/navbar/navbar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {

  selectedTab = 'personal';

  // Profile
  profileForm: UserProfile = { first_name: '', last_name: '', email: '', phone: '', gender: '', address: '' };
  profileLoading = false;
  profileSaving  = false;

  // Addresses
  addressList:    Address[] = [];
  addressLoading  = false;
  showAddressForm = false;
  savingAddress   = false;
  newAddress: Partial<Address> = {
    label: 'Home', full_name: '', phone: '',
    address_line1: '', address_line2: '',
    city: '', state: '', pincode: '', is_default: false
  };

  // Toast
  toastMsg  = '';
  showToast = false;
  toastType: 'success' | 'error' = 'success';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    if (!this.api.getToken()) { this.router.navigate(['/login']); return; }

    const stored = this.api.getStoredUser();
    if (stored) this.profileForm = { ...stored };

    this.loadProfile();
  }

  setTab(tab: string): void {
    this.selectedTab = tab;
    if (tab === 'address') this.loadAddresses();
  }

  // ── Profile ───────────────────────────────────────────────────
  loadProfile(): void {
    this.profileLoading = true;
    this.api.getProfile().subscribe({
      next: (res) => {
        this.profileForm    = { ...res.user };
        this.profileLoading = false;
        this.api.saveSession(this.api.getToken()!, res.user);
      },
      error: () => { this.profileLoading = false; }
    });
  }

  saveProfile(): void {
    this.profileSaving = true;
    this.api.updateProfile(this.profileForm).subscribe({
      next: (res) => {
        this.profileSaving = false;
        this.api.saveSession(this.api.getToken()!, res.user);
        this._toast('Profile saved successfully!', 'success');
      },
      error: (err) => {
        this.profileSaving = false;
        this._toast(err.error?.message || 'Failed to save profile.', 'error');
      }
    });
  }

  // ── Addresses ─────────────────────────────────────────────────
  loadAddresses(): void {
    this.addressLoading = true;
    this.api.getAddresses().subscribe({
      next: (res) => {
        this.addressList    = (res as any).data?.addresses ?? [];
        this.addressLoading = false;
      },
      error: () => { this.addressLoading = false; }
    });
  }

  saveAddress(): void {
    if (!this.newAddress.address_line1) { this._toast('Address line 1 is required.', 'error'); return; }
    this.savingAddress = true;
    this.api.addAddress(this.newAddress).subscribe({
      next: () => {
        this.savingAddress   = false;
        this.showAddressForm = false;
        this.newAddress      = { label: 'Home', full_name: '', phone: '', address_line1: '', city: '', state: '', pincode: '', is_default: false };
        this.loadAddresses();
        this._toast('Address saved!', 'success');
      },
      error: (err) => {
        this.savingAddress = false;
        this._toast(err.error?.message || 'Failed to save address.', 'error');
      }
    });
  }

  deleteAddress(id: number): void {
    if (!confirm('Delete this address?')) return;
    this.api.deleteAddress(id).subscribe({
      next: () => { this.loadAddresses(); this._toast('Address deleted.', 'success'); },
      error: () => this._toast('Failed to delete address.', 'error')
    });
  }

  logout(): void { this.api.clearSession(); this.router.navigate(['/login']); }

  private _toast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg  = msg;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 3000);
  }
}