export interface AuthResponse {
  user: User;
}

export enum UserStatus {
  Active = 'active',
  Pending = 'pending',
}

export enum UserRole {
  Customer = 'customer',
  Member = 'member',
  Editor = 'editor',
  Admin = 'admin',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole | null;
  status: UserStatus | null;
  locale: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole | null;
  status: UserStatus | null;
  locale: string;
  created_at: string;
  updated_at: string;
}
