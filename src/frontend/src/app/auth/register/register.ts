import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  form: FormGroup;
  error = signal('');

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    });
  }

  submit() {
    this.error.set('');
    if (!this.form.valid) {
      this.error.set('Please fill all fields correctly.');
      return;
    }
    const { name, email, password, confirmPassword } = this.form.value;
    if (password !== confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }
    this.auth.register(name, email, password).subscribe({
      next: () => {
        this.router.navigate(['/products']);
      },
      error: (err) => {
        const msg = err?.error?.errors
          ? Object.values(err.error.errors).join(' ')
          : err?.error?.message || 'Registration failed';
        this.error.set(msg);
      },
    });
  }
}
