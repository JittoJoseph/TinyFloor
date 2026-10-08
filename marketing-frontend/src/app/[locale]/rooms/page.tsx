import { permanentRedirect } from "next/navigation";
import { appHref } from "@/lib/site";

// Rooms are private to their workspace now, so there is no public list. The lobby is open to everyone.
export default async function RoomsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect(appHref(locale, "/lobby"));
}
