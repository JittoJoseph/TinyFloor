import { permanentRedirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

// Rooms are private to their workspace now, so there is no public list. The lobby is open to everyone.
export default async function RoomsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect({ href: "/lobby", locale: locale as Locale });
}
