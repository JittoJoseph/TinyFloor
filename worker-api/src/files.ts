import { FILE_MAX, isPicture } from "../../shared-protocol/src";
import { requireOffice } from "./access";
import { HttpError, json } from "./http";
import type { Router } from "./router";
import { requireAccount, requireUser } from "./session";

/**
 * Files shared in chat (docs/product.md). The browser sends the bytes here,
 * already shrunk if they're a picture; they're kept in a private R2 bucket
 * under the office, and read back only through /v1/files, after checking the
 * reader is in that office. Chat keeps the key with the message, and deletes
 * the file when the message goes (worker-realtime's chat.ts).
 */

/** Uploads are the one write that isn't JSON. */
export const UPLOAD_PATH = /^\/v1\/offices\/[^/]+\/files$/;

/**
 * The bytes come as application/octet-stream, which a cross-site form can't
 * send without the browser asking first (and only the site's origins are
 * answered); the file's own type travels as `type`, so a .txt is as welcome as a .png.
 */
export function assertSafeUpload(request: Request, origin: string | null): void {
  if (!origin) throw new HttpError(403, "forbidden_origin", "Requests must come from the site");
  if (!request.headers.get("Content-Type")?.startsWith("application/octet-stream")) {
    throw new HttpError(415, "bad_type", "Send the file as application/octet-stream");
  }
}

/** A short, safe extension from a file's name, for the key: the name itself stays in the message. */
function extensionOf(name: string): string {
  const found = /\.([a-z0-9]{1,8})$/i.exec(name);
  return found ? `.${found[1].toLowerCase()}` : "";
}

const dimension = (value: string | null) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 20_000 ? Math.round(number) : undefined;
};

export function fileRoutes(router: Router): void {
  router
    .add("POST", "/v1/offices/:id/files", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      await requireOffice(env, params.id, user.id);
      if (env.UPLOAD_LIMIT && !(await env.UPLOAD_LIMIT.limit({ key: user.id })).success) {
        throw new HttpError(429, "slow_down", "Too many files at once. Try again in a minute.");
      }
      const declared = Number(request.headers.get("Content-Length"));
      if (Number.isFinite(declared) && declared > FILE_MAX) throw new HttpError(413, "too_big", "Files can be up to 10 MB");
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength) throw new HttpError(400, "empty_file", "That file is empty");
      if (bytes.byteLength > FILE_MAX) throw new HttpError(413, "too_big", "Files can be up to 10 MB");

      const url = new URL(request.url);
      const name = (url.searchParams.get("name") ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200) || "file";
      const declaredType = (url.searchParams.get("type") ?? "").trim().toLowerCase();
      const type = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(declaredType) ? declaredType.slice(0, 100) : "application/octet-stream";
      const key = `att/${params.id}/${crypto.randomUUID()}${extensionOf(name)}`;
      const width = dimension(url.searchParams.get("width"));
      const height = dimension(url.searchParams.get("height"));

      await env.FILES.put(key, bytes, {
        httpMetadata: { contentType: type },
        customMetadata: { name, by: user.id },
      });
      return json(
        {
          file: { key, name, size: bytes.byteLength, type, ...(width && height && isPicture({ type }) ? { width, height } : {}) },
        },
        { status: 201 },
      );
    })

    // Reading one back: only someone in the office it was shared in.
    .add("GET", "/v1/files/:office/:name", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireOffice(env, params.office, user.id);
      const object = await env.FILES.get(`att/${params.office}/${params.name}`);
      if (!object) throw new HttpError(404, "not_found", "That file is gone");

      const type = object.httpMetadata?.contentType ?? "application/octet-stream";
      const name = object.customMetadata?.name ?? params.name;
      const headers = new Headers({
        "Content-Length": String(object.size),
        ETag: object.httpEtag,
        // A key never changes what it holds.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        // Shown on the app's pages, which are another subdomain.
        "Cross-Origin-Resource-Policy": "same-site",
        // Nothing served from here runs, whatever it is.
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      });
      // ?download asks for the file to be saved, which a link's own `download` can't do across origins.
      if (isPicture({ type }) && !new URL(request.url).searchParams.has("download")) {
        headers.set("Content-Type", type);
        headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(name)}`);
      } else {
        // Anything else is downloaded, never opened in the API's own origin.
        headers.set("Content-Type", type.startsWith("text/") || type.includes("html") || type.includes("xml") ? "application/octet-stream" : type);
        headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
      }
      return new Response(object.body, { headers });
    });
}
