"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Link2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { LitFace } from "@/components/ui/LitFace";
import { Logo } from "@/components/app/Logo";
import { PixelAvatar } from "@/components/PixelAvatar";
import { shareUrl } from "@/lib/links";

/** The lobby is TinyFloor's own place, so it wears the logo, lit in the brand's colour. */
export function LobbyMark() {
  return (
    <span className="relative inline-flex" aria-hidden>
      <span className="pointer-events-none absolute inset-0 scale-125 rounded-[30%] bg-brand/25 blur-2xl" />
      <span className="relative">
        <Logo size={48} />
      </span>
    </span>
  );
}

/** An office's mark, the one it has inside: coloured by its id, lit softly. */
export function OfficeMark({ officeId }: { officeId: string }) {
  return <LitFace seed={officeId} size={48} phone={44} square />;
}

/** Copies the whole link to this door; the icon turns to a tick for a moment. */
export function CopyLink({ path }: { path: string }) {
  const t = useTranslations("entry");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const link = path.startsWith("/") ? shareUrl(path) : path;
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
    <IconButton
      label={copied ? t("inviteCopied") : t("copyInvite")}
      icon={copied ? <Check className="size-4 text-ok" /> : <Link2 className="size-4" />}
      size="sm"
      side="bottom"
      onClick={copy}
    />
  );
}

/** You as you'll walk in: your character, your name, and a way back to change it. */
export function YouSummary({ name, character, onChange, changeLabel }: { name: string; character: string; onChange?: () => void; changeLabel?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-rail py-2 pe-3.5 ps-2">
      <span className="relative block size-11 shrink-0 overflow-hidden rounded-xl bg-card" style={{ containerType: "size" }} aria-hidden>
        <PixelAvatar character={character} width="62cqw" style={{ left: "50%", top: "92%" }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-foreground">{name}</p>
        <p className="text-[12.5px] text-muted-foreground">{character}</p>
      </div>
      {onChange && (
        <button type="button" onClick={onChange} className="cursor-pointer text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          {changeLabel}
        </button>
      )}
    </div>
  );
}
