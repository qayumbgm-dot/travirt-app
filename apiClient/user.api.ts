import { apiClient } from './client';

export interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  ifsc: string | null;
  pan: string | null;
}

export interface Me {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
}

export const userApi = {
  getMe: () =>
    apiClient.get<Me>('/auth/me').then((r) => r.data),

  getProfile: () =>
    apiClient.get<UserProfile>('/auth/me/profile').then((r) => r.data),

  updateProfile: (data: Partial<UserProfile>) =>
    apiClient.patch<UserProfile>('/auth/me/profile', data).then((r) => r.data),
};
