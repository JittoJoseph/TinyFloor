"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Search } from "lucide-react";
import { GlobeSimpleIcon } from "@phosphor-icons/react/dist/csr/GlobeSimple";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, type Locale } from "@/lib/i18n/routing";
import { getBrowserPrefs, getServerPrefs, orderLocales, subscribePrefs } from "@/lib/i18n/locale-ordering";
import { Menu, MenuItem } from "@/components/ui/Menu";

/**
 * The app's language picker, for bars like the dashboard's: a globe and the
 * language's own name, opening a menu like every other menu in the app.
 * Likely languages come first; the search matches either name or the code.
 */
export function LanguageMenu() {
  const t = useTranslations("languageSwitcher");
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const prefs = useSyncExternalStore(subscribePrefs, getBrowserPrefs, getServerPrefs);
  const ordered = useMemo(() => orderLocales(prefs.preferred, prefs.country), [prefs]);
  const current = locales.find((one) => one.code === active) ?? locales[0];

  const q = query.trim().toLowerCase();
  const shown = q
    ? ordered.filter((one) => one.label.toLowerCase().includes(q) || one.enName.toLowerCase().includes(q) || one.code.includes(q))
    : ordered;

  const pick = (code: Locale) => {
    setQuery("");
    if (code === active) return;
    // Keep the query string across the switch.
    startTransition(() => router.replace(`${pathname}${window.location.search}`, { locale: code }));
  };

  return (
    <Menu
      side="bottom"
      align="end"
      width={232}
      trigger={
        <button
          type="button"
          aria-label={t("select")}
          disabled={pending}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-60"
        >
          <GlobeSimpleIcon size={17} />
          <span className="hidden sm:inline">{current.label}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      }
    >
      <label className="mb-1 flex h-9 items-center gap-2 rounded-[10px] bg-muted px-2.5 text-muted-foreground">
        <Search className="size-3.5 shrink-0" />
        <input
          value={query}
          dir="auto"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
        />
      </label>
      <div role="listbox" aria-label={t("label")} className="-me-1 max-h-72 overflow-y-auto pe-1">
        {shown.length === 0 ? (
          <p className="px-2.5 py-5 text-center text-[12.5px] text-muted-foreground">{t("noResults")}</p>
        ) : (
          shown.map((one) => (
            <MenuItem key={one.code} checked={one.code === active} onSelect={() => pick(one.code)} hint={one.label === one.enName ? undefined : one.enName}>
              <span dir={one.dir}>{one.label}</span>
            </MenuItem>
          ))
        )}
      </div>
    </Menu>
  );
}
