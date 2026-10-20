import { useTranslations } from "next-intl";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import type { Locale } from "@/lib/i18n/routing";
import { ArrowRight } from "@/components/ui/icons";
import { TOOLS_PATH, toolsIn } from "@/lib/tools/catalog";
import { FEW_TOOL_NAMES, TOOLS_HUB } from "@/lib/tools/hub-copy";

/** The footer's names for the tools written in every language. */
const EVERYWHERE: Record<string, "icebreakers" | "officeCosts" | "timeZones"> = {
  "/tools/icebreaker-questions": "icebreakers",
  "/tools/virtual-office-cost-calculator": "officeCosts",
  "/tools/time-zone-meeting-planner": "timeZones",
};

/**
 * At the end of a free tool's page: the other tools written in its language,
 * under a heading that leads to the index of all of them.
 */
export function RelatedTools({ locale, path }: { locale: string; path: string }) {
  const t = useTranslations("home.footer");
  const few = FEW_TOOL_NAMES[locale as Locale] ?? {};
  const others = toolsIn(locale)
    .filter((tool) => tool.path !== path)
    .map((tool) => ({ path: tool.path, name: EVERYWHERE[tool.path] ? t(EVERYWHERE[tool.path]) : few[tool.path] }))
    .filter((tool) => tool.name);
  if (!others.length) return null;

  return (
    <nav aria-label={t("tools")} className="mt-12">
      <h2>
        <Link href={TOOLS_PATH} className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          {TOOLS_HUB[locale as Locale]?.label ?? t("tools")}
          <ArrowRight className="size-3 rtl:rotate-180" />
        </Link>
      </h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {others.map((tool) => (
          <li key={tool.path}>
            <Link href={tool.path} className="group flex items-center justify-between gap-3 rounded-2xl bg-muted/80 px-4 py-3 text-[15px] transition-colors hover:bg-muted">
              {tool.name}
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
