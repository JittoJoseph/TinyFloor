import { API_URL } from "./api";

/**
 * A public API read for a server rendered page, fresh on every request and
 * given up on quickly, so a slow API leaves the lookup to the browser.
 */
export async function fetchPublic<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}
