import { Component, OnInit, signal } from '@angular/core';
import { UserService, User } from '../user.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss'
})
export class UsersList implements OnInit {
  users = signal<User[]>([]);
  selectedUser: User | null = null;
  showForm = false;
  form: FormGroup;
  showPassword = false;

  constructor(private userService: UserService, private fb: FormBuilder) {
    this.form = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      role: ['customer', [Validators.required]],
      password: ['']
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers().subscribe(users => this.users.set(users));
  }

  selectUser(user: User) {
    this.selectedUser = { ...user };
    this.showForm = true;
    this.form.patchValue({ ...user, password: '' });
  }

  saveUser() {
    if (!this.form.valid) return;
    this.userService.saveUser(this.form.value).subscribe(user => {
      this.loadUsers();
      this.selectedUser = null;
      this.showForm = false;
      this.form.reset({ name: '', email: '', role: 'customer', password: '' });
    });
  }

  deleteUser(user: User) {
    if (user.id) {
      this.userService.deleteUser(user.id).subscribe(() => {
        this.loadUsers();
        if (this.selectedUser?.id === user.id) {
          this.selectedUser = null;
        }
      });
    }
  }

  newUserForm() {
    this.selectedUser = null;
    this.showForm = true;
    this.form.reset({ name: '', email: '', role: 'customer', password: '' });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
