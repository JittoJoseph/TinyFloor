"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, LogOut, Shirt, SunMoon, UserRound } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AppTopBar } from "@/components/app/AppTopBar";
import { YouRail } from "@/components/account/YouRail";
import {
  ACCOUNT_SECTIONS,
  AppearanceSection,
  CharacterSection,
  ProfileSection,
  SignInSection,
  type AccountSection,
} from "@/components/account/AccountPanel";

const ICONS: Record<AccountSection, React.ReactNode> = {
  profile: <UserRound className="size-4" />,
  character: <Shirt className="size-4" />,
  signin: <KeyRound className="size-4" />,
  appearance: <SunMoon className="size-4" />,
};

/**
 * Your account, beside the same rail as home: who you are to everyone else,
 * how you sign in, and how the app looks to you. The rail lists the sections
 * and follows along as you scroll.
 */
export default function AccountPage() {
  const t = useTranslations("office.profile");
  const ts = useTranslations("shell");
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;
  const [current, setCurrent] = useState<AccountSection>("profile");

  useEffect(() => {
    if (!isLoading && !signedIn) {
      router.replace(`/auth?${new URLSearchParams({ redirect: "/account" })}`);
    }
  }, [isLoading, signedIn, router]);

  // The section nearest the top of the screen is the one the rail marks.
  useEffect(() => {
    if (!signedIn) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (seen) setCurrent(seen.target.id as AccountSection);
      },
      { rootMargin: "-80px 0px -55% 0px" },
    );
    for (const id of ACCOUNT_SECTIONS) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [signedIn]);

  const leave = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <div className="min-h-dvh w-full bg-background">
      <AppTopBar section="account" />
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-4 pb-20 pt-5 sm:px-6 sm:pt-10 lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-6">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <YouRail>
            <nav className="hidden border-t border-border p-2 lg:block">
              {ACCOUNT_SECTIONS.map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={current === id ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors",
                    current === id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {ICONS[id]}
                  {t(`sections.${id}`)}
                </a>
              ))}
              <button
                type="button"
                onClick={leave}
                className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
                {ts("signOut")}
              </button>
            </nav>
          </YouRail>
          <nav className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
            {ACCOUNT_SECTIONS.map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                  current === id ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground",
                )}
              >
                {ICONS[id]}
                {t(`sections.${id}`)}
              </a>
            ))}
          </nav>
        </aside>

        {signedIn ? (
          <div className="min-w-0 space-y-4">
            <ProfileSection />
            <CharacterSection />
            <SignInSection />
            <AppearanceSection />
            <button
              type="button"
              onClick={leave}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[14px] font-medium text-destructive transition-colors hover:bg-destructive/10 lg:hidden"
            >
              <LogOut className="size-4" />
              {ts("signOut")}
            </button>
          </div>
        ) : (
          <div className="h-80 animate-pulse rounded-[1.25rem] bg-muted" />
        )}
      </main>
    </div>
  );
}
