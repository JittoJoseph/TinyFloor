"use client";

import { api } from "@/lib/api";

/**
 * Paying for a plan: Creem's checkout over the page, loaded only when someone
 * opens it. The office's plan changes on the server, from Creem's webhook or
 * its record of the checkout; the app only waits for it.
 */

/** Creem's checkout languages, from ours; the ones it doesn't speak (Arabic, Hebrew) open in English. */
const CHECKOUT_LOCALES: Record<string, string> = { no: "nb", zh: "zh-CN" };

/**
 * Opens Creem's checkout over the page for a checkout the API made.
 * Resolves true once it's paid for, false if it was closed first.
 */
export async function openCheckout(options: { url: string; locale: string; dark: boolean }): Promise<boolean> {
  const { openCheckout: open } = await import("@creem_io/embed");
  return new Promise((resolve) => {
    let settled = false;
    const handle = open({
      checkoutUrl: options.url,
      theme: options.dark ? "dark" : "light",
      locale: CHECKOUT_LOCALES[options.locale] ?? options.locale,
      onComplete: () => {
        if (settled) return;
        settled = true;
        resolve(true);
        // Long enough to see it went through, then back to the page (closing
        // also stops Creem's own redirect).
        setTimeout(() => handle.close(), 1500);
      },
      onClose: () => {
        if (settled) return;
        settled = true;
        resolve(false);
      },
    });
  });
}

/**
 * After paying: Creem creates the subscription a moment after the checkout
 * completes, so the API is asked to fetch it from that checkout until it has
 * (or the webhook got there first), for up to half a minute.
 */
export async function waitForPlan(officeId: string, checkoutId: string, has: (plan: string) => boolean): Promise<boolean> {
  for (let tries = 0; tries < 15; tries++) {
    const billing = await api.syncCheckout(officeId, checkoutId).catch(() => null);
    if (billing && has(billing.plan)) return true;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

/**
 * Creem's customer portal, where the payer changes the card and downloads
 * invoices, in a new tab. The tab opens before asking, so the browser treats
 * it as the click's own.
 */
export async function openPortal(officeId: string): Promise<void> {
  const tab = window.open("about:blank", "_blank");
  try {
    const { url } = await api.billingPortal(officeId);
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else window.location.href = url;
  } catch (problem) {
    tab?.close();
    throw problem;
  }
}
