import { GuidesHub, guidesMetadata } from "@/components/guides/GuidesHub";

export const generateMetadata = guidesMetadata;

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <GuidesHub params={params} />;
}
