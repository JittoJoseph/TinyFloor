"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * What a team pays as it grows: drag the team's size, and see TinyFloor's
 * one price beside what tools priced per person would come to (at $8 to $16
 * each, docs/pricing.md). The words come from the page, in its language.
 */
export function PriceSlider({
  locale,
  price,
  free,
  most,
  low,
  high,
  labels,
}: {
  locale: string;
  /** Pro's price for the whole office, a month. */
  price: number;
  /** How many people the free plan holds. */
  free: number;
  /** The most people an office holds. */
  most: number;
  /** Per-person tools' prices, a person a month. */
  low: number;
  high: number;
  labels: { team: string; people: string; ours: string; theirs: string; month: string; freeNote: string };
}) {
  const [size, setSize] = useState(10);
  const id = useId();
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const ours = size <= free ? 0 : price;
  const share = ((size - 2) / (most - 2)) * 100;

  return (
    <div className="font-(family-name:--font-app)">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[13.5px] text-muted-foreground">
          {labels.team}
        </label>
        <span className="text-[15px] font-medium tabular-nums">{labels.people.replace("{count}", String(size))}</span>
      </div>
      <input
        id={id}
        type="range"
        min={2}
        max={most}
        value={size}
        onChange={(event) => setSize(Number(event.target.value))}
        className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-foreground [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-[0_0_0_6px_rgb(255_255_255/0.08)]"
        style={{ background: `linear-gradient(to right, var(--color-foreground) ${share}%, color-mix(in oklab, var(--color-foreground) 12%, transparent) ${share}%)` }}
      />
      <dl className="mt-10 border-t border-border">
        <div className="flex items-end justify-between gap-6 border-b border-border py-6">
          <dt>
            <span className="block text-[14px] font-medium text-foreground">{labels.ours}</span>
            <span className={cn("mt-1 block text-[12.5px] text-muted-foreground", size > free && "invisible")}>{labels.freeNote}</span>
          </dt>
          <dd className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-[48px] font-normal leading-none tracking-[-0.045em] tabular-nums sm:text-[64px]">{money.format(ours)}</span>
            <span className="text-[13px] text-muted-foreground">{labels.month}</span>
          </dd>
        </div>
        <div className="flex items-end justify-between gap-6 py-6 text-muted-foreground">
          <dt className="max-w-[16rem] text-[13.5px] leading-snug">{labels.theirs.replace("{low}", money.format(low)).replace("{high}", money.format(high))}</dt>
          <dd className="flex shrink-0 items-baseline gap-1.5">
            <span className="whitespace-nowrap text-[26px] font-normal leading-none tracking-[-0.03em] tabular-nums sm:text-[32px]">
              {money.format(size * low)}–{money.format(size * high)}
            </span>
            <span className="text-[13px]">{labels.month}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
