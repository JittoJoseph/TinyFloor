import { SiteLink as Link } from "@/lib/i18n/SiteLink";

/**
 * The nav's right side: sign in, and the main ask. The site's pages know
 * nothing of who is signed in; the app does. Sign in takes someone already
 * signed in straight on to their offices, and making an office asks for an
 * account on the way.
 */
export function HomeNavActions({ signIn, start }: { signIn: string; start: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href="/auth"
        className="hidden h-9 items-center rounded-full px-3.5 text-[14.5px] text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground sm:inline-flex"
      >
        {signIn}
      </Link>
      <Link
        href="/create"
        className="inline-flex h-9 items-center whitespace-nowrap rounded-full bg-foreground px-4 text-[14.5px] text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[0.98]"
      >
        {start}
      </Link>
    </div>
  );
}
