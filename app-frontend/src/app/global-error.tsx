"use client";

import NextError from "next/error";
import { withPostHog } from "@/lib/analytics";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    withPostHog((posthog) => posthog.captureException(error));
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
