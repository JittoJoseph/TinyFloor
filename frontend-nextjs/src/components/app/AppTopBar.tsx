"use client";

import { useTranslations } from "next-intl";
import { DoorOpen } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "./AppShell";
import { YouMenu } from "./YouMenu";

/** The bar above pages that are not a place: the dashboard, your account, making an office. */
export function AppTopBar() {
  const t = useTranslations("shell");
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/dashboard" className="me-auto inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          <Logo size={26} />
          TinyFloor
        </Link>
        <Link
          href="/lobby"
          className="hidden h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <DoorOpen className="size-4" />
          {t("publicLobby")}
        </Link>
        <LanguageSwitcher side="bottom" align="end" compact />
        <YouMenu onFloor={false} bar />
      </div>
    </header>
  );
}
