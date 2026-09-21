"use client";

import { forwardRef, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { StatefulButton, type ButtonState } from "@/components/motion/button/stateful";
import { cn } from "@/lib/utils";

/**
 * The one big button a screen has: walk in, sign in, create. Built on beUI's
 * stateful button, so pressing it springs, and waiting on the server morphs
 * the label into a spinner and back instead of swapping a word.
 */

type Tone = "primary" | "secondary";

const TONE: Record<Tone, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90 shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(0_0_0/0.18)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_1px_2px_rgb(0_0_0/0.4)]",
  secondary: "border border-border bg-card text-foreground hover:bg-muted",
};

const BASE =
  "group h-11 w-full gap-2 rounded-full px-5 text-[14px] font-medium tracking-[-0.005em] outline-none transition-colors focus-visible:ring-4 focus-visible:ring-foreground/15";

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

function Arrow() {
  return (
    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
  );
}

/** The same button, as a link somewhere. */
export function ActionLink({
  href,
  children,
  tone = "primary",
  icon,
  className,
  onClick,
}: {
  href: string;
  onClick?: () => void;
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode | null;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        BASE,
        TONE[tone],
        "inline-flex items-center justify-center transition-[background-color,transform] active:scale-[0.98]",
        className,
      )}
    >
      {children}
      {icon === null ? null : (icon ?? <Arrow />)}
    </Link>
  );
}
