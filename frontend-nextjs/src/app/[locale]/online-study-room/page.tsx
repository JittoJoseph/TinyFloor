import { permanentRedirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

// The study room page is gone: TinyFloor is sold to teams, so its old links land on the virtual office page.
export default async function OnlineStudyRoomPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect({ href: "/virtual-office", locale: locale as Locale });
}
