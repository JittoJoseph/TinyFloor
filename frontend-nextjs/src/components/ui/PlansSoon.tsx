import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * One quiet line wherever the free plan's three seats come up: more is on the
 * way. No price and no date, so nothing here goes stale.
 */
export function PlansSoon({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <p className={cn("flex items-center gap-1.5 text-[12px] text-muted-foreground", className)}>
      {t("plansSoon")}
    </p>
  );
}
