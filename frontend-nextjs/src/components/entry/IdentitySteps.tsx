"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Field, inputClass } from "./EntryShell";
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
        className={inputClass}
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
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <p className="text-[11px] font-semibold text-muted-foreground">
          {t("character")}
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
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
