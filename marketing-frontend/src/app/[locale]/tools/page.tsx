import { ToolsHub, toolsMetadata } from "@/components/tools/ToolsHub";

export const generateMetadata = toolsMetadata;

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <ToolsHub params={params} />;
}
