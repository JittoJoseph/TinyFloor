import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

// There is no dashboard any more: the app opens on your office's floor, and an
// old link or bookmark here goes to the front door that decides where that is.
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/", locale: locale as Locale });
}
