/**
 * Shared fetch wrapper with retry, rate limiting, and timeout.
 * Used by all API client modules.
 */

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
}

let lastCallTime = 0;
let rateLimitMs = 1000;

/** Set the minimum interval between API calls (in ms). */
export function setRateLimit(ms: number) {
  rateLimitMs = ms;
}

/** Fetch JSON from a URL with retry, rate limiting, and timeout. */
export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResult<T>> {
  const { timeoutMs = 15_000, retries = 3 } = options;

  // Rate limiting — wait if needed
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < rateLimitMs) {
    await sleep(rateLimitMs - elapsed);
  }
  lastCallTime = Date.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        return { success: false, error: `Auth error (${response.status}): check your API key` };
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const backoff = 1000 * 2 ** (attempt - 1);
          console.log(`  API returned ${response.status}, retrying in ${backoff}ms (attempt ${attempt}/${retries})...`);
          await sleep(backoff);
          continue;
        }
        return { success: false, error: `API error ${response.status} after ${retries} attempts` };
      }

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = (await response.json()) as T;
      return { success: true, data };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { success: false, error: `Request timed out after ${timeoutMs}ms` };
      }
      if (attempt < retries) {
        const backoff = 1000 * 2 ** (attempt - 1);
        console.log(`  Network error, retrying in ${backoff}ms (attempt ${attempt}/${retries})...`);
        await sleep(backoff);
        continue;
      }
      return { success: false, error: `Network error: ${(err as Error).message}` };
    }
  }

  return { success: false, error: "Unexpected: exhausted retries" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
