"use client";

import { useSyncExternalStore } from "react";
import { api, type Plans } from "@/lib/api";

/**
 * Paid plans: the plan list from the API, read once and shared. Both sites
 * show it; paying for one is the app's (app-frontend/src/lib/checkout.ts).
 */

let plans: Plans | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load() {
  loading ??= api.plans().then(
    (found) => {
      plans = found;
      listeners.forEach((listener) => listener());
    },
    () => {
      loading = null; // tried again on the next look
    },
  );
}

/** The plans read so far, outside React. */
export function currentPlans(): Plans | null {
  return plans;
}

/** The plans, and whether paid plans are on here. Null until the API has answered. */
export function usePlans(): Plans | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      load();
      return () => listeners.delete(listener);
    },
    () => plans,
    () => null,
  );
}

/** $19, or $19.50 when there are cents. */
export function dollars(cents: number): string {
  return `$${cents % 100 ? (cents / 100).toFixed(2) : cents / 100}`;
}
