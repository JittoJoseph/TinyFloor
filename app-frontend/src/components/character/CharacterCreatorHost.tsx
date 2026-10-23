"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { FLOOR_ARRIVED_EVENT } from "@/lib/floor";
import { closeCharacterCreator, loadCharacterCreator, useCharacterCreatorShown } from "./creatorOpen";

const Creator = dynamic(() => loadCharacterCreator().then((module) => module.Creator), { ssr: false });

/**
 * The one creator every screen opens: in the app's layout, so it outlives
 * whatever opened it. Its code isn't part of any page's: it's fetched once
 * you're on the floor (or as you point at a way to open it), so it's there
 * by the time you want it.
 */
export function CharacterCreatorHost() {
  const open = useCharacterCreatorShown();
  const t = useTranslations("look");
  const tc = useTranslations("common");

  useEffect(() => {
    const load = () => void loadCharacterCreator().catch(() => {});
    window.addEventListener(FLOOR_ARRIVED_EVENT, load, { once: true });
    return () => window.removeEventListener(FLOOR_ARRIVED_EVENT, load);
  }, []);

  return (
    <Modal open={open} onClose={closeCharacterCreator} label={t("title")} closeLabel={tc("close")} className="sm:max-w-[56rem]">
      {open && <Creator onClose={closeCharacterCreator} />}
    </Modal>
  );
}
