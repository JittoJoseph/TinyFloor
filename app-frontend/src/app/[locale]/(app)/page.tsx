import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { homePath } from "@/lib/links";

// The app's front door is /home; its bare address goes there.
export default async function AppRootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: homePath, locale: locale as Locale });
}
