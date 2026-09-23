"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setTheme, useTheme, type ThemeChoice } from "@/lib/theme";
import { AppTopBar } from "@/components/app/AppTopBar";
import { AccountPanel, CharacterPanel } from "@/components/account/AccountPanel";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

/** Your account, on its own page: who you are to everyone else, and how the app looks to you. */
export default function AccountPage() {
  const t = useTranslations("office.profile");
  const ts = useTranslations("shell");
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const theme = useTheme();
  const signedIn = !isLoading && !!user && !user.guest;

  useEffect(() => {
    if (!isLoading && !signedIn) {
      router.replace(`/auth?${new URLSearchParams({ redirect: "/account" })}`);
    }
  }, [isLoading, signedIn, router]);

  const themes: Array<{ value: ThemeChoice; icon: React.ReactNode }> = [
    { value: "system", icon: <Monitor className="size-4" /> },
    { value: "light", icon: <Sun className="size-4" /> },
    { value: "dark", icon: <Moon className="size-4" /> },
  ];

  return (
    <div className="min-h-dvh w-full bg-background">
      <AppTopBar />
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {signedIn && user ? (
          <>
            <header className="mb-8 flex items-center gap-4">
              <Face seed={user.id} size={64} />
              <div className="min-w-0">
                <h1 className="truncate text-[24px] font-semibold tracking-tight text-foreground">{user.displayName}</h1>
                <p className="truncate text-[14px] text-muted-foreground">{user.email}</p>
              </div>
            </header>
            <p className="-mt-4 mb-8 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{t("faceNote")}</p>

            <div className="space-y-4">
              <AccountPanel />
              <CharacterPanel />

              <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
                <h2 className="text-[15px] font-semibold text-foreground">{ts("theme")}</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{t("themeNote")}</p>
                <div className="mt-4 grid max-w-sm grid-cols-3 gap-2">
                  {themes.map((one) => (
                    <button
                      key={one.value}
                      type="button"
                      aria-pressed={theme === one.value}
                      onClick={() => setTheme(one.value)}
                      className={cn(
                        "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[13px] transition-colors",
                        theme === one.value
                          ? "border-foreground/25 bg-muted font-medium text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {one.icon}
                      {ts(`themes.${one.value}`)}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="h-52 animate-pulse rounded-[1.25rem] bg-muted" />
        )}
      </main>
    </div>
  );
}
