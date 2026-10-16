"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { costsFor, usd, type Billing, type OfficeCostsContent } from "@/lib/tools/office-costs";

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

const MIN = 2;
const MAX = 50;

/**
 * A team size and a billing period in, every product's monthly price out,
 * cheapest first, with whether its free plan fits. Starts at 8 people billed
 * yearly, so the page rendered on the server already shows real prices.
 */
export function OfficeCostCalculator({ locale, labels }: { locale: string; labels: OfficeCostsContent["calculator"] }) {
  const [people, setPeople] = useState(8);
  const [billing, setBilling] = useState<Billing>("yearly");
  const rows = costsFor(people, billing);

  const perPerson = rows.filter(({ product, cost }) => cost && (product.basis === "member" || product.basis === "activeMember"));
  const amounts = perPerson.map(({ cost }) => cost!.amount);
  const tinyfloor = rows.find(({ product }) => product.key === "tinyfloor")!;
  const tinyfloorPrice =
    tinyfloor.cost && fill(labels.perMonth, { amount: usd(people <= tinyfloor.product.free!.upTo ? 0 : tinyfloor.cost.amount, locale) });

  return (
    <div className="rounded-[28px] bg-muted/80 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <label className="grid min-w-[14rem] flex-1 gap-3">
          <span className="text-[13.5px] font-medium text-muted-foreground">{labels.people}</span>
          <span className="text-[30px] font-normal leading-none tracking-[-0.03em] tabular-nums sm:text-[36px]">
            {fill(labels.count, { count: people })}
          </span>
          <input
            type="range"
            min={MIN}
            max={MAX}
            value={people}
            onChange={(event) => setPeople(Number(event.target.value))}
            className="w-full cursor-pointer accent-foreground"
          />
        </label>
        <div role="group" className="flex gap-2">
          {(["yearly", "monthly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={billing === option}
              onClick={() => setBilling(option)}
              className={cn(
                "h-9 cursor-pointer rounded-full px-3.5 text-[13.5px] font-medium transition-colors",
                billing === option ? "bg-foreground text-background" : "bg-background/70 text-muted-foreground hover:text-foreground",
              )}
            >
              {labels.billing[option]}
            </button>
          ))}
        </div>
      </div>

      {amounts.length > 0 && (
        <p aria-live="polite" className="mt-6 text-pretty text-[15.5px] leading-[1.65] text-foreground/80">
          {fill(tinyfloorPrice ? labels.summary : labels.summaryLarge, {
            count: people,
            low: usd(Math.min(...amounts), locale),
            high: usd(Math.max(...amounts), locale),
            tinyfloor: tinyfloorPrice || "",
          })}
        </p>
      )}

      <ol className="mt-6 grid gap-2">
        {rows.map(({ product, cost }) => {
          const freeFits = product.free && people <= product.free.upTo;
          return (
            <li
              key={product.key}
              className={cn(
                "grid gap-x-6 gap-y-2 rounded-[18px] bg-background/80 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:p-5",
                !cost && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <p className="text-[16px] font-semibold tracking-[-0.01em]">
                  {product.name}
                  {product.plan !== product.name && (
                    <span className="font-normal text-muted-foreground"> {cost?.plan ?? product.plan}</span>
                  )}
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {labels.basis[product.basis]} ·{" "}
                  <a href={product.pricing} target="_blank" rel="noopener nofollow" className="underline-offset-2 hover:underline">
                    {labels.pricingPage}
                  </a>
                </p>
              </div>

              <div className="text-[13.5px] leading-[1.45]">
                <span className="text-muted-foreground sm:hidden">{labels.free}: </span>
                {product.free ? (
                  <span className={freeFits ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {freeFits && `${labels.fits} · `}
                    {fill(labels.upTo, { count: product.free.upTo })} · {labels.limits[product.free.limit]}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{labels.noFree}</span>
                )}
              </div>

              <div className="sm:text-end">
                {cost ? (
                  <>
                    <p className="text-[17px] font-semibold tabular-nums tracking-[-0.01em]">
                      {fill(labels.perMonth, { amount: usd(cost.amount, locale) })}
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      {cost.billed === billing
                        ? fill(labels.perYear, { amount: usd(cost.amount * 12, locale) })
                        : labels.only[cost.billed]}
                    </p>
                  </>
                ) : (
                  <p className="text-[13.5px] text-muted-foreground">{fill(labels.upTo, { count: product.maxPeople! })}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
