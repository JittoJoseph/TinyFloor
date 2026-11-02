"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Face } from "@/components/ui/Face";

/** What stands in for the messages held back: a few lines in their shape, too blurred to read. Never the real ones. */
const SHAPES = [
  { seed: "held-a", name: "Alex Morgan", lines: ["Pushed the new build, can someone take a look before standup?"] },
  { seed: "held-b", name: "Sam Rivera", lines: ["On it. Two small things in the settings page,", "otherwise good to go"] },
  { seed: "held-c", name: "Jordan Lee", lines: ["Thanks, merging after lunch"] },
];

/**
 * The top of a conversation whose older messages the office's plan doesn't
 * show (chat.ts history): their shape, blurred, and what brings them back.
 * The messages themselves are never sent here.
 */
export function Held({ days, href }: { days: number; href: string }) {
  const t = useTranslations("chat");
  return (
    <div className="relative px-5 pt-6 sm:px-6">
      <div aria-hidden className="pointer-events-none select-none space-y-4 opacity-70 blur-[5px]">
        {SHAPES.map((shape) => (
          <div key={shape.seed} className="flex gap-3">
            <Face seed={shape.seed} size={36} />
            <div className="min-w-0 text-[14px] leading-[1.45]">
              <p className="font-medium text-foreground">{shape.name}</p>
              {shape.lines.map((line) => (
                <p key={line} className="text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[14px] font-medium text-foreground">{t("heldTitle", { days })}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{t("heldBody")}</p>
        <Link
          href={href}
          className="mt-3 inline-flex h-8 items-center rounded-full bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          {t("heldAction")}
        </Link>
      </div>
    </div>
  );
}
