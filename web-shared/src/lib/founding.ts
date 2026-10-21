/**
 * Pro's founding price (docs/pricing.md): offices that subscribe before
 * `until` pay $29 a month for as long as they stay subscribed; after it, new
 * subscriptions pay `laterPrice`. Creem keeps a subscription at the price it
 * started with, so raising the product's price on that date is all it takes.
 * The founding line shows only before then.
 */
export const FOUNDING = { until: Date.UTC(2027, 2, 1), laterPrice: 39 };

export const foundingOpen = (now = Date.now()) => now < FOUNDING.until;
