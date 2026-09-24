"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * What Home, your account and making an office look like while they load:
 * the same shapes in the same places, so nothing jumps when they arrive.
 */

const SHAPE_KEY = "tf-home";
/** How many offices Home had last time, so it can wait in the right shape. */
export type HomeShape = "none" | "one" | "several";

export function rememberHomeShape(count: number) {
  try {
    localStorage.setItem(SHAPE_KEY, count === 0 ? "none" : count === 1 ? "one" : "several");
  } catch {
    // Only a hint for next time.
  }
}

function readShape(): HomeShape {
  try {
    const saved = localStorage.getItem(SHAPE_KEY);
    return saved === "none" || saved === "several" ? saved : "one";
  } catch {
    return "one";
  }
}

const noop = () => () => {};

/** The shape Home had last time; nothing on the server, which can't know. */
export function useHomeShape(): HomeShape | null {
  return useSyncExternalStore(noop, readShape, () => null);
}

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

/** One office at a glance, as Overview lays it out. */
export function OfficeSkeleton({ several }: { several?: boolean }) {
  return (
    <div aria-hidden>
      {several && (
        <div className="mb-8 flex h-9 items-center gap-2">
          <Bone className="size-5 rounded-[30%]" />
          <Bone className="h-4 w-32" />
          <Bone className="ms-auto h-3.5 w-20" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Bone className="size-11 rounded-[30%]" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-5 w-40" />
          <Bone className="h-3 w-32" />
        </div>
        <Bone className="h-9 w-full sm:w-24" />
      </div>
      <Bone className="mt-6 h-44 rounded-2xl sm:h-60" />
      <div className="mt-8">
        <GroupBone rows={1} faces={false} />
        <GroupBone rows={2} note />
      </div>
    </div>
  );
}

/** Making an office, as MakeOffice lays it out: down one edge on a phone, centered wider. */
export function MakeSkeleton({ extras }: { extras?: boolean }) {
  return (
    <div aria-hidden className="mx-auto max-w-[440px] sm:flex sm:min-h-[calc(100dvh-14rem)] sm:flex-col sm:items-center sm:justify-center sm:pb-6">
      <Bone className="size-[60px] rounded-[30%] sm:size-20" />
      <Bone className="mt-7 h-3.5 w-24 sm:mt-9" />
      <Bone className="mt-3 h-8 w-64 sm:w-80" />
      <Bone className="mt-3.5 h-3.5 w-full max-w-[340px]" />
      <span className="mt-7 block h-14 w-full rounded-full border border-border bg-card sm:mt-8 sm:h-[52px]" />
      <Bone className="ms-5 mt-3.5 h-3 w-56 sm:ms-0" />
      {extras && (
        <>
          <Bone className="mt-12 h-3 w-20 sm:hidden" />
          <span className="mt-3 block h-36 w-full rounded-[20px] border border-border bg-card sm:mt-12 sm:h-11 sm:rounded-full sm:bg-transparent" />
        </>
      )}
    </div>
  );
}

/** Home before it knows your offices: the shape it had last time. */
export function HomeSkeleton() {
  const shape = useHomeShape();
  if (!shape) return null;
  return shape === "none" ? <MakeSkeleton extras /> : <OfficeSkeleton several={shape === "several"} />;
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
