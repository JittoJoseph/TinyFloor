import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { homePath } from "@/lib/links";

// Your profile and how you sign in are in an office's settings now; an old
// link here goes to the front door, which opens your office.
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: homePath, locale: locale as Locale });
}
