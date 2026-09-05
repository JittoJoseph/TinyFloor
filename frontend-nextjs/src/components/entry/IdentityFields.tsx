"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { Field, inputClass } from "./EntryShell";
import { CharacterPicker } from "./CharacterPicker";

export const ErrorNote: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <p className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 font-body text-[13px] text-red-700">
    <AlertCircle className="w-4 h-4 shrink-0" />
    {children}
  </p>
);

export const IdentityFields: React.FC<{
  name: string;
  onName: (value: string) => void;
  character: string;
  onCharacter: (value: string) => void;
  password?: string;
  onPassword?: (value: string) => void;
  needsPassword?: boolean;
  autoFocus?: boolean;
}> = ({
  name,
  onName,
  character,
  onCharacter,
  password = "",
  onPassword,
  needsPassword = false,
  autoFocus = false,
}) => (
  <div className="space-y-4">
    <Field label="Your name" htmlFor="identity-name">
      <input
        id="identity-name"
        type="text"
        value={name}
        onChange={(event) => onName(event.target.value)}
        placeholder="What should people call you?"
        className={inputClass}
        maxLength={30}
        autoFocus={autoFocus}
      />
    </Field>

    {needsPassword && onPassword && (
      <Field label="Room password" htmlFor="identity-password">
        <input
          id="identity-password"
          type="password"
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          placeholder="Enter the password"
          className={inputClass}
        />
      </Field>
    )}

    <Field label="Character">
      <CharacterPicker value={character} onChange={onCharacter} />
    </Field>
  </div>
);
