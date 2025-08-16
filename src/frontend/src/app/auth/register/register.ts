import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { emailTldValidator } from '../../shared/email-tld.validator';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule],
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
      email: ['', [Validators.required, emailTldValidator, Validators.maxLength(255)]],
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
      const emailControl = this.form.get('email');
      if (emailControl?.errors?.['email']) {
        this.error.set('ERRORS.EMAIL_INVALID');
      } else {
        this.error.set('ERRORS.REQUIRED_FIELDS');
      }
      return;
    }
    const { name, email, password, confirmPassword } = this.form.value;
    if (password !== confirmPassword) {
      this.error.set('ERRORS.PASSWORD_MISMATCH');
      return;
    }
    this.auth.register(name, email, password).subscribe({
      next: () => {
        this.router.navigate(['/products']);
      },
      error: (err) => {
        let msg = err?.error?.errors
          ? Object.values(err.error.errors).join(' ')
          : err?.error?.message || 'ERRORS.REGISTRATION_FAILED';
        if (msg === 'The email has already been taken.') {
          msg = 'ERRORS.EMAIL_TAKEN';
        }
        this.error.set(msg);
      },
    });
  }
}
