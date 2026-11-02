/**
 * The two plans as the pricing page and llms-full.txt describe them (prices in
 * USD a month, for the whole office; docs/pricing.md). Pro holds up to `people`, but
 * it's sold as the whole team, not a headcount. `history` is the days back the
 * office's chat reads; Pro's is all of it.
 */
export const PLANS = [
  { key: "free", price: 0, people: 3, hours: 40, history: 90 },
  { key: "pro", price: 29, people: 15, hours: 80, history: null },
] as const;
