/**
 * The two plans as the pricing page and llms-full.txt describe them (prices in
 * USD a month, for the whole office; docs/pricing.md). Pro holds up to `people`, but
 * it's sold as the whole team, not a headcount.
 */
export const PLANS = [
  { key: "free", price: 0, people: 3, hours: 40 },
  { key: "pro", price: 29, people: 15, hours: 80 },
] as const;
