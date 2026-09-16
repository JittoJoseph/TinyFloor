import React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AutoHeight } from "./AutoHeight";

export const EntryShell: React.FC<{
  backHref?: string;
  backLabel?: string;
  preview: React.ReactNode;
  children: React.ReactNode;
}> = ({ backHref = "/rooms", backLabel, preview, children }) => {
  const t = useTranslations("entry");

  return (
    <div className="min-h-screen w-full bg-[var(--color-braun-bg)] flex flex-col">
      <main className="flex-1 w-full px-4 py-4 sm:py-8 flex items-center justify-center">
        {/* A phone stacks the preview over the form. From lg up there is width to
            spare but not height, so the preview becomes a column beside it and
            the panel is only as tall as the form. */}
        <div className="w-full max-w-[27rem] lg:max-w-[58rem] rounded-[1.75rem] border border-black/10 bg-white p-2.5 sm:p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.45)] lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-2 lg:min-h-[34rem]">
          {/* Everything that used to sit in a page header rides on the preview,
              so a phone shows the whole panel without scrolling. */}
          <div className="relative lg:h-full">
            {preview}
            <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
              <Link
                href={backHref}
                aria-label={backLabel ?? t("allRooms")}
                className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-white/92 border border-black/10 shadow-sm font-body text-[13px] font-medium text-[var(--color-braun-text)] hover:bg-white transition-colors duration-[120ms]"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span className="hidden sm:inline">
                  {backLabel ?? t("allRooms")}
                </span>
              </Link>
              <LanguageSwitcher side="bottom" align="end" compact />
            </div>
            <Link
              href="/"
              className="cursor-pointer absolute start-2.5 bottom-2.5 inline-flex items-center h-7 px-2.5 rounded-lg bg-white/92 border border-black/10 shadow-sm font-body font-bold text-[13px] tracking-tight text-[var(--color-braun-text)] hover:bg-white transition-colors duration-[120ms]"
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
