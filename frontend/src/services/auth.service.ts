import { api } from '@/lib/api';
import type { ApiSuccess, AuthResult, User } from '@/types';

/** Register a new account. Returns the user and a fresh JWT. */
export const register = async (payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> => {
  const { data } = await api.post<ApiSuccess<AuthResult>>(
    '/auth/register',
    payload,
  );
  return data.data;
};

/** Authenticate with email + password. */
export const login = async (payload: {
  email: string;
  password: string;
}): Promise<AuthResult> => {
  const { data } = await api.post<ApiSuccess<AuthResult>>(
    '/auth/login',
    payload,
  );
  return data.data;
};

/** Fetch the currently authenticated user's profile. */
export const fetchMe = async (): Promise<User> => {
  const { data } = await api.get<ApiSuccess<User>>('/auth/me');
  return data.data;
};
