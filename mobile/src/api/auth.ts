import { api, ApiError, isConnectionFailure } from './client';
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

/**
 * Turns a failure into something worth showing a person.
 *
 * The connection case matters most: an account is only ever for backup, so
 * "we could not reach the server" should point at guest mode rather than
 * leaving someone stuck on a sign-in screen they never needed.
 */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'That email and password do not match. Try again?';
    if (error.status === 409) return 'There is already an account with that email.';
    if (error.status === 429) return 'Too many attempts just now. Give it a minute.';
    if (error.status >= 500) return 'The server is having trouble. Your journal is safe on this phone.';
    return error.message;
  }

  if (isConnectionFailure(error)) {
    return 'Could not reach the server. You do not need an account — “Just let me in” keeps everything on this phone.';
  }

  return 'Something went wrong. Please try again.';
}
