"use client";

import React, { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { OfficeScene, Occupant } from "@/components/OfficeScene";

export const EntryPreview: React.FC<{
  occupants: Occupant[];
  inviteLink?: string;
}> = ({ occupants, inviteLink }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      const field = document.createElement("textarea");
      field.value = inviteLink;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <OfficeScene
      className="aspect-[7/5] rounded-[1.35rem] border border-black/10"
      zoom="auto 470px"
      focus="42% 79%"
      occupants={occupants}
    >
      {inviteLink && (
        <button
          type="button"
          onClick={copy}
          title="Copy invite link"
          aria-label={copied ? "Invite link copied" : "Copy invite link"}
          className="cursor-pointer absolute right-2.5 top-2.5 w-9 h-9 rounded-xl bg-white/92 border border-black/10 shadow-sm flex items-center justify-center text-[var(--color-braun-text)] hover:bg-white transition-colors duration-[120ms]"
        >
          <span className="relative inline-flex w-4 h-4 items-center justify-center">
            <Link2
              className={`absolute w-4 h-4 transition-all duration-200 ease-out motion-reduce:transition-none ${
                copied
                  ? "scale-50 opacity-0 blur-[2px]"
                  : "scale-100 opacity-100 blur-0"
              }`}
            />
            <Check
              className={`absolute w-4 h-4 text-emerald-600 transition-all duration-200 ease-out motion-reduce:transition-none ${
                copied
                  ? "scale-100 opacity-100 blur-0"
                  : "scale-50 opacity-0 blur-[2px]"
              }`}
            />
          </span>
        </button>
      )}
    </OfficeScene>
  );
};
