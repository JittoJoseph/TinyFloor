import { NextResponse, type NextRequest } from "next/server";

/**
 * The maintenance switch, for the cutover. Set `MAINTENANCE=on` as a variable on
 * the Worker (Settings, Variables) and every page answers with a short "back in
 * a few minutes" page. `MAINTENANCE_BYPASS` holds a secret: opening any page
 * with `?bypass=<secret>` once sets a cookie that lets that browser through.
 */
const BYPASS_COOKIE = "tf_maintenance_bypass";

export function maintenanceResponse(request: NextRequest): NextResponse | null {
  if (process.env.MAINTENANCE !== "on") return null;

  const secret = process.env.MAINTENANCE_BYPASS;
  if (secret) {
    if (request.cookies.get(BYPASS_COOKIE)?.value === secret) return null;
    if (request.nextUrl.searchParams.get("bypass") === secret) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("bypass");
      const response = NextResponse.redirect(url);
      response.cookies.set(BYPASS_COOKIE, secret, { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 6 });
      return response;
    }
  }

  return new NextResponse(PAGE, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": "600",
    },
  });
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Back in a few minutes | TinyFloor</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
    background: #e8e8e3; color: #2c2c2c;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  main {
    width: 100%; max-width: 420px; background: #fff; border-radius: 24px; padding: 36px 32px;
    box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 40px rgba(0,0,0,.08);
  }
  .brand { font-weight: 700; letter-spacing: -.01em; font-size: 15px; margin: 0 0 28px; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ff4e00; margin-right: 8px; vertical-align: 1px;
    animation: pulse 1.6s ease-in-out infinite; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #8a8a84; margin: 0 0 8px; }
  h1 { font-size: 26px; line-height: 1.2; letter-spacing: -.02em; margin: 0 0 12px; font-weight: 600; }
  p { font-size: 15px; line-height: 1.55; margin: 0; color: #5a5a55; }
  @keyframes pulse { 50% { opacity: .35; } }
  @media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
</style>
</head>
<body>
<main>
  <p class="brand">TinyFloor</p>
  <p class="eyebrow"><span class="dot"></span>Moving in</p>
  <h1>Back in a few minutes</h1>
  <p>We're moving TinyFloor to a faster home. Your account comes along. This page will work again shortly, so try a refresh in a few minutes.</p>
</main>
</body>
</html>`;
