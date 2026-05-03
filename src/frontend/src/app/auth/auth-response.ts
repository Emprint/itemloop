export interface AuthResponse {
  user: User;
}

export enum UserStatus {
  Active = 'active',
  Pending = 'pending',
}

export enum UserRole {
  Customer = 'customer',
  Editor = 'editor',
  Admin = 'admin',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole | null;
  status: UserStatus | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}
