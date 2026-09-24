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
  <div
    role="radiogroup"
    aria-label={t("character")}
    className={cn("grid grid-cols-4 gap-2", className)}
  >
    {CHARACTER_IDS.map((character) => {
      const selected = value === character;
      return (
        <button
          key={character}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(character)}
          className={`cursor-pointer group relative rounded-2xl border p-1.5 pb-2 outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-foreground/10 ${
            selected
              ? "border-foreground bg-card shadow-[0_0_0_1px_var(--ui-foreground)]"
              : "border-border bg-card hover:border-border-strong"
          }`}
        >
          {/* Sized from the tile, not in pixels, so no tile is ever too small for
              its character. Every character's art fills the bottom three
              quarters of its frame, so at 48% of the tile wide the body is 72%
              tall, and feet at 86% centre it with even room above and below. */}
          <span
            className="relative block aspect-square rounded-xl bg-muted overflow-hidden"
            style={{ containerType: "size" }}
          >
            <span className="absolute left-1/2 top-[86%] -translate-x-1/2 -translate-y-1/2 w-[46%] h-[7%] rounded-[100%] bg-foreground/10 blur-[1px]" />
            <PixelAvatar
              character={character}
              width="48cqw"
              style={{ left: "50%", top: "86%" }}
            />
          </span>
          <span
            className={`mt-1.5 block text-center text-[12px] transition-colors duration-200 ${
              selected ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground"
            }`}
          >
            {character}
          </span>
          {selected && (
            <span className="absolute end-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="size-2.5" strokeWidth={3.5} />
            </span>
          )}
        </button>
      );
    })}
  </div>
  );
};
