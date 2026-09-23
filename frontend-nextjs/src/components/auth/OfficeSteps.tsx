"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Where making an office goes: a name, an account, then the floor, with the step they're on marked. */
export function OfficeSteps({ at, className }: { at: 0 | 1; className?: string }) {
  const t = useTranslations("create");
  const steps = t.raw("steps") as string[];
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12px] font-medium text-muted-foreground", className)}>
      {steps.map((step, index) => (
        <li key={step} aria-current={index === at ? "step" : undefined} className="flex items-center gap-1.5 aria-[current]:text-foreground">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[11px]",
              index === at ? "bg-foreground text-background" : index < at ? "bg-foreground/15 text-foreground" : "bg-muted",
            )}
          >
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}
