"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { FLOOR_ARRIVED_EVENT } from "@/lib/floor";
import { CREATOR_HEIGHT, closeCharacterCreator, loadCharacterCreator, loadedCharacterCreator, useCharacterCreatorShown } from "./creatorOpen";

const LazyCreator = dynamic(() => loadCharacterCreator().then((module) => module.Creator), {
  ssr: false,
  // Its size while it draws, should it take a moment: the dialog comes in whole either way.
  loading: () => <div aria-hidden className={CREATOR_HEIGHT} />,
});

/**
 * The one creator every screen opens: in the app's layout, so it outlives
 * whatever opened it. Its code isn't part of any page's: it's fetched once
 * you're on the floor (or as you point at a way to open it), so it's there
 * by the time you want it.
 */
export function CharacterCreatorHost() {
  const open = useCharacterCreatorShown();
  // Opening waits for the code (creatorOpen), so it's almost always here and draws in the dialog's first frame.
  const Creator = loadedCharacterCreator()?.Creator ?? LazyCreator;
  const t = useTranslations("look");
  const tc = useTranslations("common");

  useEffect(() => {
    const load = () => void loadCharacterCreator().catch(() => {});
    window.addEventListener(FLOOR_ARRIVED_EVENT, load, { once: true });
    return () => window.removeEventListener(FLOOR_ARRIVED_EVENT, load);
  }, []);

  return (
    <Modal open={open} onClose={closeCharacterCreator} label={t("title")} closeLabel={tc("close")} closeButton={false} className="overflow-hidden sm:max-w-[60rem]">
      {open && <Creator onClose={closeCharacterCreator} />}
    </Modal>
  );
}
