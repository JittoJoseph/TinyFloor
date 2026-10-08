import { HubPage, hubMetadata } from "@/components/landing/HubPage";

export const generateMetadata = hubMetadata("useCases");

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <HubPage group="useCases" params={params} />;
}
