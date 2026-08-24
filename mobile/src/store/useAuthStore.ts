import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import type { UserProfile } from '@/types';

type AuthState = {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** "Remember me" — when false the session is dropped on next cold start */
  remember: boolean;
  /** set at launch when remember was off, so we know to sign out */
  hydratedAt: number | null;

  signIn: (payload: { user: UserProfile; accessToken: string; refreshToken?: string; remember: boolean }) => void;
  continueAsGuest: () => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      remember: true,
      hydratedAt: null,

      signIn: ({ user, accessToken, refreshToken, remember }) =>
        set({ user, accessToken, refreshToken: refreshToken ?? null, remember, hydratedAt: Date.now() }),

      continueAsGuest: () =>
        set({
          user: { id: 'guest', guest: true },
          accessToken: null,
          refreshToken: null,
          remember: true,
          hydratedAt: Date.now(),
        }),

      setTokens: (accessToken, refreshToken) =>
        set((s) => ({ accessToken, refreshToken: refreshToken ?? s.refreshToken })),

      updateProfile: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),

      signOut: () => set({ user: null, accessToken: null, refreshToken: null, hydratedAt: null }),
    }),
    {
      name: 'auth.v1',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        // Honour "Remember me": a non-remembered session does not survive a
        // cold start. Guest mode always persists — it holds real data.
        if (state && !state.remember && !state.user?.guest) {
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
        }
      },
    },
  ),
);

export const isSignedIn = (s: AuthState) => Boolean(s.user);
export const isGuest = (s: AuthState) => Boolean(s.user?.guest);
