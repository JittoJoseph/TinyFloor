"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { AutoHeight } from "./AutoHeight";
import { bezel, bezelPanel, onBezel } from "@/components/ui/bezel";

/**
 * Every door, built like the app's shell: a black bezel, the way the rail
 * frames the view, with the place written on it in light type (its header
 * wears the dark theme in either theme), and what the door asks in a panel
 * set into it. On a phone it rests at the bottom like a sheet.
 */
export const EntryShell: React.FC<{
  backHref?: string;
  backLabel?: string;
  /** The place: its mark, name and a line about it (an EntryHeader), on the bezel. */
  header?: React.ReactNode;
  children: React.ReactNode;
}> = ({ backHref = "/", backLabel, header, children }) => {
  const t = useTranslations("common");
  const back = backLabel ?? t("back");

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-rail">
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between px-3 sm:px-6">
        <Link href={backHref} className={chip}>
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {back}
        </Link>
        <Link href="/" className={cn(chip, "ps-1 font-semibold tracking-tight text-[#f2f2ef] dark:text-foreground")}>
          <Logo size={26} />
          TinyFloor
        </Link>
      </header>
      <main className="relative mx-auto flex w-full max-w-[448px] flex-1 flex-col justify-end px-3 pb-3 sm:justify-center sm:px-4 sm:pb-16">
        <div className={cn(bezel, "rounded-[30px] p-1.5")}>
          <AutoHeight>
            {header && <div className={cn(onBezel, "entry-rise px-3.5 pb-4 pt-3.5 sm:px-[18px] sm:pt-[18px]")}>{header}</div>}
            <div className={cn(bezelPanel, "rounded-[24px] p-5 sm:p-6")}>
              <div className="entry-rise">{children}</div>
            </div>
          </AutoHeight>
        </div>
      </main>
    </div>
  );
};

/** The two ways out above the door, black like its bezel: back where you came from, and home. */
const chip =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-[#09090a] px-3 text-[13px] font-medium text-[#bdbdb6] transition-colors hover:text-[#f2f2ef] dark:bg-[#161617] dark:text-muted-foreground dark:hover:text-foreground";

/**
 * The top of a door, on its bezel: the place's mark, a line above its name, a
 * sentence about it, and anything that says who is in there. An action (a
 * link to copy, say) sits opposite the name.
 */
export function EntryHeader({
  mark,
  eyebrow,
  title,
  subtitle,
  detail,
  action,
  className,
}: {
  mark?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  detail?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3.5">
        {mark && <div className="shrink-0">{mark}</div>}
        <div className={cn("min-w-0 flex-1", mark && !eyebrow && "self-center")}>
          {eyebrow && <p className="text-[12.5px] font-medium text-muted-foreground">{eyebrow}</p>}
          <h1 className="break-words text-[27px] font-bold leading-tight tracking-[-0.03em] text-foreground">{title}</h1>
        </div>
        {action && <div className="-me-1.5 -mt-0.5 shrink-0">{action}</div>}
      </div>
      {subtitle && <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      {detail && <div className="mt-3.5">{detail}</div>}
    </div>
  );
}

/** A small rounded chip beside the place: who is in, how many are on the team. */
export function EntryDetail({ lead, children }: { lead: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-background py-1 pe-3 ps-1 [--face-ring:var(--ui-background)]">
      {lead}
      <span className="text-[12.5px] text-muted-foreground">{children}</span>
    </span>
  );
}

const labelClass = "flex items-baseline gap-2 text-[12.5px] font-medium text-muted-foreground mb-2";

export const Field: React.FC<{
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}> = ({ label, hint, htmlFor, children }) => {
  const content = (
    <>
      {label}
      {hint && <span className="font-normal normal-case tracking-normal text-[11px] opacity-80">{hint}</span>}
    </>
  );

  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {content}
        </label>
      ) : (
        <p className={labelClass}>{content}</p>
      )}
      {children}
    </div>
  );
};

export const inputClass =
  "w-full h-12 px-4 rounded-xl bg-background border border-border text-[16px] sm:text-[15px] text-foreground placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-200 focus:border-foreground/35 focus:ring-4 focus:ring-foreground/[0.06]";

/** The door's own field: a pill, like the one that names an office. */
export const pillInputClass =
  "h-12 w-full rounded-full border border-transparent bg-rail px-5 text-[16px] text-foreground outline-none transition-[border-color] placeholder:text-faint focus:border-foreground/15 sm:text-[15px]";
