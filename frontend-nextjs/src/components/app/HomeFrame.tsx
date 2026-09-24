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
 * Home, your account and making an office: pages under a floating bar, the
 * one the landing page lifts into as it scrolls. Deliberately not the rail and
 * panel of a place, so none of it reads as being inside an office. The public
 * lobby waits quietly in the bar (and in your menu on a phone).
 */
export function HomeFrame({ active, children }: { active: "home" | "account" | null; children: ReactNode }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("shell");
  const reduce = useReducedMotion();
  const lobby = { href: lobbyPath, label: ts("publicLobby") };
  const tabs = [
    { key: "home", href: "/dashboard", label: t("home") },
    { key: "account", href: "/account", label: ts("account") },
  ] as const;

  return (
    <div className="min-h-dvh bg-rail [--face-ring:var(--ui-rail)]">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
        {/* The page fades out under the floating bar instead of cutting off at it. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-rail from-40% to-transparent" />
        <nav className="mx-auto flex h-14 max-w-[880px] items-center gap-0.5 rounded-full border border-border bg-card/85 pe-2 ps-3 shadow-[0_8px_24px_-10px_rgb(0_0_0/0.3)] [--face-ring:var(--ui-card)] backdrop-blur-xl sm:gap-1 sm:ps-4">
          <Link href="/dashboard" aria-label="TinyFloor" className="me-1.5 inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground sm:me-2">
            <Logo size={26} />
            <span className="hidden sm:inline">TinyFloor</span>
          </Link>
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active === tab.key ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center rounded-full px-3 text-[13.5px] font-medium transition-colors sm:px-3.5",
                active === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active === tab.key && (
                <motion.span
                  layoutId="home-tab"
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className="absolute inset-0 rounded-full bg-foreground/[0.08]"
                />
              )}
              <span className="relative">{tab.label}</span>
            </Link>
          ))}
          <span className="ms-auto" />
          <Link
            href={lobby.href}
            className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground sm:inline-flex"
          >
            <DoorOpen className="size-4 rtl:-scale-x-100" />
            {lobby.label}
          </Link>
          <LanguageMenu />
          <YouMenu onFloor={false} bar leave={lobby} />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 [--group-bg:var(--ui-card)] [--group-shadow:0_1px_2px_rgb(0_0_0/0.06),0_16px_40px_-28px_rgb(0_0_0/0.45)] sm:px-6 sm:pt-32">{children}</main>
    </div>
  );
}
