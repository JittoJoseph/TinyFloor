import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

// Old invite links (/join?roomId=...) pointed at public rooms, which are gone.
// The lobby is the closest thing to what they opened.
export default async function OldJoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/lobby", locale: locale as Locale });
}
