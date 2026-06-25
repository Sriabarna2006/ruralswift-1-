import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

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
  showPassword     = false;
  showConfirm      = false;
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

  /** Register form submit */
  register() {
    this.errorMessage   = '';
    this.successMessage = '';

    // Validation
    if (!this.firstName.trim()) {
      this.errorMessage = 'First name is required.';
      return;
    }
    if (!this.email.trim()) {
      this.errorMessage = 'Email address is required.';
      return;
    }
    if (!this.password) {
      this.errorMessage = 'Password is required.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;

    this.api.register({
      first_name: this.firstName.trim(),
      last_name:  this.lastName.trim(),
      email:      this.email.trim(),
      phone:      this.phone.trim(),
      password:   this.password
    }).subscribe({
      next: (res) => {
        this.api.saveSession(res.token, res.user);
        this.successMessage = 'Account created! Redirecting to dashboard...';
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

}