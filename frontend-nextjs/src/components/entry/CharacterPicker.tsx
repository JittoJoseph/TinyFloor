"use client";

import React from "react";
import { Check } from "lucide-react";
import { PixelAvatar } from "@/components/PixelAvatar";

export const CHARACTER_IDS = ["Adam", "Alex", "Amelia", "Bob"];

export const CharacterPicker: React.FC<{
  value: string;
  onChange: (character: string) => void;
}> = ({ value, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Character"
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
          <span className="relative block aspect-square rounded-xl bg-[#f0f0eb] overflow-hidden">
            <PixelAvatar
              character={character}
              width={34}
              style={{ left: "50%", top: "84%" }}
            />
            <span className="absolute left-1/2 bottom-[14%] -translate-x-1/2 w-6 h-1.5 rounded-[100%] bg-black/10 blur-[1px]" />
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
