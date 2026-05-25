import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../auth/auth.service';
import { UserProfile } from '../auth/auth-response';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);

  profileForm: FormGroup;
  passwordForm: FormGroup;

  loading = signal(false);
  profileSaved = signal(false);
  profileError = signal('');

  passwordLoading = signal(false);
  passwordSaved = signal(false);
  passwordError = signal('');

  isAdmin = signal(false);
  notifyAdminEmails = signal(false);

  constructor() {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      locale: ['en'],
    });

    this.passwordForm = this.fb.group(
      {
        current_password: ['', Validators.required],
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', Validators.required],
      },
      { validators: this.passwordsMatch },
    );
  }

  ngOnInit() {
    this.auth.getProfile().subscribe({
      next: (profile: UserProfile) => {
        this.profileForm.patchValue({ name: profile.name, locale: profile.locale ?? 'en' });
        this.isAdmin.set(profile.role === 'admin');
        this.notifyAdminEmails.set(!!(profile as any).notify_admin_emails);
      },
      error: () => {
        const user = this.auth.user();
        if (user) {
          this.profileForm.patchValue({ name: user.name, locale: user.locale ?? 'en' });
          this.isAdmin.set(user.role === 'admin');
        }
      },
    });
  }

  saveProfile() {
    if (this.profileForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.profileSaved.set(false);
    this.profileError.set('');
    const payload: any = { ...this.profileForm.value };
    if (this.isAdmin()) {
      payload.notify_admin_emails = this.notifyAdminEmails();
    }
    this.auth.updateProfile(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.profileSaved.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.profileError.set(err?.error?.errors?.name?.[0] ?? this.translate.instant('ERRORS.SERVER_ERROR'));
      },
    });
  }

  changePassword() {
    if (this.passwordForm.invalid || this.passwordLoading()) return;
    this.passwordLoading.set(true);
    this.passwordSaved.set(false);
    this.passwordError.set('');
    this.auth
      .changePassword(this.passwordForm.value.current_password, this.passwordForm.value.new_password)
      .subscribe({
        next: () => {
          this.passwordLoading.set(false);
          this.passwordSaved.set(true);
          this.passwordForm.reset();
        },
        error: (err) => {
          this.passwordLoading.set(false);
          this.passwordError.set(
            err?.error?.errors?.current_password?.[0] ??
              err?.error?.errors?.new_password?.[0] ??
              this.translate.instant('ERRORS.SERVER_ERROR'),
          );
        },
      });
  }

  private passwordsMatch(group: FormGroup) {
    const p = group.get('new_password')?.value;
    const c = group.get('confirm_password')?.value;
    return p === c ? null : { mismatch: true };
  }
}
