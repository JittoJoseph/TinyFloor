"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { ErrorNote } from "./ErrorNote";

/**
 * A door that asks a few things one after another (docs/15). Every step is
 * the same height, so the big button never moves: someone can keep pressing
 * the same place, on a phone with their thumb. What a step asks sits at the
 * top; the button, and one quiet way out under it, sit at the bottom. The
 * quiet line keeps its room even when a step has nothing to put there.
 */
export function DoorSteps({
  step,
  back = false,
  onBack,
  backLabel,
  action,
  secondary,
  children,
  className,
}: {
  /** Which step this is: a new key slides the content in. */
  step: string;
  /** The last move was backwards, so the step slides in from the other side. */
  back?: boolean;
  /** A way to the previous step, shown above the content. */
  onBack?: () => void;
  backLabel?: string;
  /** The one big button. */
  action: ReactNode;
  /** A quieter choice under it, or nothing; its room is kept either way. */
  secondary?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tc = useTranslations("common");
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex h-[19rem] flex-col overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin]">
        <div className="h-7 shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ms-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-full px-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 rtl:rotate-180" />
              {backLabel ?? tc("back")}
            </button>
          )}
        </div>
        <div key={step} className="entry-step flex-1" data-back={back}>
          {children}
        </div>
      </div>
      <div className="pt-4">{action}</div>
      <div className="flex h-11 items-end justify-center text-center">{secondary}</div>
    </div>
  );
}

/** What a step asks, in the door's own words: a question and a line under it. */
export function StepTitle({ title, body }: { title: ReactNode; body?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-foreground">{title}</h2>
      {body && <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>}
    </div>
  );
}

/** Where the flow is: a dot a step, the current one drawn long. */
export function StepDots({ at, of }: { at: number; of: number }) {
  return (
    <span className="flex items-center gap-1 pt-2" aria-hidden>
      {Array.from({ length: of }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === at ? "w-4 bg-foreground" : index < at ? "w-1.5 bg-foreground/60" : "w-1.5 bg-foreground/20",
          )}
        />
      ))}
    </span>
  );
}

/** A quiet choice under the big button: a text button, never a second big one. */
export function QuietChoice({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const className =
    "inline-flex min-h-9 cursor-pointer items-center rounded-full px-3 text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";
  return href ? (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/** Something went wrong on this step: said under what it asks, and scrolled into sight inside the door. */
export function StepError({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [children]);
  return (
    <div ref={box} className="mt-4">
      <ErrorNote>{children}</ErrorNote>
    </div>
  );
}
