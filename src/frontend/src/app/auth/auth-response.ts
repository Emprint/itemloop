export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'editor' | 'customer';
    created_at: string;
    updated_at: string;
  };
}
