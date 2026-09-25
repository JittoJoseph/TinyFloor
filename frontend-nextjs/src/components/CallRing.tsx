"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MessageSquare, Phone, PhoneMissed, PhoneOff, X } from "lucide-react";
import { callManager, type CallOutcome } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { SPRING_PANEL } from "@/lib/ease";
import { Face } from "@/components/ui/Face";
import { bezel, bezelPanel, onBezel } from "@/components/ui/bezel";
import { OPEN_CONVERSATION_EVENT } from "./ProximityActions";
import { cn } from "@/lib/utils";

/**
 * The ring, on both ends, in the doors' bezel: whoever is calling you, with
 * the answer set into it; the call you are making, as a pill where its strip
 * will be once they pick up; and, for a moment, how a ring ended without a
 * call. Laid over every view, so a call finds you in chat or settings too,
 * and never covers what you were doing.
 */
export function CallRing() {
  const { incoming, outgoing, outcome } = useCall();
  // Only in the browser: the portal needs the page's body.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Escape turns a ring down, as it closes anything else laid over the app.
  useEffect(() => {
    if (!incoming) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") callManager.decline();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [incoming]);

  if (!mounted) return null;
  return createPortal(
    <>
      {/* On a phone, under the floor's own chips along the top. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-16 sm:pt-4">
        <AnimatePresence mode="popLayout">
          {outgoing ? (
            <Calling key={`out-${outgoing.id}`} id={outgoing.id} name={outgoing.name} />
          ) : outcome && !incoming ? (
            <Outcome key={`${outcome.kind}-${outcome.id}`} outcome={outcome} />
          ) : null}
        </AnimatePresence>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[91] flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:bottom-auto sm:top-0 sm:pt-4">
        <AnimatePresence>{incoming && <Incoming key={`in-${incoming.id}`} id={incoming.id} name={incoming.name} />}</AnimatePresence>
      </div>
    </>,
    document.body,
  );
}

function useRise() {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 },
    transition: SPRING_PANEL,
  };
}

/** Someone calling you: who, on the bezel, and the answer in the panel. */
function Incoming({ id, name }: { id: string; name: string }) {
  const t = useTranslations("call");
  const rise = useRise();
  return (
    <motion.div
      {...rise}
      role="alertdialog"
      aria-labelledby="ring-name"
      aria-describedby="ring-what"
      className={cn(bezel, "pointer-events-auto w-full max-w-[22rem] rounded-[28px] p-1.5")}
    >
      <div className={cn(onBezel, "flex items-center gap-3.5 px-3 pb-3.5 pt-2.5")}>
        <span className="relative flex size-12 shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-ok/40 [animation-duration:1.8s] motion-reduce:hidden" />
          <Face seed={id} size={48} />
        </span>
        <div className="min-w-0 flex-1">
          <p id="ring-what" className="flex items-center gap-1.5 text-[12.5px] font-medium text-ok">
            <Phone className="size-3.5" strokeWidth={2.25} />
            {t("incoming")}
          </p>
          <p id="ring-name" className="truncate text-[20px] font-bold leading-tight tracking-[-0.02em]">
            {name}
          </p>
        </div>
      </div>
      <div className={cn(bezelPanel, "flex gap-1.5 rounded-[22px] p-1.5")}>
        <button
          type="button"
          onClick={() => callManager.decline()}
          className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-rail text-[14px] font-semibold text-foreground outline-none transition-[background-color,transform] hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98]"
        >
          <PhoneOff className="size-4" />
          {t("decline")}
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => void callManager.accept()}
          className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-ok text-[14px] font-semibold text-white outline-none transition-[background-color,transform] hover:bg-ok/90 focus-visible:ring-2 focus-visible:ring-ok/50 active:scale-[0.98]"
        >
          <Phone className="size-4" strokeWidth={2.25} />
          {t("accept")}
        </button>
      </div>
    </motion.div>
  );
}

/** The call you are making, where its strip will be once they pick up. */
function Calling({ id, name }: { id: string; name: string }) {
  const t = useTranslations("call");
  const rise = useRise();
  return (
    <motion.div {...rise} role="status" className={cn(bezel, onBezel, "pointer-events-auto flex items-center gap-3 rounded-full p-1.5")}>
      <span className="relative flex size-9 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/20 [animation-duration:1.8s] motion-reduce:hidden" />
        <Face seed={id} size={36} />
      </span>
      <div className="min-w-0 pe-1 leading-tight">
        <p className="text-[11.5px] text-muted-foreground">{t("calling")}</p>
        <p className="max-w-[11rem] truncate text-[14px] font-semibold">{name}</p>
      </div>
      <button
        type="button"
        onClick={() => callManager.cancel()}
        title={t("cancel")}
        aria-label={t("cancel")}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-destructive text-white outline-none transition-[opacity,transform] hover:opacity-90 focus-visible:ring-2 focus-visible:ring-destructive/50 active:scale-95"
      >
        <PhoneOff className="size-4" />
      </button>
    </motion.div>
  );
}

/** How a ring ended without a call; a missed one offers a message instead. */
function Outcome({ outcome }: { outcome: CallOutcome }) {
  const t = useTranslations("call");
  const tShell = useTranslations("shell");
  const rise = useRise();
  const missed = outcome.kind === "missed";
  return (
    <motion.div {...rise} role="status" className={cn(bezel, onBezel, "pointer-events-auto flex items-center gap-3 rounded-full p-1.5")}>
      <Face seed={outcome.id} size={36} />
      <div className="min-w-0 pe-1 leading-tight">
        <p className={cn("flex items-center gap-1 text-[11.5px]", missed ? "text-destructive" : "text-muted-foreground")}>
          {missed && <PhoneMissed className="size-3" />}
          {t(`outcome.${outcome.kind}`)}
        </p>
        <p className="max-w-[11rem] truncate text-[14px] font-semibold">{outcome.name}</p>
      </div>
      {missed && (
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: { id: outcome.id, name: outcome.name } }));
            callManager.dismissOutcome();
          }}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[13px] font-semibold text-background outline-none transition-[background-color,transform] hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]"
        >
          <MessageSquare className="size-3.5" />
          {tShell("message")}
        </button>
      )}
      <button
        type="button"
        onClick={() => callManager.dismissOutcome()}
        title={t("dismiss")}
        aria-label={t("dismiss")}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}
