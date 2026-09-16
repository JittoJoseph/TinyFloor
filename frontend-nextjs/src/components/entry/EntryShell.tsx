import React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { AutoHeight } from "./AutoHeight";

export const EntryShell: React.FC<{
  backHref?: string;
  backLabel?: string;
  preview: React.ReactNode;
  children: React.ReactNode;
}> = ({ backHref = "/rooms", backLabel, preview, children }) => {
  const t = useTranslations("entry");
  const back = backLabel ?? t("allRooms");

  return (
    <div className="min-h-screen w-full bg-[var(--color-braun-bg)] flex flex-col">
      {/* A desktop has height to spare above the panel, so the way back and the
          wordmark sit in a header there. */}
      <header className="hidden lg:flex w-full max-w-6xl mx-auto px-6 py-4 items-center justify-between">
        <Link
          href={backHref}
          className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3.5 py-2 font-body text-[13px] font-medium text-[var(--color-braun-text)] opacity-70 hover:opacity-100 hover:bg-white transition-[opacity,background-color] duration-200"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {back}
        </Link>
        <Link
          href="/"
          className="cursor-pointer font-body font-bold text-lg tracking-tight text-[var(--color-braun-text)]"
        >
          TinyFloor
        </Link>
      </header>

      <main className="flex-1 w-full px-4 py-4 sm:py-8 lg:py-4 flex items-center justify-center">
        {/* A phone stacks the preview over the form. From lg up there is width to
            spare but not height, so the preview becomes a column beside it and
            the panel is only as tall as the form. */}
        <div className="w-full max-w-[27rem] lg:max-w-[58rem] rounded-[1.75rem] border border-black/10 bg-white p-2.5 sm:p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.45)] lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-2 lg:min-h-[34rem]">
          <div className="relative lg:h-full">
            {preview}
            {/* On a phone the header would push the button below the fold, so
                the way back and the wordmark ride on the preview instead. */}
            <Link
              href={backHref}
              aria-label={back}
              className="lg:hidden cursor-pointer absolute start-2.5 top-2.5 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/92 border border-black/10 shadow-sm text-[var(--color-braun-text)] hover:bg-white transition-colors duration-[120ms]"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </Link>
            <Link
              href="/"
              className="lg:hidden cursor-pointer absolute start-2.5 bottom-2.5 inline-flex items-center h-7 px-2.5 rounded-lg bg-white/92 border border-black/10 shadow-sm font-body font-bold text-[13px] tracking-tight text-[var(--color-braun-text)] hover:bg-white transition-colors duration-[120ms]"
            >
              TinyFloor
            </Link>
          </div>
          <div className="lg:self-center">
            <AutoHeight>
              <div className="px-1.5 sm:px-2 pt-4 sm:pt-5 pb-1 lg:px-6 lg:py-6">
                {children}
              </div>
            </AutoHeight>
          </div>
        </div>
      </main>
    </div>
  );
};

const labelClass =
  "flex items-baseline gap-2 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-braun-text)] opacity-50 mb-2.5";

export const Field: React.FC<{
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}> = ({ label, hint, htmlFor, children }) => {
  const content = (
    <>
      {label}
      {hint && (
        <span className="font-normal normal-case tracking-normal text-[11px] opacity-80">
          {hint}
        </span>
      )}
    </>
  );

  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {content}
        </label>
      ) : (
        <p className={labelClass}>{content}</p>
      )}
      {children}
    </div>
  );
};

export const inputClass =
  "w-full h-13 px-4 rounded-xl bg-[#fbfbf9] border border-black/10 font-body text-[15px] text-[var(--color-braun-text)] placeholder:text-[var(--color-braun-text)] placeholder:opacity-35 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:bg-white focus:border-[var(--color-braun-text)]/40 focus:ring-4 focus:ring-[var(--color-braun-text)]/5";

export const primaryButtonClass =
  "cursor-pointer w-full h-14 rounded-full bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] font-body font-bold uppercase tracking-[0.15em] text-xs shadow-sm transition-[background-color,transform,opacity] duration-200 hover:bg-[#1a1a1a] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-braun-text)] disabled:active:scale-100 flex items-center justify-center gap-2";
