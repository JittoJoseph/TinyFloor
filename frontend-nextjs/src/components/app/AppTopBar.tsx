"use client";

import { Link } from "@/lib/i18n/navigation";
import { Logo } from "./Logo";
import { LanguageMenu } from "./LanguageMenu";
import { YouMenu } from "./YouMenu";

/** The bar above pages that are not a place: the dashboard, your account, making an office. */
export function AppTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/dashboard" className="me-auto inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          <Logo size={26} />
          TinyFloor
        </Link>
        <LanguageMenu />
        <YouMenu onFloor={false} bar />
      </div>
    </header>
  );
}
