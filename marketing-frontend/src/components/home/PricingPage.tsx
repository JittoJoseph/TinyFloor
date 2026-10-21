import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CalendarOff, Check, CreditCard, Lock, Minus, Refund, UserPlus, Users } from "@/components/ui/icons";
import { foundingOpen } from "@/lib/founding";
import { SUPPORT_EMAIL } from "@/components/legal/LegalPage";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { CJK_HEADLINE, COLUMN, Closing, EYEBROW, Heading, LEAD, MarketingShell, Notes, PlanCards, Questions, STAGE, quiet } from "./Blocks";

/**
 * The pricing page (docs/pricing.md): Free and Pro up top, then three things
 * that each take one look. What ten people pay against a per-seat tool, one
 * table of what each plan gives, and the billing answers as short notes, then
 * the questions buyers ask, said plainly. The plans carry the page.
 */
export function PricingPage() {
  const t = useTranslations("pricingPage");
  const tp = useTranslations("homepage.pricing");
  const tl = useTranslations("landings");
  const tq = useTranslations("pricingFaq");
  return (
    <MarketingShell path="/pricing" oneTap>
      <section className={cn(COLUMN, "pb-24 pt-32 sm:pb-36 sm:pt-44")}>
        <div className="flex flex-col items-center text-center">
          <p className={cn(EYEBROW, "mb-6")}>{tp("eyebrow")}</p>
          <h1
            className={cn(
              "max-w-[16ch] text-balance text-[40px] font-normal leading-[1.04] tracking-[-0.045em] min-[400px]:text-[44px] sm:text-[64px] lg:text-[72px]",
              CJK_HEADLINE,
            )}
          >
            {t("title")}
            <span className="block text-foreground/55">{t("muted")}</span>
          </h1>
          <p className={cn(LEAD, "mt-7 max-w-[32rem] text-balance")}>{t("body")}</p>
        </div>
        <PlanCards className="mt-14 sm:mt-20" />
      </section>

      <SeatCompare />
      <PlanTable />

      <section className={cn(COLUMN, "pb-28 sm:pb-40")}>
        <Heading title={t("notes.title")} />
        <Notes
          className="mt-14 sm:mt-20"
          items={(
            [
              { key: "cancel", icon: <CalendarOff /> },
              { key: "refund", icon: <Refund /> },
              { key: "change", icon: <UserPlus /> },
              { key: "founding", icon: <Lock /> },
              { key: "size", icon: <Users /> },
              { key: "tax", icon: <CreditCard /> },
            ] as const
          )
            .filter((one) => one.key !== "founding" || foundingOpen())
            .map((one) => ({
            icon: one.icon,
            title: t(`notes.${one.key}.title`),
            body: t(`notes.${one.key}.body`, { email: SUPPORT_EMAIL }),
          }))}
        />
      </section>

      <Questions items={tq.raw("items") as Array<{ q: string; a: string }>} title={tl.rich("faqTitle", { em: quiet })} />

      <Closing />
    </MarketingShell>
  );
}

/**
 * What a team of ten pays in a month, as three bars on the bezel's black:
 * per-seat tools at the low and high end of what they charge, then Pro.
 */
function SeatCompare() {
  const t = useTranslations("pricingPage.seats");
  const rows = [
    { label: t("perSeat", { price: "$8" }), total: 80 },
    { label: t("perSeat", { price: "$16" }), total: 160 },
    { label: t("ours"), total: PLANS[PLANS.length - 1].price, ours: true },
  ];
  const most = Math.max(...rows.map((row) => row.total));
  return (
    <section className="sm:px-4">
      <div className={cn(STAGE, "py-16 sm:rounded-[44px] sm:py-28")}>
        <div className={COLUMN}>
          <Heading title={t("title")} muted={t("muted")} body={t("body")} />
          <div className="mx-auto mt-12 grid max-w-[720px] gap-7 sm:mt-16">
            {rows.map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className={cn("text-[14.5px]", row.ours ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {row.label}
                  </span>
                  <span className={cn("text-[22px] font-semibold tabular-nums tracking-[-0.03em]", !row.ours && "text-muted-foreground")}>
                    ${row.total}
                  </span>
                </div>
                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={cn("h-full rounded-full", row.ours ? "bg-white" : "bg-white/25")}
                    style={{ width: `${Math.max((row.total / most) * 100, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Both plans side by side: what differs first (people, help), with no meters,
 * then what both have, as a column of ticks. On a phone the plan columns stay
 * narrow so the whole table fits without scrolling sideways.
 */
function PlanTable() {
  const t = useTranslations("pricingPage.table");
  const tp = useTranslations("homepage.pricing");
  const tm = useTranslations("homepage.more.items");
  const th = useTranslations("home.preview");
  const tick = <Check className="mx-auto size-[18px] text-foreground" />;
  const none = <Minus className="mx-auto size-[18px] text-muted-foreground" />;
  const rows: Array<{ label: string; note?: string; cells: ReactNode[] }> = [
    { label: t("meetings"), cells: PLANS.map(() => tick) },
    { label: t("support"), cells: PLANS.map((plan) => (plan.price ? tick : none)) },
    { label: t("people"), cells: PLANS.map((plan) => (plan.price ? t("wholeTeam") : plan.people)) },
    { label: t("calls"), note: t("callsNote"), cells: PLANS.map(() => tick) },
    ...(["chat", "screen", "whiteboard", "music", "noise"] as const).map((key) => ({
      label: tm(`${key}.title`),
      cells: PLANS.map(() => tick),
    })),
    { label: th("inviteLink"), cells: PLANS.map(() => tick) },
  ];
  const grid =
    "grid grid-cols-[minmax(0,1fr)_repeat(2,4.5rem)] items-center gap-x-1.5 min-[400px]:grid-cols-[minmax(0,1fr)_repeat(2,5.5rem)] sm:gap-x-2 sm:grid-cols-[minmax(0,1fr)_repeat(2,9.5rem)]";

  return (
    <section className={cn(COLUMN, "py-28 sm:py-40")}>
      <Heading title={t("title")} muted={t("muted")} />
      <div className="mx-auto mt-12 max-w-[820px] sm:mt-16">
        <div className={cn(grid, "pb-4")}>
          <span />
          {PLANS.map((plan) => (
            <div key={plan.key} className="text-center">
              <p className="text-[14px] font-semibold sm:text-[15px]">{tp(`${plan.key}.name`)}</p>
              <p className="mt-0.5 text-[12.5px] tabular-nums text-muted-foreground sm:text-[13.5px]">${plan.price}</p>
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.label} className={cn(grid, "border-t border-border/70 py-4")}>
            <div className="min-w-0">
              <p className="text-[14.5px] leading-snug sm:text-[15.5px]">{row.label}</p>
              {row.note && <p className="mt-0.5 text-[12.5px] text-muted-foreground sm:text-[13px]">{row.note}</p>}
            </div>
            {row.cells.map((cell, i) => (
              <div key={i} className="text-center text-[16px] font-medium tabular-nums sm:text-[17px]">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
