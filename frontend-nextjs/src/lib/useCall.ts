"use client";

import { useSyncExternalStore } from "react";
import { callManager, CallSnapshot } from "./CallManager";

export function useCall(): CallSnapshot {
  return useSyncExternalStore(
    callManager.subscribe,
    callManager.getSnapshot,
    callManager.getSnapshot,
  );
}
