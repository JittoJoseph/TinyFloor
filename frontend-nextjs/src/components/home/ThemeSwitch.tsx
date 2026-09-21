"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { setTheme, useTheme, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const CHOICES: Array<{ value: ThemeChoice; icon: typeof Sun }> = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

/** System, light or dark: the same choice the app keeps, from the footer. */
export function ThemeSwitch({ label, names }: { label: string; names: Record<ThemeChoice, string> }) {
  const theme = useTheme();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-border bg-card p-0.5">
      {CHOICES.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={names[value]}
          title={names[value]}
          onClick={() => setTheme(value)}
          className={cn(
            "flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors",
            theme === value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
