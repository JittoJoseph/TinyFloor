import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

// The look of the one big button a screen has (Action.tsx), kept apart from
// the pressable button so a page with only the link brings no animation library.

export type Tone = "primary" | "secondary";

export const TONE: Record<Tone, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90 shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(0_0_0/0.18)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_1px_2px_rgb(0_0_0/0.4)]",
  secondary: "border border-border bg-card text-foreground hover:bg-muted",
};

export const BASE =
  "group h-11 w-full cursor-pointer gap-2 rounded-full px-5 text-[14px] font-medium tracking-[-0.005em] outline-none transition-colors focus-visible:ring-4 focus-visible:ring-foreground/15";

export function Arrow() {
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
