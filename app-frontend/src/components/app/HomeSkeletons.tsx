"use client";

import { cn } from "@/lib/utils";

/**
 * What your account looks like while it loads: the same shapes in the same
 * places, so nothing jumps when it arrives.
 */

export function Bone({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse rounded-full bg-foreground/[0.07]", className)} />;
}

/** A settings group's panel with a few rows in it, as Group draws it. */
function GroupBone({ rows, note, faces = true, fields }: { rows: number; note?: boolean; faces?: boolean; fields?: boolean }) {
  return (
    <div className="mb-8">
      <Bone className="h-3.5 w-24" />
      {note && <Bone className="mt-2 h-3 w-16" />}
      <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-[var(--group-bg,var(--ui-background))] shadow-[var(--group-shadow,none)]">
        {Array.from({ length: rows }, (_, index) =>
          fields ? (
            <div key={index} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Bone className="h-3 w-24" />
              <span className="block h-9 w-full rounded-lg border border-border sm:w-64" />
            </div>
          ) : (
            <div key={index} className="flex h-12 items-center gap-3 px-4">
              {faces && <Bone className="size-[26px]" />}
              <Bone className={cn("h-3", index % 2 ? "w-24" : "w-36")} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/** Your account, as AccountView lays it out. */
export function AccountSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-[640px]">
      <div className="flex items-center gap-4 sm:flex-col sm:gap-0">
        <Bone className="size-[60px] sm:size-20" />
        <div className="min-w-0 flex-1 sm:mt-7 sm:flex sm:flex-col sm:items-center">
          <Bone className="h-3.5 w-24" />
          <Bone className="mt-2.5 h-6 w-36 sm:h-7 sm:w-44" />
          <Bone className="mt-2.5 h-3 w-44" />
        </div>
      </div>
      <div className="mt-8 flex sm:justify-center">
        <span className="block h-11 w-full rounded-full border border-border bg-card/60 sm:w-[400px]" />
      </div>
      <div className="mt-10">
        <GroupBone rows={2} note fields />
        <GroupBone rows={1} note faces={false} />
      </div>
    </div>
  );
}
