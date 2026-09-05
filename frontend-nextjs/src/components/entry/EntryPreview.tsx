import React from "react";
import { OfficeScene, Occupant } from "@/components/OfficeScene";

export const EntryPreview: React.FC<{
  occupants: Occupant[];
  caption?: React.ReactNode;
}> = ({ occupants, caption }) => (
  <OfficeScene
    className="aspect-[4/3] rounded-[1.35rem] border border-black/10"
    zoom="auto 470px"
    focus="42% 69%"
    occupants={occupants}
  >
    {caption && (
      <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 font-body text-[11px] font-medium text-[var(--color-braun-text)] shadow-sm">
        {caption}
      </span>
    )}
  </OfficeScene>
);
