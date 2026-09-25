"use client";

import { forwardRef, type ReactNode } from "react";
import { StatefulButton, type ButtonState } from "@/components/motion/button/stateful";
import { cn } from "@/lib/utils";
import { Arrow, BASE, TONE, type Tone } from "./ActionLink";

/**
 * The one big button a screen has: walk in, sign in, create. Built on beUI's
 * stateful button, so pressing it springs, and waiting on the server morphs
 * the label into a spinner and back instead of swapping a word.
 */

export const ActionButton = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    /** Waiting on something: shown as a spinner with this label. */
    busy?: boolean;
    busyLabel?: ReactNode;
    tone?: Tone;
    /** The icon after the label; an arrow unless said otherwise. */
    icon?: ReactNode | null;
    className?: string;
    type?: "button" | "submit";
    disabled?: boolean;
    onClick?: () => void;
    state?: ButtonState;
  }
>(function ActionButton(
  { children, busy, busyLabel, tone = "primary", icon, className, type = "button", disabled, onClick, state },
  ref,
) {
  return (
    <StatefulButton
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      state={state ?? (busy ? "loading" : "idle")}
      loadingText={busyLabel ?? children}
      pressScale={0.97}
      icon={icon === null ? undefined : (icon ?? <Arrow />)}
      className={cn(BASE, TONE[tone], className)}
    >
      {children}
    </StatefulButton>
  );
});

export { ActionLink } from "./ActionLink";
