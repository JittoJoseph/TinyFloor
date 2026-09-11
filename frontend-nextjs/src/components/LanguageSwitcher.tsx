"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Search } from "lucide-react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, type Locale } from "@/lib/i18n/routing";
import {
  getBrowserPrefs,
  getServerPrefs,
  orderLocales,
  subscribePrefs,
} from "@/lib/i18n/locale-ordering";

/**
 * Switches locale while staying on the current page. The next-intl router
 * writes the locale cookie, so the choice sticks across visits. Likely
 * languages (browser, then country) are listed first, and the search matches
 * the autonym, the English name or the code.
 */
export function LanguageSwitcher({
  side = "top",
  align = "start",
  compact = false,
}: {
  side?: "top" | "bottom";
  align?: "start" | "end";
  compact?: boolean;
}) {
  const t = useTranslations("languageSwitcher");
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const prefs = useSyncExternalStore(
    subscribePrefs,
    getBrowserPrefs,
    getServerPrefs,
  );

  const ordered = useMemo(
    () => orderLocales(prefs.preferred, prefs.country),
    [prefs],
  );
  const active = locales.find((l) => l.code === activeLocale) ?? locales[0];

  const q = query.trim().toLowerCase();
  const results = q
    ? ordered.filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          l.enName.toLowerCase().includes(q) ||
          l.code.includes(q),
      )
    : ordered;

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    const dismiss = () => {
      setOpen(false);
      setQuery("");
    };
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (code: Locale) => {
    setOpen(false);
    setQuery("");
    if (code === activeLocale) return;
    startTransition(() => {
      // Keep the query string (e.g. `/join?roomId=…`) across the switch.
      router.replace(`${pathname}${window.location.search}`, { locale: code });
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("select")}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isPending}
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3.5 font-body text-[13px] font-medium text-[var(--color-braun-text)] hover:bg-white transition-colors duration-200 disabled:opacity-60"
      >
        <span aria-hidden="true" className="text-base leading-none">
          {active.flag}
        </span>
        {compact ? <span className="uppercase">{active.code}</span> : active.label}
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`entry-rise absolute z-50 w-56 flex max-h-80 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-[var(--color-braun-text)] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)] ${
            side === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "start" ? "start-0" : "end-0"}`}
        >
          <div className="flex items-center gap-2 border-b border-black/8 px-3">
            <Search aria-hidden="true" className="w-4 h-4 shrink-0 opacity-40" />
            <input
              ref={searchRef}
              type="text"
              dir="auto"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0]) {
                  event.preventDefault();
                  select(results[0].code);
                }
              }}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="h-10 w-full bg-transparent font-body text-sm outline-none placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
            />
          </div>

          <div role="listbox" aria-label={t("label")} className="overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center font-body text-sm opacity-50">
                {t("noResults")}
              </p>
            ) : (
              results.map((l) => {
                const selected = l.code === activeLocale;
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    dir={l.dir}
                    onClick={() => select(l.code)}
                    className={`cursor-pointer flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start font-body text-sm transition-colors duration-[120ms] ${
                      selected
                        ? "bg-[var(--color-braun-orange)]/10 font-semibold text-[var(--color-braun-orange)]"
                        : "hover:bg-black/[0.04]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className="text-base leading-none">
                        {l.flag}
                      </span>
                      <span className="truncate">{l.label}</span>
                    </span>
                    {selected && <Check aria-hidden="true" className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
