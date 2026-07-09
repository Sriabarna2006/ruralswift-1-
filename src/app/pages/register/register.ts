import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, DirectLoginResponse, RegisterResponse, RegisterOtpResponse } from '../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {

  // Form fields
  firstName       = '';
  lastName        = '';
  email           = '';
  phone           = '';
  password        = '';
  confirmPassword = '';
  otp             = '';
  pendingEmail    = '';

  // UI state
  showPassword     = false;
  showConfirm      = false;
  otpStep          = false;
  isLoading        = false;
  errorMessage     = '';
  successMessage   = '';
  passwordStrength = ''; // 'weak' | 'fair' | 'strong'
  strengthScore    = 0;
  strengthText     = '';

  constructor(private router: Router, private api: ApiService) {
    // If already logged in, redirect to dashboard
    if (this.api.getToken()) {
      this.router.navigate(['/dashboard']);
    }
  }

  get isEmailExistsError(): boolean {
    return this.errorMessage ? this.errorMessage.toLowerCase().includes('already exists') : false;
  }

  /** Calculate password strength */
  checkStrength() {
    const p = this.password;
    let score = 0;

    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    this.strengthScore = Math.min(score, 4);

    if (score <= 1)      { this.passwordStrength = 'weak';   this.strengthText = 'Weak'; }
    else if (score <= 2) { this.passwordStrength = 'fair';   this.strengthText = 'Fair'; }
    else if (score <= 3) { this.passwordStrength = 'fair';   this.strengthText = 'Good'; }
    else                 { this.passwordStrength = 'strong'; this.strengthText = 'Strong'; }
  }

  /** Returns CSS class for each strength bar segment */
  strengthClass(segment: number): string {
    if (this.strengthScore >= segment) {
      return this.passwordStrength;
    }
    return '';
  }

  /** Register form submit — also works as "Resend OTP" when otpStep is true */
  register() {
    this.errorMessage   = '';
    this.successMessage = '';

    const isResend = this.otpStep; // true when resending from OTP screen

    // Skip form validation on resend — use the already-submitted data
    if (!isResend) {
      if (!this.firstName.trim()) {
        this.errorMessage = 'First name is required.'; return;
      }
      if (!this.email.trim()) {
        this.errorMessage = 'Email address is required.'; return;
      }
      if (!this.phone.trim()) {
        this.errorMessage = 'Mobile number is required.'; return;
      }
      if (!this.isValidIndianMobile(this.phone)) {
        this.errorMessage = 'Please enter a valid 10-digit Indian mobile number.'; return;
      }
      if (!this.password) {
        this.errorMessage = 'Password is required.'; return;
      }
      if (this.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters.'; return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match.'; return;
      }
    }

    this.isLoading = true;

    this.api.register({
      first_name: this.firstName.trim(),
      last_name:  this.lastName.trim(),
      email:      (this.pendingEmail || this.email).trim(),
      phone:      this.phone.trim(),
      password:   this.password
    }).subscribe({
      next: (res: RegisterResponse) => {
        this.isLoading = false;

        if ('directLogin' in res && res.directLogin) {
          // Existing verified account with correct password → auto-login
          this.api.saveSession(res.token, res.user);
          this.successMessage = 'Welcome back! Logging you in...';
          setTimeout(() => this.router.navigate(['/home']), 1200);
        } else {
          const otpRes = res as RegisterOtpResponse;
          this.pendingEmail = otpRes.email;
          this.otpStep = true;
          this.otp = '';
          this.successMessage = isResend
            ? `New OTP sent to ${otpRes.email}. Check your inbox!`
            : `OTP sent to ${otpRes.email}. Please verify to create your account.`;
        }
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  verifyOtp() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.pendingEmail) {
      this.errorMessage = 'Please register again to receive an OTP.';
      return;
    }
    if (!/^\d{6}$/.test(this.otp.trim())) {
      this.errorMessage = 'Please enter the 6-digit OTP.';
      return;
    }

    this.isLoading = true;

    this.api.verifyRegistrationOtp(this.pendingEmail, this.otp).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.api.saveSession(res.token, res.user);
        this.successMessage = 'Email verified! Redirecting to dashboard...';
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'OTP verification failed. Please try again.';
      }
    });
  }

  private isValidIndianMobile(phone: string): boolean {
    const digits = phone.replace(/[\s\-\+\(\)]/g, '');
    const localNumber = digits.replace(/^(91|0)/, '');
    return /^[6-9]\d{9}$/.test(localNumber);
  }

}
