"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { DoorOpen } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "@/lib/i18n/navigation";
import { lobbyPath } from "@/lib/links";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Logo } from "./AppShell";
import { LanguageMenu } from "./LanguageMenu";
import { YouMenu } from "./YouMenu";

/**
 * Home and your account: a page with a bar across the top, deliberately not
 * the rail and panel of a place, so it never reads as being inside an office.
 * The public lobby waits quietly in the bar (and in your menu on a phone).
 */
export function HomeFrame({ active, children }: { active: "home" | "account"; children: ReactNode }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("shell");
  const reduce = useReducedMotion();
  const lobby = { href: lobbyPath, label: ts("publicLobby") };
  const tabs = [
    { key: "home", href: "/dashboard", label: t("home") },
    { key: "account", href: "/account", label: ts("account") },
  ] as const;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
          <Link href="/dashboard" aria-label="TinyFloor" className="inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
            <Logo size={26} />
            <span className="hidden sm:inline">TinyFloor</span>
          </Link>
          <nav className="flex h-full items-stretch">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={active === tab.key ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-2.5 text-[13.5px] font-medium transition-colors",
                  active === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {active === tab.key && (
                  <motion.span
                    layoutId="home-tab"
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-foreground"
                  />
                )}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-1.5">
            <Link
              href={lobby.href}
              className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground sm:inline-flex"
            >
              <DoorOpen className="size-4 rtl:-scale-x-100" />
              {lobby.label}
            </Link>
            <LanguageMenu />
            <YouMenu onFloor={false} bar leave={lobby} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}
