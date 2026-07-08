// src/app/components/auth-overlay/auth-overlay.ts
import {
  Component, ChangeDetectionStrategy, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { UiService } from '../../services/ui.service';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-auth-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-overlay.html',
  styleUrl: './auth-overlay.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthOverlayComponent {
  public ui     = inject(UiService);
  private api      = inject(ApiService);
  private toastSvc = inject(ToastService);

  // Login form
  loginEmail    = '';
  loginPassword = '';
  loginLoading  = signal(false);

  // Signup form
  signupFirstName = '';
  signupLastName  = '';
  signupEmail     = '';
  signupPhone     = '';
  signupPassword  = '';
  signupLoading   = signal(false);

  // OTP state
  showOtp    = signal(false);
  otpCode    = '';
  otpLoading = signal(false);
  pendingEmail = '';

  close(): void {
    this.ui.closeAuth();
    this.resetForms();
  }

  toggle(mode: 'login' | 'signup'): void {
    this.ui.toggleAuthMode(mode);
    this.resetForms();
  }

  async handleLogin(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loginLoading()) return;
    this.loginLoading.set(true);
    try {
      const res = await firstValueFrom(this.api.login({ email: this.loginEmail, password: this.loginPassword }));
      this.api.saveSession(res.token, res.user);
      this.toastSvc.success('Signed in successfully!');
      this.close();
    } catch (err: any) {
      this.toastSvc.error(err?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      this.loginLoading.set(false);
    }
  }

  async handleSignup(event: Event): Promise<void> {
    event.preventDefault();
    if (this.signupLoading()) return;
    this.signupLoading.set(true);
    try {
      await this.api.register({
        first_name: this.signupFirstName,
        last_name: this.signupLastName,
        email: this.signupEmail,
        phone: this.signupPhone,
        password: this.signupPassword,
      }).toPromise();
      this.pendingEmail = this.signupEmail;
      this.showOtp.set(true);
      this.toastSvc.info('OTP sent! Check your email.');
    } catch (err: any) {
      this.toastSvc.error(err?.error?.message || 'Registration failed.');
    } finally {
      this.signupLoading.set(false);
    }
  }

  async verifyOtp(event: Event): Promise<void> {
    event.preventDefault();
    if (this.otpLoading()) return;
    this.otpLoading.set(true);
    try {
      await this.api.verifyOtp({ email: this.pendingEmail, otp: this.otpCode }).toPromise();
      this.toastSvc.success('Account created! Welcome to RuralSwift 🎉');
      this.close();
    } catch (err: any) {
      this.toastSvc.error(err?.error?.message || 'Invalid OTP. Please try again.');
    } finally {
      this.otpLoading.set(false);
    }
  }

  private resetForms(): void {
    this.loginEmail = '';
    this.loginPassword = '';
    this.signupFirstName = '';
    this.signupLastName = '';
    this.signupEmail = '';
    this.signupPhone = '';
    this.signupPassword = '';
    this.otpCode = '';
    this.showOtp.set(false);
  }
}
