import { llmsFullTxt, textResponse } from "@/lib/llms";

export const dynamic = "force-static";

/** Every marketing page's words in one file, for AI assistants and answer engines (src/lib/llms.ts). */
export async function GET() {
  return textResponse(await llmsFullTxt());
}
