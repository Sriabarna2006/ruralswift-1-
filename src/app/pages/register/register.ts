import { Component } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, RegisterResponse, RegisterOtpResponse } from '../../services/api.service';

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

  // UI state
  isLoading        = false;
  errorMessage     = '';
  successMessage   = '';
  passwordStrength = '';
  strengthScore    = 0;
  strengthText     = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService
  ) {
    if (this.api.getToken()) {
      this.router.navigate(['/home']);
    }
    // If navigated here with ?resend=email, pre-fill and immediately submit
    this.route.queryParams.subscribe(params => {
      if (params['resend']) {
        this.email = params['resend'];
      }
    });
  }

  get isEmailExistsError(): boolean {
    return this.errorMessage?.toLowerCase().includes('already exists') ?? false;
  }

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

  strengthClass(segment: number): string {
    return this.strengthScore >= segment ? this.passwordStrength : '';
  }

  register() {
    this.errorMessage   = '';
    this.successMessage = '';

    if (!this.firstName.trim()) { this.errorMessage = 'First name is required.'; return; }
    if (!this.email.trim())     { this.errorMessage = 'Email address is required.'; return; }
    if (!this.phone.trim())     { this.errorMessage = 'Mobile number is required.'; return; }
    if (!this.isValidIndianMobile(this.phone)) {
      this.errorMessage = 'Please enter a valid 10-digit Indian mobile number.'; return;
    }
    if (!this.password)             { this.errorMessage = 'Password is required.'; return; }
    if (this.password.length < 6)   { this.errorMessage = 'Password must be at least 6 characters.'; return; }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.'; return;
    }

    this.isLoading = true;

    this.api.register({
      first_name: this.firstName.trim(),
      last_name:  this.lastName.trim(),
      email:      this.email.trim(),
      phone:      this.phone.trim(),
      password:   this.password
    }).subscribe({
      next: (res: RegisterResponse) => {
        this.isLoading = false;

        if ('directLogin' in res && res.directLogin) {
          // Already verified account — treat as login
          this.successMessage = 'Account already exists and is verified! Redirecting to login...';
          setTimeout(() => this.router.navigate(['/login']), 1200);
          return;
        }

        // ✅ Navigate to the dedicated OTP page — 100% reliable
        const otpRes = res as RegisterOtpResponse;
        this.router.navigate(['/verify-otp'], {
          queryParams: { email: otpRes.email }
        });
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.name === 'TimeoutError' || err?.status === 0) {
          this.errorMessage = 'Server is not responding. Please make sure the backend is running.';
        } else {
          this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        }
      }
    });
  }

  private isValidIndianMobile(phone: string): boolean {
    const digits      = phone.replace(/[\s\-\+\(\)]/g, '');
    const localNumber = digits.replace(/^(91|0)/, '');
    return /^[6-9]\d{9}$/.test(localNumber);
  }
}
