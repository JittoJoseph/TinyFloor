/**
 * The visitor's country, resolved at the edge by `proxy.ts` from Vercel's
 * `x-vercel-ip-country` header and published as a plain `country` cookie. It is
 * only a 2-letter ISO code, no IP is exposed or stored.
 *
 * Null on the server, off Vercel (local dev) and whenever the header is
 * missing; callers treat it as an optional hint.
 */
export function getCountryCode(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )country=([^;]*)/);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}
