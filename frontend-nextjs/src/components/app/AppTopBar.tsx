"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./AppShell";
import { LanguageMenu } from "./LanguageMenu";
import { YouMenu } from "./YouMenu";

/**
 * The bar above pages that are not a place: the dashboard, your account, making
 * an office. On the dashboard and the account page it switches between the two.
 */
export function AppTopBar({ section }: { section?: "home" | "account" }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("shell");
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/dashboard" className="me-auto inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          <Logo size={26} />
          <span className={cn(section && "hidden sm:inline")}>TinyFloor</span>
        </Link>
        {section && (
          <nav className="flex h-9 items-center gap-0.5 rounded-full bg-muted p-1">
            {(
              [
                ["home", "/dashboard", t("home")],
                ["account", "/account", ts("account")],
              ] as const
            ).map(([key, href, label]) => (
              <Link
                key={key}
                href={href}
                aria-current={section === key ? "page" : undefined}
                className={cn(
                  "flex h-7 items-center rounded-full px-3.5 text-[13px] font-medium transition-colors",
                  section === key ? "bg-card text-foreground shadow-[0_0_0_1px_var(--ui-border)]" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className={cn("flex items-center gap-2", section && "ms-auto")}>
          <LanguageMenu />
          <YouMenu onFloor={false} bar />
        </div>
      </div>
    </header>
  );
}
