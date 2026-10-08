"use client";

import type { ReactNode } from "react";
import { useSettled } from "@/lib/hooks/use-settled";

/**
 * Something hidden when the page opens, drawn once it has settled rather than
 * with it: it comes with the page's data, but not in its markup.
 */
export function Later({ children }: { children: ReactNode }) {
  return useSettled() ? children : null;
}
