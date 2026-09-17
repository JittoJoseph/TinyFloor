"use client";

import { useTranslations } from "next-intl";
import { DoorOpen } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { UserMenu } from "@/components/auth/UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function DashboardHeader() {
  const t = useTranslations("workspace");
  return (
    <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
      <Link href="/" className="cursor-pointer font-body font-bold text-lg tracking-tight text-[var(--color-braun-text)]">
        TinyFloor
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/lobby"
          className="cursor-pointer hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-full border border-black/10 bg-white/60 font-body text-[13px] font-medium text-[var(--color-braun-text)] opacity-75 hover:opacity-100 hover:bg-white transition-[opacity,background-color]"
        >
          <DoorOpen className="w-4 h-4" />
          {t("lobby")}
        </Link>
        <LanguageSwitcher side="bottom" align="end" compact />
        <UserMenu />
      </div>
    </header>
  );
}
