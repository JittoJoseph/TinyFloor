import { permanentRedirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

// The public people directory is gone; rooms are private to their workspace.
export default async function PeoplePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect({ href: "/", locale: locale as Locale });
}
