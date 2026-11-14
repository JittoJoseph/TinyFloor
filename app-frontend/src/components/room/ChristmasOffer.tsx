"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useTranslations } from "next-intl";
import { PixelAvatar } from "web-shared/components/PixelAvatar";
import { track } from "web-shared/lib/analytics";
import { Button } from "@/components/motion/button/base";
import { Kbd } from "@/components/ui/IconButton";
import { useAuth } from "@/contexts/AuthContext";
import { isChristmas, useByPresents, wearsChristmasHat, withChristmasHat } from "@/lib/christmas";
import { EASE_OUT } from "@/lib/ease";
import { changeLookOnFloor } from "@/lib/floor";
import { saveIdentity } from "@/lib/identity";
import { touchFirst } from "@/lib/touch";
import { typingElsewhere } from "@/lib/typing";

/** How far down a swipe has to go, or how fast, to put the card away. */
const SWIPE_AWAY = 48;
/** How long "Merry Christmas" stays once the hat is on. */
const THANKS_MS = 1800;

/**
 * Standing by the presents at Christmas (lib/ChristmasPresents), the hat in
 * them, offered once: you as you'd look in it, "Wear it" (or E), "Not now".
 * Above the dock like the floor's other prompt; on a phone a bar across the
 * bottom that a swipe down puts away. Put away, it stays away until you walk
 * off and come back. Once it's on, the hat is yours like any other: the
 * creator takes it off.
 */
export function ChristmasOffer({ onShown }: { onShown: (shown: boolean) => void }) {
  const t = useTranslations("christmas");
  const reduce = useReducedMotion();
  const { user, updateProfile } = useAuth();
  const visit = useByPresents();
  const [dismissed, setDismissed] = useState(0);
  const [state, setState] = useState<"offer" | "busy" | "thanks">("offer");

  const character = user?.character ?? "";
  const shown = !!user && isChristmas() && ((visit > 0 && visit !== dismissed && !wearsChristmasHat(character)) || state === "thanks");
  useEffect(() => onShown(shown), [shown, onShown]);

  const wear = useCallback(async () => {
    if (!user || state !== "offer") return;
    const next = withChristmasHat(user.character);
    setState("busy");
    try {
      await updateProfile({ character: next });
      saveIdentity({ name: user.displayName, character: next });
      changeLookOnFloor(next);
      track("christmas_hat_worn");
      setState("thanks");
      setTimeout(() => setState("offer"), THANKS_MS);
    } catch {
      setState("offer");
    }
  }, [user, state, updateProfile]);

  // E wears it, as E does whatever is at hand on the floor.
  useEffect(() => {
    if (!shown || state !== "offer") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "e" || event.repeat || typingElsewhere()) return;
      event.preventDefault();
      void wear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, state, wear]);

  const phone = touchFirst();
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > SWIPE_AWAY || info.velocity.y > 500) setDismissed(visit);
  };

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key="christmas"
          role="dialog"
          aria-label={t("title")}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          drag={phone ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={onDragEnd}
          className="pointer-events-auto relative w-full max-w-[22rem] touch-pan-x overflow-hidden rounded-2xl border border-border bg-card/95 shadow-float backdrop-blur-md sm:w-auto"
        >
          {phone && <span aria-hidden className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-border" />}
          <div className="flex items-center gap-3.5 p-3 pt-4 sm:pt-3">
            {/* You, in it: the floor's own pixels at twice their size. */}
            <span className="relative h-[72px] w-16 shrink-0 overflow-hidden rounded-xl bg-[color-mix(in_oklab,var(--ui-muted)_70%,#e63f38_10%)]">
              <PixelAvatar character={withChristmasHat(character)} direction="down" width={64} style={{ left: "50%", top: 104 }} />
            </span>
            <div className="min-w-0 flex-1">
              {state === "thanks" ? (
                <p className="text-[14px] font-semibold text-foreground">{t("thanks")}</p>
              ) : (
                <>
                  <p className="text-[14px] font-semibold text-foreground">{t("title")}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{t("body")}</p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <Button size="sm" onClick={() => void wear()} disabled={state === "busy"} className={phone ? "h-10 flex-1" : undefined}>
                      {t("wear")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDismissed(visit)} className={phone ? "h-10" : undefined}>
                      {t("notNow")}
                    </Button>
                    {!phone && <Kbd>E</Kbd>}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
