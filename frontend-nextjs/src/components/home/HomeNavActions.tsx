"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The nav's right side. Someone already signed in gets a way back into the app
 * instead of the sign-up pitch; everyone else sees sign in and the main ask.
 * The session is already being read by the root layout, so this costs nothing.
 */
export function HomeNavActions({ signIn, start, open }: { signIn: string; start: string; open: string }) {
  const { user, isLoading } = useAuth();
  const account = !isLoading && !!user && !user.guest;
  return (
    <div className="ms-auto flex items-center gap-1.5">
      {!account && (
        <Link
          href="/auth"
          className="hidden h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex"
        >
          {signIn}
        </Link>
      )}
      <Link
        href={account ? "/dashboard" : "/create"}
        className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background transition-colors hover:bg-foreground/90"
      >
        {account ? open : start}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}
