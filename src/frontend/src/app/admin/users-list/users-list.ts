import { Component, OnInit, signal, inject } from '@angular/core';
import { UserService, User } from '../user.service';
import { UserRole } from '../../auth/auth-response';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { emailTldValidator } from '../../shared/email-tld.validator';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModal, TranslateModule],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersList implements OnInit {
  private translate = inject(TranslateService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  showReLoginNotice = false;
  users = signal<User[]>([]);
  selectedUser: User | null = null;
  showForm = false;
  form: FormGroup;
  showPassword = false;
  showDeleteModal = false;
  userToDelete: User | null = null;
  errorMessage = signal<string | null>(null);

  constructor() {
    this.form = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, emailTldValidator, Validators.maxLength(255)]],
      role: [UserRole.Customer, [Validators.required]],
      password: [''],
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.errorMessage.set(null);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('ERRORS.FAILED_LOAD_USERS'));
      },
    });
  }

  selectUser(user: User) {
    this.selectedUser = { ...user };
    this.showForm = true;
    this.form.patchValue({ ...user, password: '' });
  }

  saveUser() {
    if (!this.form.valid) {
      const emailControl = this.form.get('email');
      if (emailControl?.errors?.['email']) {
        this.errorMessage.set(this.translate.instant('ERRORS.EMAIL_INVALID'));
      } else {
        this.errorMessage.set(this.translate.instant('ERRORS.REQUIRED_FIELDS'));
      }
      return;
    }
    this.userService.saveUser(this.form.value).subscribe({
      next: (user) => {
        if (user.id === this.authService.user()?.id && this.form.get('password')?.value) {
          this.showReLoginNotice = true;
          this.authService.softLogout();
        } else {
          this.loadUsers();
        }
        this.selectedUser = null;
        this.showForm = false;
        this.resetForm();
        this.errorMessage.set(null);
      },
      error: (err) => {
        const code = err?.error?.error;
        if (code) {
          this.errorMessage.set(this.translate.instant('ERRORS.' + code));
        } else {
          this.errorMessage.set(this.translate.instant('ERRORS.FAILED_SAVE_USER'));
        }
      },
    });
  }

  confirmDeleteUser(user: User) {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  deleteUserConfirmed() {
    if (this.userToDelete && this.userToDelete.id) {
      this.userService.deleteUser(this.userToDelete.id).subscribe({
        next: () => {
          this.loadUsers();
          this.selectedUser = null;
          this.userToDelete = null;
          this.showDeleteModal = false;
          this.errorMessage.set(null);
        },
        error: (err) => {
          this.showDeleteModal = false;
          const code = err?.error?.error;
          if (code) {
            this.errorMessage.set(this.translate.instant('ERRORS.' + code));
          } else if (err.status === 403) {
            this.errorMessage.set(this.translate.instant('ERRORS.CANNOT_DELETE_USER'));
          } else {
            this.errorMessage.set(this.translate.instant('ERRORS.FAILED_DELETE_USER'));
          }
        },
      });
    }
  }

  cancelDeleteUser() {
    this.userToDelete = null;
    this.showDeleteModal = false;
  }

  newUserForm() {
    this.selectedUser = null;
    this.showForm = true;
    this.resetForm();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  cancel() {
    this.selectedUser = null;
    this.showForm = false;
    this.resetForm();
  }

  isLastAdmin(user: User): boolean {
    if (user.role !== UserRole.Admin) return false;
    const admins = this.users().filter((u: User) => u.role === UserRole.Admin);
    return admins.length === 1 && admins[0].id === user.id;
  }

  private resetForm() {
    this.form.reset({ name: '', email: '', role: UserRole.Customer, password: '' });
  }
}
