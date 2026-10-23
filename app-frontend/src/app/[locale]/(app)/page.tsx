import { Suspense } from "react";
import { localizedMetadata } from "@/lib/seo";
import { AppHome } from "@/components/app/AppHome";
import { LAST_OFFICE_SCRIPT } from "@/lib/lastOffice";

export const generateMetadata = localizedMetadata({
  path: "/",
  title: "dashboardTitle",
  noindex: true,
});

export default function AppHomePage() {
  // The front door reads the address's query (?left=…); the page is built ahead of time without one.
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: LAST_OFFICE_SCRIPT }} />
      <Suspense fallback={<div className="min-h-dvh bg-background" aria-busy="true" />}>
        <AppHome />
      </Suspense>
    </>
  );
}
