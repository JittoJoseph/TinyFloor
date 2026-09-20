import { permanentRedirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

// Rooms are created inside a workspace, from the dashboard.
export default async function CreateRoomPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect({ href: "/dashboard", locale: locale as Locale });
}
