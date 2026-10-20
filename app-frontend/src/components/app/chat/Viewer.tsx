"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Download, X } from "@/components/ui/icons";
import type { ChatFile } from "@shared/chat";
import { fileUrl } from "@/lib/chatFiles";

/**
 * A picture from chat, full size over everything: its name, a way to keep it,
 * and a way out (the button, Escape, or a click beside it). Nothing more, so
 * it opens as fast as the picture loads.
 */
export function Viewer({ file, onClose }: { file: ChatFile; onClose: () => void }) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", escape, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", escape, true);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const button =
    "flex size-9 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={file.name} className="fixed inset-0 z-[150] flex flex-col bg-black/85" onClick={onClose}>
      <div className="flex h-14 shrink-0 items-center gap-3 px-4" onClick={(event) => event.stopPropagation()}>
        <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-white/90">{file.name}</p>
        <a href={fileUrl(file, true)} download={file.name} aria-label={t("download")} title={t("download")} className={button}>
          <Download className="size-[18px]" />
        </a>
        <button type="button" aria-label={tc("close")} title={tc("close")} onClick={onClose} className={button}>
          <X className="size-[18px]" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl(file)}
          alt={file.name}
          onClick={(event) => event.stopPropagation()}
          className="ph-no-capture max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body,
  );
}
