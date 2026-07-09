// src/app/pages/reset-password/reset-password.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

type RPStep = 'form' | 'success';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPasswordComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private api    = inject(ApiService);
  private toast  = inject(ToastService);

  public step            = signal<RPStep>('form');
  public token           = signal('');
  public password        = signal('');
  public confirmPassword = signal('');
  public isLoading       = signal(false);
  public errorMsg        = signal('');
  public showPassword    = signal(false);
  public showConfirm     = signal(false);

  // Password strength meter signals
  public passwordStrength = signal('');
  public strengthScore    = signal(0);
  public strengthText     = signal('');

  ngOnInit(): void {
    const tokenVal = this.route.snapshot.queryParamMap.get('token');
    if (!tokenVal) {
      this.errorMsg.set('Invalid reset link. No reset token was found.');
    } else {
      this.token.set(tokenVal);
    }
  }

  checkStrength(): void {
    const p = this.password();
    let score = 0;

    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    const finalScore = Math.min(score, 4);
    this.strengthScore.set(finalScore);

    if (p.length === 0) {
      this.passwordStrength.set('');
      this.strengthText.set('');
    } else if (finalScore <= 1) {
      this.passwordStrength.set('weak');
      this.strengthText.set('Weak');
    } else if (finalScore <= 2) {
      this.passwordStrength.set('fair');
      this.strengthText.set('Fair');
    } else if (finalScore <= 3) {
      this.passwordStrength.set('fair');
      this.strengthText.set('Good');
    } else {
      this.passwordStrength.set('strong');
      this.strengthText.set('Strong');
    }
  }

  strengthClass(segment: number): string {
    if (this.strengthScore() >= segment) {
      return this.passwordStrength();
    }
    return '';
  }

  submit(): void {
    if (!this.token()) {
      this.errorMsg.set('Unable to reset password. Missing token.');
      return;
    }
    const pass = this.password();
    const conf = this.confirmPassword();

    if (!pass || pass.length < 8) {
      this.errorMsg.set('Password must be at least 8 characters long.');
      return;
    }
    if (pass !== conf) {
      this.errorMsg.set('Passwords do not match.');
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set('');

    this.api.resetPassword(this.token(), pass).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.token) {
          this.api.saveSession(res.token, res.user);
          this.toast.success('Password reset successful! Logging you in...');
          setTimeout(() => this.router.navigate(['/dashboard']), 1500);
        } else {
          this.step.set('success');
          this.toast.success('Password reset successful!');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to reset password. The link may have expired.');
      }
    });
  }
}
