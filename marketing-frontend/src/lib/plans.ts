/** The three plans as the pricing page and llms-full.txt describe them (prices in USD a month, for the whole office). */
export const PLANS = [
  { key: "free", price: 0, people: 3, hours: 5, hd: false },
  { key: "plus", price: 19, people: 10, hours: 30, hd: false },
  { key: "pro", price: 49, people: 25, hours: 60, hd: true },
] as const;
