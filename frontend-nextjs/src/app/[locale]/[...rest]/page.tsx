import { notFound } from "next/navigation";

// Unmatched routes under [locale]. With `localePrefix: "as-needed"` the proxy
// rewrites `/<unknown>` to `/en/<unknown>`; without this page Next would render
// its bare global 404 instead of the localized [locale]/not-found.tsx.
export default function CatchAllNotFound() {
  notFound();
}
