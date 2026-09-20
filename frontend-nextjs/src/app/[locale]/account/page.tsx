"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/app/AppHeader";
import { AccountPanel } from "@/components/account/AccountPanel";

/** Your account, on its own page: the name people see, your email, your password. */
export default function AccountPage() {
  const t = useTranslations("office.profile");
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;

  useEffect(() => {
    if (!isLoading && !signedIn) {
      router.replace(`/auth?${new URLSearchParams({ redirect: "/account" })}`);
    }
  }, [isLoading, signedIn, router]);

  return (
    <div className="min-h-screen w-full bg-[var(--color-braun-bg)]">
      <AppHeader />
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <h1 className="font-body text-2xl font-medium tracking-tight text-[var(--color-braun-text)] mb-5">
          {t("pageTitle")}
        </h1>
        {signedIn ? <AccountPanel /> : <div className="h-52 rounded-[1.5rem] bg-black/[0.04] animate-pulse" />}
      </main>
    </div>
  );
}
