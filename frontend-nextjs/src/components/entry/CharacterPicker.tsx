"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { PixelAvatar } from "@/components/PixelAvatar";

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
}> = ({ value, onChange }) => {
  const t = useTranslations("entry");

  return (
  <div
    role="radiogroup"
    aria-label={t("character")}
    className="grid grid-cols-4 gap-2"
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
          className={`cursor-pointer group relative rounded-2xl border p-2 pb-2.5 transition-[border-color,background-color,transform,box-shadow] duration-200 ${
            selected
              ? "border-[var(--color-braun-text)]/35 bg-white shadow-[0_10px_24px_-16px_rgba(0,0,0,0.5)]"
              : "border-black/8 bg-[#fbfbf9] hover:bg-white hover:border-black/15"
          }`}
        >
          {/* Sized from the tile, not in pixels, so no tile is ever too small for
              its character. Every character's art fills the bottom three
              quarters of its frame, so at 48% of the tile wide the body is 72%
              tall, and feet at 86% centre it with even room above and below. */}
          <span
            className="relative block aspect-square rounded-xl bg-[#f0f0eb] overflow-hidden"
            style={{ containerType: "size" }}
          >
            <span className="absolute left-1/2 top-[86%] -translate-x-1/2 -translate-y-1/2 w-[46%] h-[7%] rounded-[100%] bg-black/10 blur-[1px]" />
            <PixelAvatar
              character={character}
              width="48cqw"
              style={{ left: "50%", top: "86%" }}
            />
          </span>
          <span
            className={`block text-center font-body text-[11px] font-semibold mt-2 transition-opacity duration-200 ${
              selected
                ? "text-[var(--color-braun-text)]"
                : "text-[var(--color-braun-text)] opacity-45 group-hover:opacity-70"
            }`}
          >
            {character}
          </span>
          {selected && (
            <span className="absolute top-1 right-1 w-4.5 h-4.5 rounded-full bg-[var(--color-braun-orange)] text-white flex items-center justify-center shadow-sm">
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
            </span>
          )}
        </button>
      );
    })}
  </div>
  );
};
