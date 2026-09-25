"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Field, pillInputClass } from "./EntryShell";
import { CharacterPicker } from "./CharacterPicker";

/**
 * Walking in is two small steps instead of one busy form: your name, then who
 * you'll be. Both are used by the lobby, by rooms, by guest links and by
 * invitations, so the way in is the same everywhere.
 */
export const NameStep: React.FC<{
  name: string;
  onName: (value: string) => void;
}> = ({ name, onName }) => {
  const t = useTranslations("entry");

  return (
    <Field label={t("yourName")} htmlFor="identity-name">
      <input
        id="identity-name"
        type="text"
        value={name}
        onChange={(event) => onName(event.target.value)}
        placeholder={t("namePlaceholder")}
        className={pillInputClass}
        maxLength={30}
        autoFocus
        autoComplete="nickname"
      />
    </Field>
  );
};

export const CharacterStep: React.FC<{
  name: string;
  character: string;
  onCharacter: (value: string) => void;
  /** Missing when the name isn't the visitor's to change here, as for an account. */
  onBack?: () => void;
}> = ({ name, character, onCharacter, onBack }) => {
  const t = useTranslations("entry");

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-[12.5px] font-medium text-muted-foreground">{t("character")}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-w-0 cursor-pointer items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            {t("walkingInAs", { name })}
          </button>
        )}
      </div>
      <CharacterPicker value={character} onChange={onCharacter} />
    </div>
  );
};
