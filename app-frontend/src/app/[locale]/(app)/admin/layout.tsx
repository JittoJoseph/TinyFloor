import type { Metadata } from "next";

// For the team only; nothing here belongs in a search index.
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
