const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

/**
 * A public backend read for a server rendered page, fresh on every request
 * and given up on quickly, so a slow backend leaves the list to the browser.
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
