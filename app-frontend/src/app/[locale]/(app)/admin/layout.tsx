import type { Metadata } from "next";

// For the team only; nothing here belongs in a search index.
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** The team's view of everyone: in PostHog's recordings its words stay hidden. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div data-ph-mask>{children}</div>;
}
