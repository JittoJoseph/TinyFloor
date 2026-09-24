"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { PixelAvatar } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";

export const CHARACTER_IDS = [
  "Adam",
  "Alex",
  "Amelia",
  "Ash",
  "Bob",
  "Dan",
  "Lucy",
  "Molly",
];

export const CharacterPicker: React.FC<{
  value: string;
  onChange: (character: string) => void;
  /** More columns, where there is room for them. */
  className?: string;
}> = ({ value, onChange, className }) => {
  const t = useTranslations("entry");

  return (
    <div role="radiogroup" aria-label={t("character")} className={cn("grid grid-cols-4 gap-1.5", className)}>
      {CHARACTER_IDS.map((character) => {
        const selected = value === character;
        return (
          <button
            key={character}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(character)}
            className={cn(
              "group relative cursor-pointer rounded-2xl p-1 pb-2 outline-none transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-foreground/[0.07] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ui-foreground)_22%,transparent)]"
                : "hover:bg-foreground/[0.04]",
            )}
          >
            {/* Sized from the tile, not in pixels, so no tile is ever too small for
                its character. Every character's art fills the bottom three
                quarters of its frame, so at 48% of the tile wide the body is 72%
                tall, and feet at 86% centre it with even room above and below. */}
            <span className="relative block aspect-square" style={{ containerType: "size" }}>
              {/* A shadow on the floor, never a light: dark on either theme. */}
              <span className="absolute left-1/2 top-[86%] h-[7%] w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-black/15 blur-[1.5px] dark:bg-black/60" />
              <PixelAvatar
                character={character}
                width="48cqw"
                style={{ left: "50%", top: "86%" }}
                className={cn("transition-[opacity,filter] duration-200", !selected && "opacity-85 group-hover:opacity-100")}
              />
            </span>
            <span
              className={cn(
                "block text-center text-[12px] transition-colors duration-200",
                selected ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              {character}
            </span>
            {selected && (
              <span className="absolute end-1.5 top-1.5 flex size-[15px] items-center justify-center rounded-full bg-foreground text-background">
                <Check className="size-2.5" strokeWidth={3.5} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
