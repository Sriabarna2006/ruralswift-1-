import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  email        = '';
  password     = '';
  rememberMe   = false;
  showPassword = false;
  isLoading    = false;
  errorMessage = '';
  returnUrl = '/home';

  constructor(private router: Router, private route: ActivatedRoute, private api: ApiService) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';

    if (this.api.getToken()) {
      this.router.navigateByUrl(this.returnUrl);
    }

  }

  login() {

    this.errorMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Please enter your password.';
      return;
    }

    this.isLoading = true;

    this.api.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.api.saveSession(res.token, res.user, this.rememberMe);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err.error?.message ||
          'Login failed. Please check your credentials.';
      }
    });

  }

}
