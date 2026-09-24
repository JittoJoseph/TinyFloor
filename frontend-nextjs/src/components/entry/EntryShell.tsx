"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { FloorScene } from "@/components/floor/FloorScene";
import { Logo } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { AutoHeight } from "./AutoHeight";

/** Who you'll be on the floor, standing in the office behind the door. */
export interface Arrival {
  character: string;
  name?: string;
  running?: boolean;
}

/**
 * Every door: the office behind it, dimmed and soft, and one raised panel in
 * front with the place and what it asks. The office is scenery, never
 * something to click, so it sits under a veil and takes no pointer. On a phone
 * the panel rests at the bottom like a sheet, with the office showing above.
 */
export const EntryShell: React.FC<{
  backHref?: string;
  backLabel?: string;
  /** You, in the office behind; left out, the office is just its people. */
  you?: Arrival;
  children: React.ReactNode;
}> = ({ backHref = "/", backLabel, you, children }) => {
  const t = useTranslations("common");
  const back = backLabel ?? t("back");

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-rail [--face-ring:var(--ui-card)]">
      <Backdrop you={you} />
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between px-3 sm:px-6">
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 text-[13px] font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {back}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pe-3 ps-1 text-[14px] font-semibold tracking-tight text-foreground backdrop-blur-md"
        >
          <Logo size={26} />
          TinyFloor
        </Link>
      </header>
      <main className="relative mx-auto flex w-full max-w-[448px] flex-1 flex-col justify-end px-3 pb-3 sm:justify-center sm:px-4 sm:pb-16">
        <div className="rounded-[22px] border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_24px_60px_-32px_rgb(0_0_0/0.5)]">
          <AutoHeight>
            <div className="p-5 sm:p-6">{children}</div>
          </AutoHeight>
        </div>
      </main>
    </div>
  );
};

/** The office behind the door: people at their desks, a couple walking about, and you among them. */
function Backdrop({ you }: { you?: Arrival }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 select-none">
      <FloorScene
        view={[14, 4, 30, 21]}
        priority
        sitting={[
          { character: "Lucy", chair: [26, 8], name: "Olivia", status: "busy" },
          { character: "Alex", chair: [20, 11], name: "Ryan", status: "available" },
          { character: "Ash", chair: [34, 13], name: "Grace", status: "available" },
        ]}
        walking={[
          { character: "Bob", name: "Sam", status: "available", speed: 1.6, path: [[38, 19, 2], [30, 19, 1.5], [30, 22, 2], [38, 22]] },
          { character: "Molly", name: "Lily", status: "away", speed: 1.4, offset: 3, path: [[18, 15, 2.5], [25, 15, 1], [25, 17, 2], [18, 17]] },
        ]}
        standing={you ? [{ ...you, at: [33, 17] }] : []}
        className="h-full w-full"
      />
      <div className="absolute inset-0 bg-rail/65 backdrop-blur-[3px] sm:bg-rail/72" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,var(--ui-rail)_82%)]" />
    </div>
  );
}

/**
 * The top of a door's panel: the place's mark, a line above its name, a
 * sentence about it, and anything that says who is in there. An action (a
 * link to copy, say) sits opposite the name. A rule separates it from what
 * the door asks.
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
          <h1 className="break-words text-[24px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{title}</h1>
        </div>
        {action && <div className="-me-1.5 -mt-0.5 shrink-0">{action}</div>}
      </div>
      {subtitle && <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      {detail && <div className="mt-3.5">{detail}</div>}
      <div className="-mx-5 my-5 h-px bg-border sm:-mx-6" />
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
  "h-12 w-full rounded-full border border-border bg-background px-5 text-[16px] text-foreground outline-none transition-[border-color] placeholder:text-faint focus:border-foreground/25 sm:text-[15px]";
