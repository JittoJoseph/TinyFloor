"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Link2 } from "lucide-react";
import { FloorScene } from "@/components/floor/FloorScene";
import { shareUrl } from "@/lib/links";

/** Who stands in the middle of the preview: you, as you're being made. */
export interface Arrival {
  character: string;
  name?: string;
  running?: boolean;
}

/** An open stretch of the hall, the arrival standing in the middle of it. */
const VIEW: [number, number, number, number] = [17, 8, 15, 12];
const SPOT: [number, number] = [24, 13];

export const EntryPreview: React.FC<{
  occupants: Arrival[];
  inviteLink?: string;
}> = ({ occupants, inviteLink }) => {
  const t = useTranslations("entry");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!inviteLink) return;
    // Callers pass the path; what goes on the clipboard is the whole link.
    const link = inviteLink.startsWith("/") ? shareUrl(inviteLink) : inviteLink;

    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const field = document.createElement("textarea");
      field.value = link;
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
    <FloorScene
      className="aspect-[16/10] sm:aspect-[7/5] lg:aspect-auto lg:h-full rounded-[1.35rem] border border-border"
      view={VIEW}
      standing={occupants.map((one) => ({ ...one, at: SPOT }))}
      over={
        inviteLink && (
        <button
          type="button"
          onClick={copy}
          title={t("copyInvite")}
          aria-label={copied ? t("inviteCopied") : t("copyInvite")}
          className="cursor-pointer absolute end-2.5 top-2.5 w-9 h-9 rounded-xl bg-card/92 border border-border shadow-sm flex items-center justify-center text-foreground hover:bg-card transition-colors duration-[120ms]"
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
              className={`absolute w-4 h-4 text-ok transition-all duration-200 ease-out motion-reduce:transition-none ${
                copied
                  ? "scale-100 opacity-100 blur-0"
                  : "scale-50 opacity-0 blur-[2px]"
              }`}
            />
          </span>
        </button>
        )
      }
    />
  );
};
