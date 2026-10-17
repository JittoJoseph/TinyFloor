"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { FLOOR_ARRIVED_EVENT } from "@/lib/floor";
import { track } from "@/lib/analytics";
import { Modal } from "@/components/ui/Modal";
import { Face } from "@/components/ui/Face";
import { Button } from "@/components/motion/button/base";
import { useOffice } from "./OfficeShell";

const seenKey = (officeId: string) => `tf:welcome-seen:${officeId}`;

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
 * The office's welcome note, the first time you walk onto its floor
 * (docs/product.md): a few words from an admin, signed with their face and
 * name, over the floor once it has loaded. Shown once per office, and never
 * to the admin who wrote it. Belonging is what remote newcomers most often
 * miss, and it starts with someone saying hello.
 */
export function WelcomeNote() {
  const t = useTranslations("welcome");
  const { user } = useAuth();
  const { office } = useOffice();
  const welcome = office.welcome;
  const [arrived, setArrived] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const arrive = () => setArrived(true);
    window.addEventListener(FLOOR_ARRIVED_EVENT, arrive);
    return () => window.removeEventListener(FLOOR_ARRIVED_EVENT, arrive);
  }, []);

  const due = !!welcome && !!user && welcome.by !== user.id && arrived && !closed && !seen(office.id);

  useEffect(() => {
    if (due) track("welcome_shown");
  }, [due]);

  if (!due || !welcome) return null;

  const close = () => {
    markSeen(office.id);
    setClosed(true);
  };

  return (
    <Modal open onClose={close} label={t("title", { office: office.name })} closeLabel={t("close")}>
      <div className="px-6 pb-6 pt-7 pe-14">
        <Face seed={office.id} size={44} square />
        <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-foreground">{t("title", { office: office.name })}</h2>
        <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-foreground/85">{welcome.text}</p>
        {welcome.by && welcome.byName && (
          <div className="mt-5 flex items-center gap-2.5">
            <Face seed={welcome.by} size={28} />
            <span className="text-[13px] text-muted-foreground">{welcome.byName}</span>
          </div>
        )}
        <Button size="md" className="mt-6 h-10 w-full text-[13.5px]" onClick={close}>
          {t("walkIn")}
        </Button>
      </div>
    </Modal>
  );
}
