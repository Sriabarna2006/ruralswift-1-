import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './verify-otp.html',
  styleUrl: './verify-otp.css'
})
export class VerifyOtpComponent implements OnInit {

  email        = '';
  otp          = '';
  isLoading    = false;
  isResending  = false;
  errorMessage = '';
  successMessage = '';
  countdown    = 0; // resend cooldown in seconds
  private countdownTimer: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit() {
    // Read the email from query params (?email=...)
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      if (!this.email) {
        // No email in URL — send back to register
        this.router.navigate(['/register']);
      }
    });
    this.startCountdown(30);
  }

  startCountdown(seconds: number) {
    this.countdown = seconds;
    clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.countdown = 0;
      }
    }, 1000);
  }

  verifyOtp() {
    this.errorMessage   = '';
    this.successMessage = '';

    if (!this.otp.trim() || !/^\d{6}$/.test(this.otp.trim())) {
      this.errorMessage = 'Please enter the 6-digit OTP sent to your email.';
      return;
    }

    this.isLoading = true;

    this.api.verifyRegistrationOtp(this.email, this.otp.trim()).subscribe({
      next: () => {
        this.isLoading      = false;
        this.successMessage = '✅ Email verified! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.isLoading    = false;
        const msg = err?.error?.message || '';
        if (msg.includes('expired')) {
          this.errorMessage = 'OTP has expired. Please register again to get a new code.';
        } else if (msg.includes('Invalid') || msg.includes('invalid')) {
          this.errorMessage = 'Incorrect OTP. Please check your email and try again.';
        } else {
          this.errorMessage = msg || 'Verification failed. Please try again.';
        }
      }
    });
  }

  resendOtp() {
    if (this.countdown > 0 || this.isResending) return;

    this.errorMessage   = '';
    this.successMessage = '';
    this.isResending    = true;

    // Navigate back to register with email pre-filled will re-trigger OTP
    // Instead: hit register endpoint again directly
    this.router.navigate(['/register'], { queryParams: { resend: this.email } });
  }

  get maskedEmail(): string {
    const [local, domain] = (this.email || '').split('@');
    if (!local || !domain) return this.email;
    const visible = local.slice(0, 2);
    const stars   = '*'.repeat(Math.max(local.length - 2, 3));
    return `${visible}${stars}@${domain}`;
  }
}
