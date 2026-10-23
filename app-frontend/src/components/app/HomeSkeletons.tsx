"use client";

import { cn } from "@/lib/utils";

/** A loading shape: a line or a face, in the place what's loading will take. */
export function Bone({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse rounded-full bg-foreground/[0.07]", className)} />;
}
