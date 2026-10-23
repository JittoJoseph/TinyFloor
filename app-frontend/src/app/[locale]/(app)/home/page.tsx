import { Suspense } from "react";
import { localizedMetadata } from "@/lib/seo";
import { Home } from "@/components/app/Home";
import { LAST_OFFICE_SCRIPT } from "@/lib/lastOffice";

export const generateMetadata = localizedMetadata({
  path: "/home",
  title: "dashboardTitle",
  noindex: true,
});

export default function HomePage() {
  // The front door reads the address's query (?left=…, ?mode=…); the page is built ahead of time without one.
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: LAST_OFFICE_SCRIPT }} />
      <Suspense fallback={<div className="min-h-dvh bg-background" aria-busy="true" />}>
        <Home />
      </Suspense>
    </>
  );
}
