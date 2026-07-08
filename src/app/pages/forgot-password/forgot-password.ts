// src/app/pages/forgot-password/forgot-password.ts
import {
  Component, ChangeDetectionStrategy, inject, signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

type FPStep = 'email' | 'sent';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private toast  = inject(ToastService);
  private router = inject(Router);

  public step       = signal<FPStep>('email');
  public email      = signal('');
  public isLoading  = signal(false);
  public errorMsg   = signal('');

  submit(): void {
    const emailVal = this.email().trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      this.errorMsg.set('Please enter a valid email address.');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set('');

    // Simulate — replace with real API call when endpoint available
    setTimeout(() => {
      this.isLoading.set(false);
      this.step.set('sent');
      this.toast.success('Reset link sent! Check your inbox.');
    }, 1200);
  }
}
