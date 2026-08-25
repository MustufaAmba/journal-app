import { api, ApiError } from './client';
import { useAuthStore } from '@/store/useAuthStore';
import type { UserProfile } from '@/types';

type AuthResponse = { user: UserProfile; accessToken: string; refreshToken?: string };

export async function signInWithEmail(email: string, password: string, remember: boolean) {
  const result = await api.post<AuthResponse>('/auth/login', { email, password }, { anonymous: true });
  useAuthStore.getState().signIn({ ...result, remember });
  return result.user;
}

export async function signUpWithEmail(name: string, email: string, password: string, remember: boolean) {
  const result = await api.post<AuthResponse>('/auth/register', { name, email, password }, { anonymous: true });
  useAuthStore.getState().signIn({ ...result, remember });
  return result.user;
}

export async function requestPasswordReset(email: string) {
  // The endpoint always reports success — it must not reveal who has an account.
  await api.post<{ ok: true }>('/auth/forgot-password', { email }, { anonymous: true });
}

export async function fetchProfile() {
  const user = await api.get<UserProfile>('/auth/me');
  useAuthStore.getState().updateProfile(user);
  return user;
}

/** Turns an ApiError into something worth showing a person. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'That email and password do not match. Try again?';
    if (error.status === 409) return 'There is already an account with that email.';
    if (error.status === 0) return 'Could not reach the server.';
    return error.message;
  }
  if (error instanceof Error && error.message.includes('Network')) {
    return 'No connection. You can still use the app offline — try Guest mode.';
  }
  return 'Something went wrong. Please try again.';
}
