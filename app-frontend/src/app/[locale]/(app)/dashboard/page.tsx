import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { homePath } from "@/lib/links";

// There is no dashboard: the app opens on your office's floor, and an old
// link or bookmark here goes to the front door that decides where that is.
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: homePath, locale: locale as Locale });
}
