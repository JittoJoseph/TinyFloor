import { HubPage, hubMetadata } from "@/components/landing/HubPage";

export const generateMetadata = hubMetadata("teams");

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <HubPage group="teams" params={params} />;
}
