import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  form: FormGroup;
  loading = signal(false);
  error = signal('');
  token = '';
  email = '';

  constructor() {
    this.form = this.fb.group(
      {
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordsMatch },
    );
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    if (!this.token || !this.email) {
      this.error.set(this.translate.instant('RESET_LINK_INVALID'));
    }
  }

  submit() {
    this.form.markAllAsTouched();
    this.cdr.markForCheck();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword(this.email, this.token, this.form.value.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/auth/login'], { queryParams: { reset: '1' } });
      },
      error: (err) => {
        this.loading.set(false);
        const code = err?.error?.error;
        if (code === 'RESET_LINK_EXPIRED') {
          this.error.set(this.translate.instant('RESET_LINK_EXPIRED'));
        } else if (code === 'RESET_LINK_INVALID' || err?.status === 400) {
          this.error.set(this.translate.instant('RESET_LINK_INVALID'));
        } else {
          this.error.set(this.translate.instant('ERRORS.GENERIC'));
        }
      },
    });
  }

  private passwordsMatch(group: FormGroup) {
    const p = group.get('password')?.value;
    const c = group.get('confirmPassword')?.value;
    return p === c ? null : { mismatch: true };
  }
}
