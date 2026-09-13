/**
 * The visitor's country, resolved at the edge by `middleware.ts` from Cloudflare's
 * `cf-ipcountry` header and published as a plain `country` cookie. It is
 * only a 2-letter ISO code, no IP is exposed or stored.
 *
 * Null on the server, in local dev and whenever the header is
 * missing; callers treat it as an optional hint.
 */
export function getCountryCode(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )country=([^;]*)/);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}
