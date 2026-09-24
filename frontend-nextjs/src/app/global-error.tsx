"use client";

import NextError from "next/error";
import posthog from "posthog-js";
import { useEffect } from "react";

const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST);

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    if (posthogConfigured) posthog.captureException(error);
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
