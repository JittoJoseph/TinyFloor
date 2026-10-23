import { COMPAT } from "@/lib/compat";

// Built with the app: what its pages must agree on (lib/compat.ts), for open pages to compare with their own (lib/updates.ts).
export const dynamic = "force-static";

export function GET() {
  return Response.json({ compat: COMPAT }, { headers: { "Cache-Control": "no-cache" } });
}
