import { cn } from "web-shared/lib/utils";
import { changelogImage, type ChangeKind, type ChangelogEntry } from "@/lib/changelog";

export const KIND_LABEL: Record<ChangeKind, string> = { new: "New", improved: "Improved", fixed: "Fixed" };

/** A change's day, as the changelog shows it: "14 November 2026". */
export const changeDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The picture of a change: the app itself on one of the site's colour stages
 * (public/screens, 1600 by 1000, made by scripts/screens.mjs), with what it
 * shows in words for anyone who can't see it.
 */
export function ChangeImage({ entry, priority = false, className }: { entry: ChangelogEntry; priority?: boolean; className?: string }) {
  const src = changelogImage(entry);
  if (!src || !entry.image) return null;
  return (
    <div className={cn("overflow-hidden rounded-[22px] bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={entry.image.alt}
        width={1600}
        height={1000}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="aspect-[16/10] h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.01]"
      />
    </div>
  );
}
