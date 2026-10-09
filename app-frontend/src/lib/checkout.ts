"use client";

import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";
import { api, type Plans } from "@/lib/api";
import { currentPlans } from "@/lib/billing";

/**
 * Paying for a plan: Paddle's checkout overlay, loaded only when someone opens
 * it. The office's plan changes on the server, from Paddle's webhook; the app
 * only waits for it.
 */

/** Paddle Checkout's languages, from ours; anything it doesn't speak opens in English. */
const CHECKOUT_LOCALES: Record<string, string> = {
  ar: "ar", da: "da", de: "de", en: "en", es: "es", fr: "fr", it: "it", ja: "ja", ko: "ko",
  nl: "nl", no: "no", pl: "pl", pt: "pt", ru: "ru", sv: "sv", zh: "zh-Hans",
};

let paddle: Promise<Paddle | undefined> | null = null;
/** Whoever opened the checkout that is showing, told when it's paid for or closed. */
let onEvent: ((event: PaddleEventData) => void) | null = null;

function paddleFor(billing: NonNullable<Plans["billing"]>) {
  paddle ??= initializePaddle({
    environment: billing.environment,
    token: billing.clientToken,
    eventCallback: (event) => onEvent?.(event),
  });
  return paddle;
}

/**
 * Opens Paddle's checkout over the page for a transaction the API made.
 * Resolves true once it's paid for, false if it was closed first.
 */
export async function openCheckout(options: {
  transactionId: string;
  email: string | null;
  locale: string;
  dark: boolean;
}): Promise<boolean> {
  const billing = currentPlans()?.billing;
  if (!billing) return false;
  const instance = await paddleFor(billing);
  if (!instance) throw new Error("Paddle didn't load");
  return new Promise((resolve) => {
    onEvent = (event) => {
      if (event.name === "checkout.completed") {
        onEvent = null;
        resolve(true);
        // Long enough to see it went through, then back to the page.
        setTimeout(() => instance.Checkout.close(), 1500);
      } else if (event.name === "checkout.closed") {
        onEvent = null;
        resolve(false);
      }
    };
    instance.Checkout.open({
      transactionId: options.transactionId,
      ...(options.email ? { customer: { email: options.email } } : {}),
      settings: {
        displayMode: "overlay",
        theme: options.dark ? "dark" : "light",
        locale: CHECKOUT_LOCALES[options.locale] ?? "en",
        allowLogout: false,
      },
    });
  });
}

/**
 * After paying: Paddle creates the subscription a moment after the checkout
 * completes, so the API is asked to fetch it from that checkout until it has
 * (or the webhook got there first), for up to half a minute.
 */
export async function waitForPlan(officeId: string, transactionId: string, has: (plan: string) => boolean): Promise<boolean> {
  for (let tries = 0; tries < 15; tries++) {
    const billing = await api.syncCheckout(officeId, transactionId).catch(() => null);
    if (billing && has(billing.plan)) return true;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}
