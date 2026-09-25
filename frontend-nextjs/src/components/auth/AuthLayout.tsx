"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/app/Logo";

/**
 * Signing in and up: the form on its own, in the middle of the page, the way
 * people are used to. Nothing around it but the way home.
 */
export function CenteredAuthLayout({ backHref = "/", children }: { backHref?: string; children: ReactNode }) {
  const tc = useTranslations("common");
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          <Logo size={26} />
          TinyFloor
        </Link>
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {tc("back")}
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:items-center sm:px-6 sm:pt-0">
        <div className="entry-rise w-full max-w-[360px]">
          {children}
        </div>
      </main>
    </div>
  );
}
