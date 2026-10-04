import { HubPage, hubMetadata } from "@/components/landing/HubPage";

export const generateMetadata = hubMetadata("features");

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <HubPage group="features" params={params} />;
}
