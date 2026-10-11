/**
 * The two plans as the pricing page and llms-full.txt describe them (prices in
 * USD a month, for the whole office; docs/23). Pro holds up to `people`, but
 * it's sold as the whole team, not a headcount.
 */
export const PLANS = [
  { key: "free", price: 0, people: 3, hours: 5 },
  { key: "pro", price: 29, people: 25, hours: 60 },
] as const;
