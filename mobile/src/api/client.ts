import { useAuthStore } from '@/store/useAuthStore';

/**
 * Client for our own NestJS backend.
 *
 * The backend is entirely optional: the app is local-first and works forever
 * without it. It exists so the journal can be backed up and moved to a new
 * phone, and so two devices can hold the same shelves.
 */

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** skip the Authorization header (sign-in, sign-up) */
  anonymous?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

let refreshing: Promise<boolean> | null = null;

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous, signal, timeoutMs = 15_000 } = options;
  const token = useAuthStore.getState().accessToken;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token && !anonymous ? { Authorization: `Bearer ${token}` } : null),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        (payload as { message?: string | string[] } | null)?.message ?? `Request failed (${response.status})`;
      throw new ApiError(Array.isArray(message) ? message[0] : message, response.status);
    }

    return payload as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Refreshes the access token once, sharing the attempt across callers. */
async function refreshTokens(): Promise<boolean> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) return false;
    try {
      const result = await rawRequest<{ accessToken: string; refreshToken?: string }>(
        '/auth/refresh',
        { method: 'POST', body: { refreshToken }, anonymous: true },
      );
      useAuthStore.getState().setTokens(result.accessToken, result.refreshToken);
      return true;
    } catch {
      useAuthStore.getState().signOut();
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/**
 * A failure that is the connection's fault rather than the server's — the
 * request never got an answer. Worth distinguishing, because it is the one
 * case where waiting longer actually helps.
 */
export function isConnectionFailure(error: unknown): boolean {
  if (error instanceof ApiError) return false;
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error.name === 'TypeError' || // browsers throw this for a failed fetch
    /network request failed|failed to fetch|network error/i.test(error.message)
  );
}

/** Long enough for a suspended free-tier instance to boot and answer. */
const COLD_START_MS = 60_000;

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    // One transparent retry after refreshing an expired token.
    if (error instanceof ApiError && error.status === 401 && !options.anonymous) {
      if (await refreshTokens()) return rawRequest<T>(path, options);
    }

    // Free hosting suspends an idle instance and takes the better part of a
    // minute to wake it. The default timeout is tuned for a warm server, so a
    // first sign-in after a quiet spell would fail for no good reason. Give it
    // one patient second attempt before reporting failure.
    if (isConnectionFailure(error) && (options.timeoutMs ?? 0) < COLD_START_MS) {
      return rawRequest<T>(path, { ...options, timeoutMs: COLD_START_MS });
    }

    throw error;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};

/**
 * Is the backend reachable at all? Used to decide whether to drain the queue.
 *
 * Two stages on purpose. Free hosting tiers (Render, Fly, Railway) suspend an
 * idle instance and take the better part of a minute to boot it again, so a
 * single short probe would report "offline" forever and sync would never once
 * run. The quick probe keeps the common, warm case snappy; the patient one
 * gives a sleeping server time to get up.
 */
export async function pingBackend(): Promise<boolean> {
  try {
    await rawRequest<{ status: string }>('/health', { anonymous: true, timeoutMs: 5000 });
    return true;
  } catch {
    // Nothing is waiting on this — the app is local-first and the reader has
    // already moved on — so it can afford to wait for a cold start.
    try {
      await rawRequest<{ status: string }>('/health', { anonymous: true, timeoutMs: 60_000 });
      return true;
    } catch {
      return false;
    }
  }
}
