"use client";

import { useEffect, useRef } from "react";
import { PixelAvatar } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";

/** A die's pips on a 24 grid, for each face. */
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[12, 12]],
  2: [[8.5, 8.5], [15.5, 15.5]],
  3: [[8.5, 8.5], [12, 12], [15.5, 15.5]],
  4: [[8.5, 8.5], [15.5, 8.5], [8.5, 15.5], [15.5, 15.5]],
  5: [[8.5, 8.5], [15.5, 8.5], [12, 12], [8.5, 15.5], [15.5, 15.5]],
  6: [[8.5, 7.8], [15.5, 7.8], [8.5, 12], [15.5, 12], [8.5, 16.2], [15.5, 16.2]],
};
// The faces in the order the die shows them, so two rolls in a row never land on the same one.
const FACES = [5, 3, 6, 2, 4, 1];

function Die({ face, className }: { face: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" stroke="currentColor" strokeWidth="1.6" />
      {PIPS[face].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.45" fill="currentColor" />
      ))}
    </svg>
  );
}

/**
 * Who someone walks into the demo office as, in one pill: their character in
 * a circle at the start (a tap to choose another), the name, and a die that
 * rolls a new pair. A new name blurs in and a new character pops in, so a
 * roll reads as a roll. Nothing is drawn until the door is `ready`, since
 * what's offered is random and the server's page can't know it: the pill
 * fills in once, with the same motion as a roll, rather than flickering from
 * one thing to another. A key pressed with nothing else focused starts
 * typing here, replacing the offered name.
 */
export function PersonaField({
  ready,
  name,
  character,
  rolls,
  onName,
  onRoll,
  onCharacter,
  labels,
}: {
  ready: boolean;
  name: string;
  character: string;
  /** How many times the die has been rolled: each roll replays the motion. */
  rolls: number;
  onName: (name: string) => void;
  onRoll: () => void;
  onCharacter: () => void;
  labels: { name: string; placeholder: string; roll: string; character: string };
}) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    const typing = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.closest("input, textarea, select, [contenteditable], [role=dialog]") || document.querySelector("[aria-modal=true]")) return;
      // Enter with nothing focused walks in, as it would from the field.
      if (event.key === "Enter" && (!active || active === document.body)) {
        event.preventDefault();
        input.current?.form?.requestSubmit();
        return;
      }
      if (event.key.length !== 1 || event.key === " ") return;
      // Selected, so the key about to land replaces the offered name.
      input.current?.focus({ preventScroll: true });
      input.current?.select();
    };
    window.addEventListener("keydown", typing);
    return () => window.removeEventListener("keydown", typing);
  }, [ready]);

  const face = FACES[rolls % FACES.length];

  return (
    <div>
      <label htmlFor="identity-name" className="mb-2 block text-[12.5px] font-medium text-muted-foreground">
        {labels.name}
      </label>
      <div className="flex h-[3.75rem] items-center gap-1 rounded-full border border-transparent bg-rail p-1.5 transition-[border-color] focus-within:border-foreground/15">
        <button
          type="button"
          disabled={!ready}
          onClick={onCharacter}
          aria-label={labels.character}
          title={labels.character}
          className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-full bg-card shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ui-foreground)_8%,transparent)] transition-transform active:scale-95 disabled:cursor-default"
          style={{ containerType: "size" }}
        >
          {ready && (
            <span key={character} className="persona-pop absolute inset-0">
              <PixelAvatar character={character} width="60cqw" style={{ left: "50%", top: "94%" }} />
            </span>
          )}
        </button>
        <input
          ref={input}
          // A new key each roll, so the new name plays its entrance.
          key={ready ? `name-${rolls}` : "waiting"}
          id="identity-name"
          type="text"
          value={name}
          onChange={(event) => onName(event.target.value)}
          // Offered, so typing replaces it rather than adding to it.
          onFocus={(event) => event.currentTarget.select()}
          placeholder={ready ? labels.placeholder : undefined}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent px-2.5 text-[17px] font-medium tracking-[-0.01em] text-foreground outline-none placeholder:font-normal placeholder:text-faint",
            ready && "persona-name",
          )}
          maxLength={30}
          autoComplete="nickname"
          spellCheck={false}
        />
        <button
          type="button"
          disabled={!ready}
          onClick={onRoll}
          aria-label={labels.roll}
          title={labels.roll}
          className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground active:bg-foreground/[0.09] disabled:cursor-default"
        >
          <Die key={rolls} face={face} className={cn("size-[22px]", rolls > 0 && "die-roll")} />
        </button>
      </div>
    </div>
  );
}
