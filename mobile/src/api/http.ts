/**
 * A very small fetch wrapper. Book APIs are public, free and occasionally
 * grumpy — Open Library 503s under load and Google Books rate-limits
 * anonymous callers — so every request gets a timeout, a couple of retries
 * with backoff, and in-flight de-duplication.
 */

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const inflight = new Map<string, Promise<unknown>>();

type Options = {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export async function getJSON<T>(url: string, options: Options = {}): Promise<T> {
  const { timeoutMs = 12_000, retries = 2 } = options;

  const existing = inflight.get(url) as Promise<T> | undefined;
  if (existing) return existing;

  const run = (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const onAbort = () => controller.abort();
      options.signal?.addEventListener('abort', onAbort);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json', ...options.headers },
        });
        if (!response.ok) {
          // 4xx other than 429 will not get better by asking again.
          if (response.status < 500 && response.status !== 429) {
            throw new HttpError(`Request failed (${response.status})`, response.status, url);
          }
          throw new HttpError(`Server error (${response.status})`, response.status, url);
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        if (error instanceof HttpError && error.status < 500 && error.status !== 429) throw error;
        if (attempt === retries) break;
        await delay(400 * 2 ** attempt + Math.random() * 250);
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Request failed: ${url}`);
  })();

  inflight.set(url, run);
  try {
    return await run;
  } finally {
    inflight.delete(url);
  }
}

/** Like getJSON but resolves to null instead of throwing — for optional enrichment. */
export async function tryJSON<T>(url: string, options: Options = {}): Promise<T | null> {
  try {
    return await getJSON<T>(url, { retries: 1, ...options });
  } catch {
    return null;
  }
}

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
