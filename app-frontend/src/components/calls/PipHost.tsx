"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { pip } from "@/lib/pip";
import { useCall } from "@/lib/useCall";
import { CallWindow } from "./CallWindow";

/**
 * The small window that stays on top while you're on a call (lib/pip): drawn
 * into it from here, so it has the page's language and everything else. While
 * a call or a meeting is on, leaving the tab opens it by itself, where the
 * browser allows (Chrome's automatic picture-in-picture for calls), and coming
 * back closes it again; the call ending closes it either way.
 */
export function PipHost() {
  const container = useSyncExternalStore(pip.subscribe, pip.getSnapshot, pip.getServerSnapshot);
  const { meeting, peers } = useCall();
  const onCall = !!meeting || peers.length > 0;

  useEffect(() => {
    if (!onCall || !pip.supported || !("mediaSession" in navigator)) return;
    const action = "enterpictureinpicture" as MediaSessionAction;
    try {
      navigator.mediaSession.setActionHandler(action, () => void pip.open(true));
    } catch {
      // This browser doesn't open it by itself: the button still does.
      return;
    }
    return () => {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // Already gone.
      }
    };
  }, [onCall]);

  useEffect(() => {
    if (!onCall) pip.close();
  }, [onCall]);

  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible") pip.returned();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, []);

  return container ? createPortal(<CallWindow variant="window" />, container) : null;
}
