const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

/**
 * A public backend read for a server rendered page, cached for a minute and
 * given up on quickly, so a slow backend leaves the list to the browser.
 */
export async function fetchPublic<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}
