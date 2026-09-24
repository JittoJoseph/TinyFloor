"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/app/AppShell";

/**
 * Signing in and up: the form in a quiet column of its own, and beside it, on
 * a desktop, the thing you are signing up for — drawn in the app's own frame.
 */
export function AuthLayout({
  backHref = "/",
  aside,
  children,
}: {
  backHref?: string;
  /** What the right half shows; left out on a phone. */
  aside: ReactNode;
  children: ReactNode;
}) {
  const tc = useTranslations("common");
  return (
    <div className="flex min-h-dvh w-full bg-rail text-foreground">
      <section className="flex min-h-dvh w-full flex-col bg-background lg:w-[min(46%,40rem)] lg:shrink-0">
        <header className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
            <Logo size={26} />
            TinyFloor
          </Link>
          <Link
            href={backHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {tc("back")}
          </Link>
        </header>
        <main className="flex flex-1 items-start justify-center px-5 pb-10 pt-6 sm:items-center sm:px-8 sm:pt-2">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>
      </section>
      <aside className="relative hidden min-w-0 flex-1 items-center justify-center overflow-hidden p-10 lg:flex xl:p-16">
        {aside}
      </aside>
    </div>
  );
}

/**
 * Signing in and up: the form on its own, in the middle, the way people are
 * used to. A card on a quiet ground where there is room; the whole screen on a phone.
 */
export function CenteredAuthLayout({ backHref = "/", children }: { backHref?: string; children: ReactNode }) {
  const tc = useTranslations("common");
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground sm:bg-rail">
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
        <div className="entry-rise w-full max-w-[400px] sm:rounded-[28px] sm:border sm:border-border sm:bg-background sm:px-9 sm:py-10 sm:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(0_0_0/0.18)]">
          {children}
        </div>
      </main>
    </div>
  );
}
