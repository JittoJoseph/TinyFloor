import Link from "next/link";
import { fontVariables } from "./fonts";

/**
 * A path outside any locale that isn't a file we have (a missing asset, say).
 * The root layout only passes through, so this page brings its own document.
 * It needs nothing from the request, so it's built once and served as is.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className={`${fontVariables} antialiased`}>
        <main className="flex min-h-dvh items-center justify-center bg-background px-6 font-(family-name:--font-body) text-foreground">
          <div className="max-w-sm text-center">
            <p className="text-[13px] font-semibold text-muted-foreground">404</p>
            <h1 className="mt-2 text-[26px] font-bold tracking-tight">This page isn&apos;t here</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">It may have moved, or the link has a typo.</p>
            <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-[14px] font-semibold text-background">
              Go to TinyFloor
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
