"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { FLOOR_ARRIVED_EVENT } from "@/lib/floor";
import { track } from "@/lib/analytics";
import { Modal } from "@/components/ui/Modal";
import { Face } from "@/components/ui/Face";
import { Button } from "@/components/motion/button/base";
import { useOffice } from "./OfficeShell";

const seenKey = (officeId: string) => `tf:welcome-seen:${officeId}`;

/** Only someone who has just joined is new here; a member of months on a new laptop isn't. */
const NEW_FOR = 3 * 24 * 60 * 60_000;

/** As many faces as fit on one line without a count of everyone. */
const FACES = 5;

function seen(officeId: string): boolean {
  try {
    return localStorage.getItem(seenKey(officeId)) === "1";
  } catch {
    return false;
  }
}

function markSeen(officeId: string) {
  try {
    localStorage.setItem(seenKey(officeId), "1");
  } catch {
    // Private mode: it may show again next time, which does no harm.
  }
}

/**
 * A welcome the first time you walk onto an office you've just joined
 * (docs/product.md): the office, who's in it, and the two things the floor is
 * for. The same words for every office, so no one has to write them. Never
 * to the owner, whose office it is.
 */
export function WelcomeNote() {
  const t = useTranslations("welcome");
  const locale = useLocale();
  const { user } = useAuth();
  const { office, overview } = useOffice();
  // When the floor showed, which is also the moment that decides whether you're new.
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const arrive = () => setArrivedAt(Date.now());
    window.addEventListener(FLOOR_ARRIVED_EVENT, arrive);
    return () => window.removeEventListener(FLOOR_ARRIVED_EVENT, arrive);
  }, []);

  const me = overview.members.find((member) => member.id === user?.id);
  const joinedNow = !!me && arrivedAt !== null && arrivedAt - me.joinedAt < NEW_FOR;
  const due = !!user && office.owner !== user.id && joinedNow && !closed && !seen(office.id);

  useEffect(() => {
    if (due) track("welcome_shown");
  }, [due]);

  if (!due) return null;

  const close = () => {
    markSeen(office.id);
    setClosed(true);
  };

  // The owner first: theirs is the face a newcomer most likely knows.
  const others = overview.members.filter((member) => member.id !== user.id);
  const team = [...others.filter((one) => one.id === office.owner), ...others.filter((one) => one.id !== office.owner)];
  const more = team.length - FACES;
  // Who they are, in the reader's own way of listing names: one in full, a few by first name.
  const named = team.slice(0, 3);
  const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(
    named.length === 1 ? [named[0].displayName] : named.map((one) => one.displayName.split(" ")[0]),
  );

  return (
    <Modal open onClose={close} label={t("title", { office: office.name })} closeLabel={t("close")}>
      <div className="px-6 pb-6 pt-7 pe-14">
        <Face seed={office.id} size={44} square />
        <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-foreground">{t("title", { office: office.name })}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{t("body")}</p>
        {team.length > 0 && (
          <div className="mt-5 flex items-center gap-3">
            <span className="flex shrink-0 items-center">
              {team.slice(0, FACES).map((one) => (
                <span key={one.id} title={one.displayName} className="-ms-1.5 rounded-full ring-2 ring-card first:ms-0">
                  <Face seed={one.id} size={30} />
                </span>
              ))}
              {more > 0 && (
                <span className="-ms-1.5 flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-muted px-1.5 text-[11.5px] font-medium text-muted-foreground ring-2 ring-card">
                  +{more}
                </span>
              )}
            </span>
            {team.length <= 3 && <span className="min-w-0 truncate text-[13px] text-muted-foreground">{names}</span>}
          </div>
        )}
        <Button size="md" className="mt-6 h-10 w-full text-[13.5px]" onClick={close}>
          {t("walkIn")}
        </Button>
      </div>
    </Modal>
  );
}
