import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AutoHeight } from "./AutoHeight";

export const EntryShell: React.FC<{
  backHref?: string;
  backLabel?: string;
  preview: React.ReactNode;
  children: React.ReactNode;
}> = ({ backHref = "/rooms", backLabel = "All rooms", preview, children }) => (
  <div className="min-h-screen w-full bg-[var(--color-braun-bg)] flex flex-col">
    <header className="w-full max-w-6xl mx-auto px-4 md:px-6 py-5 flex items-center justify-between gap-4">
      <Link
        href={backHref}
        className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3.5 py-2 font-body text-[13px] font-medium text-[var(--color-braun-text)] opacity-70 hover:opacity-100 hover:bg-white transition-[opacity,background-color] duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>
      <Link
        href="/"
        className="cursor-pointer font-body font-bold text-lg tracking-tight text-[var(--color-braun-text)]"
      >
        SpatialMeet
      </Link>
    </header>

    <main className="flex-1 w-full px-4 pb-10 flex items-start md:items-center justify-center">
      <div className="w-full max-w-[27rem] rounded-[1.75rem] border border-black/10 bg-white p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.45)]">
        {preview}
        <AutoHeight>
          <div className="px-2 pt-5 pb-1">{children}</div>
        </AutoHeight>
      </div>
    </main>
  </div>
);

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
