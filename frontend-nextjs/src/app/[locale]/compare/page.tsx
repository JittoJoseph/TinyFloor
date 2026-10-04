import { HubPage, hubMetadata } from "@/components/landing/HubPage";

export const generateMetadata = hubMetadata("compare");

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <HubPage group="compare" params={params} />;
}
