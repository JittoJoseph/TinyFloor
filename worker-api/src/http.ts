export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** The form field the error is about, so the site can show it in place. */
    readonly field?: string,
  ) {
    super(message);
  }
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, init);
}

export function errorResponse(error: HttpError): Response {
  const body = { code: error.code, message: error.message, ...(error.field ? { field: error.field } : {}) };
  return json({ error: body }, { status: error.status });
}

export function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  return origin && env.SITE_ORIGINS.split(",").includes(origin) ? origin : null;
}

/** CORS for the site's own origins only, with cookies. */
export function withCors(response: Response, origin: string | null): Response {
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.append("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function preflight(origin: string | null): Response {
  if (!origin) return new Response(null, { status: 403 });
  return withCors(
    new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    }),
    origin,
  );
}

/**
 * State-changing requests must come from the site and be JSON. With SameSite=Lax
 * cookies, that keeps cross-site forms from triggering them.
 */
export function assertSafeWrite(request: Request, origin: string | null): void {
  if (!origin) throw new HttpError(403, "forbidden_origin", "Requests must come from the site");
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    throw new HttpError(415, "json_required", "Send JSON");
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "bad_request", "Expected a JSON object");
  }
  return body as Record<string, unknown>;
}
