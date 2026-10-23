"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Check, Dice } from "@/components/ui/icons";
import { PixelAvatar } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";
import { PREMADE_LOOKS, lookString, randomLook } from "@shared/look";

/**
 * Who someone walks in as, at a door: the creator's presets (LookCreator),
 * and a roll of the dice for someone new. Everything about it can be changed
 * later, from their menu.
 */
export const CharacterPicker: React.FC<{
  value: string;
  onChange: (character: string) => void;
  /** More columns, where there is room for them. */
  className?: string;
}> = ({ value, onChange, className }) => {
  const t = useTranslations("entry");
  const tLook = useTranslations("look");
  // A rolled look, not one of the presets, shows on the dice.
  const rolled = PREMADE_LOOKS.includes(value) ? null : value;

  return (
    <div role="radiogroup" aria-label={t("character")} className={cn("grid grid-cols-5 gap-1.5", className)}>
      {PREMADE_LOOKS.map((look, n) => (
        <Choice key={look} label={`${t("character")} ${n + 1}`} selected={value === look} onClick={() => onChange(look)}>
          <PixelAvatar character={look} width="46cqw" style={{ left: "50%", top: "88%" }} />
        </Choice>
      ))}
      <Choice label={tLook("randomize")} selected={!!rolled} onClick={() => onChange(lookString(randomLook()))}>
        {rolled ? (
          <PixelAvatar character={rolled} width="46cqw" style={{ left: "50%", top: "88%" }} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Dice className="size-5" />
          </span>
        )}
      </Choice>
    </div>
  );
};

function Choice({ label, selected, onClick, children }: { label: string; selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-2xl outline-none transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-foreground/[0.07] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ui-foreground)_22%,transparent)]"
          : "hover:bg-foreground/[0.04]",
      )}
    >
      {/* Sized from the tile, so no tile is too small for its character; a shadow on the floor, dark on either theme. */}
      <span className="relative block aspect-[10/11]" style={{ containerType: "size" }}>
        <span className="absolute left-1/2 top-[88%] h-[6%] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-black/15 blur-[1.5px] dark:bg-black/60" />
        {children}
      </span>
      {selected && (
        <span className="absolute end-1 top-1 flex size-[15px] items-center justify-center rounded-full bg-foreground text-background">
          <Check className="size-2.5" strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
