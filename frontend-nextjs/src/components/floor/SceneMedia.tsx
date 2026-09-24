import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import files from "./scene-files.json";
import type { SceneName } from "./sceneCatalog";

type SceneFile = { width: number; height: number; loop: boolean; hash: string };

/**
 * A floor scene as the file it was recorded to (scripts/scenes.mjs): a
 * looping AVIF where it moves, with a still for reduced motion and for
 * browsers without AVIF, or just the still. Nothing to render or run; the
 * browser picks the file. It fills its box the way FloorScene does, and
 * `over` lays the app's live chips and cards on top.
 */
export function SceneMedia({
  name,
  className,
  priority = false,
  pixelated = false,
  position,
  over,
}: {
  name: SceneName;
  className?: string;
  /** The page's main picture: fetched at once instead of when scrolled to. */
  priority?: boolean;
  /** Blown up well past its own pixels (a backdrop): keep the pixel art's edges hard. */
  pixelated?: boolean;
  /** Which part stays in view when the box crops it (object-position). */
  position?: string;
  over?: ReactNode;
}) {
  const file = (files as Record<string, SceneFile>)[name];
  const still = `/scenes/${name}.webp?v=${file.hash}`;

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- a prerecorded file, already the size it's shown at
    <img
      src={still}
      width={file.width}
      height={file.height}
      alt=""
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("absolute inset-0 size-full select-none object-cover", pixelated && "[image-rendering:pixelated]")}
      style={position ? { objectPosition: position } : undefined}
    />
  );

  return (
    <div className={cn("relative overflow-hidden bg-[#9a9aa4]", className)}>
      {file.loop ? (
        <span aria-hidden>
          <picture>
            <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
            <source type="image/avif" srcSet={`/scenes/${name}.avif?v=${file.hash}`} />
            {img}
          </picture>
        </span>
      ) : (
        <span aria-hidden>{img}</span>
      )}
      {over}
    </div>
  );
}
