"use client";

import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The nav's right side. Someone already signed in gets a way back into the app
 * instead of the sign-up pitch; everyone else sees sign in and the main ask.
 * The session is already being read by the root layout, so this costs nothing.
 */
export function HomeNavActions({ signIn, lobby, open }: { signIn: string; lobby: string; open: string }) {
  const { user, isLoading } = useAuth();
  const account = !isLoading && !!user && !user.guest;
  return (
    <div className="flex items-center justify-end gap-1">
      {!account && (
        <Link
          href="/auth"
          className="hidden h-9 items-center rounded-full px-3.5 text-[14.5px] text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground sm:inline-flex"
        >
          {signIn}
        </Link>
      )}
      <Link
        href={account ? "/dashboard" : "/lobby"}
        className="inline-flex h-9 items-center whitespace-nowrap rounded-full bg-foreground px-4 text-[14.5px] text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[0.98]"
      >
        {account ? open : lobby}
      </Link>
    </div>
  );
}
