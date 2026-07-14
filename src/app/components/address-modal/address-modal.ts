import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiService } from '../../services/ui.service';
import { ApiService, Address } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-address-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './address-modal.html',
  styleUrl: './address-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddressModalComponent implements OnInit {
  public ui = inject(UiService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  public formData: Partial<Address> = {
    label: 'Home',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false
  };
  
  public isSaving = signal(false);

  ngOnInit(): void {
    const edit = this.ui.addressToEdit();
    if (edit) {
      this.formData = { ...edit };
    }
  }

  closeModal(): void {
    this.ui.closeAddressModal();
    this.resetForm();
  }

  resetForm(): void {
    this.formData = {
      label: 'Home',
      full_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      is_default: false
    };
  }

  saveAddress(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const data = this.formData;
    if (!data.full_name || !data.phone || !data.address_line1 || !data.city || !data.state || !data.pincode) {
      this.toast.error('Please fill all required fields');
      return;
    }

    this.isSaving.set(true);

    const request$ = this.formData.id
      ? this.api.updateAddress(this.formData.id, data)
      : this.api.addAddress(data);

    request$.subscribe({
      next: (res) => {
        this.toast.success(this.formData.id ? 'Address updated' : 'Address saved');
        this.isSaving.set(false);
        this.ui.addressSaved.next();
        this.closeModal();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to save address');
        this.isSaving.set(false);
      }
    });
  }
}
