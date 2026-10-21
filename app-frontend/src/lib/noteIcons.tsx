import { HugeiconsIcon } from "@hugeicons/react";
import {
  Airplane01Icon,
  BeachIcon,
  BubbleChatIcon,
  Bus01Icon,
  Calendar03Icon,
  Call02Icon,
  Coffee02Icon,
  CodeIcon,
  HeadphonesIcon,
  Home01Icon,
  Moon02Icon,
  NoodlesIcon,
  PencilEdit02Icon,
  Presentation01Icon,
  ThermometerIcon,
  WalkingIcon,
} from "@hugeicons/core-free-icons";
import { NOTE_ICONS, type NoteIcon } from "@shared/messages";
import { cn } from "@/lib/utils";

type IconData = typeof HeadphonesIcon;

/**
 * Each note icon, drawn from the app's own icon set in a colour of its own, so
 * a note reads at a glance in a list or over the floor: the same on every
 * device, which emoji weren't.
 */
const NOTE_ICON: Record<NoteIcon, { data: IconData; color: string }> = {
  chat: { data: BubbleChatIcon, color: "#94a3b8" },
  focus: { data: HeadphonesIcon, color: "#8b5cf6" },
  lunch: { data: NoodlesIcon, color: "#f97316" },
  coffee: { data: Coffee02Icon, color: "#d97706" },
  meeting: { data: Calendar03Icon, color: "#3b82f6" },
  away: { data: WalkingIcon, color: "#64748b" },
  sick: { data: ThermometerIcon, color: "#f43f5e" },
  holiday: { data: BeachIcon, color: "#14b8a6" },
  travel: { data: Airplane01Icon, color: "#0ea5e9" },
  home: { data: Home01Icon, color: "#10b981" },
  commute: { data: Bus01Icon, color: "#6366f1" },
  code: { data: CodeIcon, color: "#06b6d4" },
  writing: { data: PencilEdit02Icon, color: "#ec4899" },
  presenting: { data: Presentation01Icon, color: "#eab308" },
  call: { data: Call02Icon, color: "#22c55e" },
  night: { data: Moon02Icon, color: "#818cf8" },
};

export const NOTE_ICON_LIST = NOTE_ICONS;

/** A note's icon, in its colour. */
export function NoteGlyph({ icon, className }: { icon: NoteIcon | null | undefined; className?: string }) {
  const one = NOTE_ICON[icon ?? "chat"] ?? NOTE_ICON.chat;
  return <HugeiconsIcon icon={one.data} strokeWidth={1.8} color={one.color} className={cn("size-4 shrink-0", className)} aria-hidden />;
}

/** The same icon as SVG markup, for the name tags over the floor, which are plain HTML (lib/plates.ts). */
export function noteIconSvg(icon: NoteIcon | null | undefined, size = 12): string {
  const one = NOTE_ICON[icon ?? "chat"] ?? NOTE_ICON.chat;
  const parts = (one.data as unknown as Array<[string, Record<string, string>]>)
    .map(([tag, attributes]) => {
      const written = Object.entries(attributes)
        .filter(([name]) => name !== "key")
        .map(([name, value]) => `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${value === "currentColor" ? one.color : value}"`)
        .join(" ");
      return `<${tag} ${written}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke-width="1.8" aria-hidden="true">${parts.replace(/stroke-width="[^"]*"/g, 'stroke-width="1.8"')}</svg>`;
}
