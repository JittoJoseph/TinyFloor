"use client";

import { useState } from "react";
import { cn } from "web-shared/lib/utils";

/**
 * The blog index's categories as a row of choices: picking one hides the
 * posts outside it, in the list whose id is `list` (each post carries its
 * category as data-category). Every post stays in the page for anyone without
 * script, and for search engines.
 */
export function CategoryFilter({ list, all, categories }: { list: string; all: string; categories: Array<{ key: string; label: string }> }) {
  const [current, setCurrent] = useState<string | null>(null);
  const pick = (key: string | null) => {
    setCurrent(key);
    document.querySelectorAll<HTMLElement>(`#${list} > [data-category]`).forEach((item) => {
      item.hidden = !!key && item.dataset.category !== key;
    });
  };
  const chip = (key: string | null, label: string) => (
    <button
      key={key ?? "all"}
      type="button"
      aria-pressed={current === key}
      onClick={() => pick(key)}
      className={cn(
        "h-9 rounded-full px-4 text-[14px] font-medium transition-colors",
        current === key ? "bg-foreground text-background" : "bg-foreground/[0.06] text-foreground/75 hover:bg-foreground/[0.1] hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
  return (
    <div role="group" className="flex flex-wrap justify-center gap-2">
      {chip(null, all)}
      {categories.map(({ key, label }) => chip(key, label))}
    </div>
  );
}
