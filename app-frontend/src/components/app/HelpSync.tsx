"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { help, SUPPORT_CHANNEL } from "@/lib/help";
import { usePlace } from "./place";

const BACKGROUND_EVERY_MS = 120_000;

/**
 * The conversation with the TinyFloor team, kept up to date wherever you are
 * in a place: read as you walk in, now and then, and on coming back to the
 * tab, for the count on Chat. It also gives the rail's "?" its way there:
 * the conversation, in Chat.
 */
export function HelpSync() {
  const router = useRouter();
  const place = usePlace();
  const office = place.kind === "office" ? place.id : undefined;
  const conversation = place.paths.chat(SUPPORT_CHANNEL);

  useEffect(() => help.attach(office), [office]);
  useEffect(() => help.goToTicket(() => router.push(conversation)), [router, conversation]);

  // Now and then, and on coming back to the tab, only while it's in view.
  useEffect(() => {
    const look = () => document.visibilityState === "visible" && void help.refresh();
    const timer = setInterval(look, BACKGROUND_EVERY_MS);
    document.addEventListener("visibilitychange", look);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", look);
    };
  }, []);

  return null;
}
