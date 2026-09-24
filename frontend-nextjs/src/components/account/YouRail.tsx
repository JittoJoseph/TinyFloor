"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FloorScene } from "@/components/floor/FloorScene";
import { Bust } from "@/components/ui/Bust";

/** Your desk: you, sitting at it, on the same floor everyone walks. */
function Desk({ character, className }: { character: string; className?: string }) {
  return <FloorScene view={[17.5, 5.2, 6, 3.6]} sitting={[{ character, chair: [20, 8] }]} className={className} />;
}

/**
 * You, beside the dashboard and your account alike, so the two read as one
 * place. On a wide screen it is a rail with your desk at the top; on a phone,
 * one row. `action` sits beside your name; `children` go under it (your offices
 * on the dashboard, the account's sections on the account page).
 */
export function YouRail({ action, children }: { action?: ReactNode; children?: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <div className="h-[88px] animate-pulse rounded-[24px] bg-muted lg:h-72" />;
  const link = user.link?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-card">
      <div className="relative hidden h-40 lg:block">
        <Desk character={user.character} className="absolute inset-0" />
      </div>
      <div className="flex items-center gap-4 p-4 lg:block lg:p-5">
        <Bust character={user.character} size={56} rounded="rounded-2xl" className="lg:hidden" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-semibold tracking-tight text-foreground lg:text-[19px]">{user.displayName}</p>
          {user.email && <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>}
          {link && (
            <a
              href={user.link!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 hidden max-w-full items-center gap-1.5 text-[13px] font-medium text-foreground underline-offset-2 hover:underline lg:inline-flex"
            >
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{link}</span>
            </a>
          )}
        </div>
        {action && <div className="shrink-0 lg:mt-4">{action}</div>}
      </div>
      {children}
    </div>
  );
}
