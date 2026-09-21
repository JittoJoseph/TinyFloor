"use client";

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
    <div className="flex items-center justify-end gap-5">
      {!account && (
        <Link
          href="/auth"
          className="hidden text-[15px] text-foreground/75 transition-colors hover:text-foreground sm:inline"
        >
          {signIn}
        </Link>
      )}
      <Link
        href={account ? "/dashboard" : "/create"}
        className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-foreground px-[18px] text-[15px] text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[0.98]"
      >
        {account ? open : start}
      </Link>
    </div>
  );
}
