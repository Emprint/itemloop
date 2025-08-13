import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { AuthResponse } from '../auth-response';
import { signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  form: FormGroup;
  error = signal('');

  constructor(private auth: AuthService, private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  submit() {
    const { email, password } = this.form.value;
    this.auth.loginApi(email, password).subscribe({
      next: (res: AuthResponse) => {
        this.auth.login(res.user.role, res.user.name, res.access_token, res.user);
        this.router.navigate(['/products']);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Invalid credentials';
        this.error.set(msg);
      }
    });
  }
}
