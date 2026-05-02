import { Component, inject, computed } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppSettingsService, AppSettings } from '../../admin/app-settings.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private appSettingsService = inject(AppSettingsService);

  form: FormGroup;
  error = signal('');
  readonly settings = toSignal(this.appSettingsService.getAll(), { initialValue: {} as AppSettings });
  readonly openRegistrationEnabled = computed(() => this.settings()['open_registration'] === '1');

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  submit() {
    this.error.set('');
    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/products']);
      },
      error: (err) => {
        // Use error code if present, otherwise fallback
        const code = err?.error?.error;
        let msg;
        if (code) {
          msg = this.translate.instant('ERRORS.' + code);
        } else {
          msg = this.translate.instant('ERRORS.INVALID_CREDENTIALS');
        }
        this.error.set(msg);
      },
    });
  }
}
