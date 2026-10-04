import { llmsTxt, textResponse } from "@/lib/llms";

export const dynamic = "force-static";

/** A map of the site for AI assistants and answer engines, in English (src/lib/llms.ts). */
export async function GET() {
  return textResponse(await llmsTxt());
}
