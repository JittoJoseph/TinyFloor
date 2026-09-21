import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One quiet line wherever the free plan's three seats come up: more is on the
 * way. No price and no date, so nothing here goes stale.
 */
export function PlansSoon({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <p className={cn("flex items-center gap-1.5 text-[12px] text-muted-foreground", className)}>
      <Sparkles className="size-3.5 shrink-0 text-brand" />
      {t("plansSoon")}
    </p>
  );
}
