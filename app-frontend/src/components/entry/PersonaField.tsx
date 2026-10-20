"use client";

import { useEffect, useRef } from "react";
import { PixelAvatar } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";

/**
 * Two arrows crossing: someone else. Each roll draws the arrows again, lines
 * then heads (shared.css), rather than spinning a die. Lines and heads
 * alternate, which is what the animation counts on.
 */
function Shuffle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path pathLength={1} d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
      <path pathLength={1} d="m18 2 4 4-4 4" />
      <path pathLength={1} d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path pathLength={1} d="m18 14 4 4-4 4" />
      <path pathLength={1} d="M12.3 15.4l.5.8c.7 1.1 2 1.8 3.3 1.8H22" />
    </svg>
  );
}

/**
 * Who someone walks into the demo office as, in one pill: their character in
 * a circle at the start (a tap to choose another), the name, and a shuffle
 * for a new pair. A new name fades in and a new character settles into its
 * circle. Nothing is drawn until the door is `ready`, since
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

  return (
    <div>
      <label htmlFor="identity-name" className="mb-2 block text-[12.5px] font-medium text-muted-foreground">
        {labels.name}
      </label>
      <div className="flex h-[3.25rem] items-center gap-1 rounded-full border border-transparent bg-rail p-1.5 transition-[border-color] focus-within:border-foreground/15">
        <button
          type="button"
          disabled={!ready}
          onClick={onCharacter}
          aria-label={labels.character}
          title={labels.character}
          className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-full bg-card shadow-[0_0_0_1px_color-mix(in_oklab,var(--ui-foreground)_7%,transparent)] transition-transform active:scale-95 disabled:cursor-default"
          style={{ containerType: "size" }}
        >
          {ready && (
            <span key={character} className="persona-pop absolute inset-0">
              {/* The character's art fills the bottom three quarters of its frame: at
                  44% of the circle wide it stands 66% tall, and feet at 83% leave
                  even room above its head and below its feet. */}
              <PixelAvatar character={character} width="44cqw" style={{ left: "50%", top: "83%" }} />
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
            "h-full min-w-0 flex-1 bg-transparent px-2 text-[16px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-faint",
            ready && "persona-fade",
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
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,transform] hover:bg-foreground/[0.06] hover:text-foreground active:scale-95 disabled:cursor-default"
        >
          <Shuffle key={rolls} className={cn("size-[18px]", rolls > 0 && "shuffle-draw")} />
        </button>
      </div>
    </div>
  );
}
