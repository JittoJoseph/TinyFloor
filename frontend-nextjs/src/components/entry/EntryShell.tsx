import React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { AutoHeight } from "./AutoHeight";
import { Logo } from "@/components/app/AppShell";

export const EntryShell: React.FC<{
  backHref?: string;
  backLabel?: string;
  preview: React.ReactNode;
  children: React.ReactNode;
}> = ({ backHref = "/", backLabel, preview, children }) => {
  const t = useTranslations("common");
  const back = backLabel ?? t("back");

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* A desktop has height to spare above the panel, so the way back and the
          wordmark sit in a header there. */}
      <header className="hidden lg:flex w-full max-w-6xl mx-auto px-6 py-4 items-center justify-between">
        <Link
          href={backHref}
          className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {back}
        </Link>
        <Link href="/" className="cursor-pointer inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          <Logo size={26} />
          TinyFloor
        </Link>
      </header>

      <main className="flex-1 w-full px-4 py-4 sm:py-8 lg:py-4 flex items-center justify-center">
        {/* A phone stacks the preview over the form. From lg up there is width to
            spare but not height, so the preview becomes a column beside it and
            the panel is only as tall as the form. */}
        <div className="w-full max-w-[27rem] lg:max-w-[58rem] rounded-[1.75rem] border border-border bg-card p-2.5 sm:p-3 shadow-float lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-2 lg:min-h-[34rem]">
          <div className="relative lg:h-full">
            {preview}
            {/* On a phone the header would push the button below the fold, so
                the way back and the wordmark ride on the preview instead. */}
            <Link
              href={backHref}
              aria-label={back}
              className="lg:hidden cursor-pointer absolute start-2.5 top-2.5 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-card/92 border border-border shadow-sm text-foreground hover:bg-card transition-colors duration-[120ms]"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </Link>
            <Link
              href="/"
              className="lg:hidden cursor-pointer absolute start-2.5 bottom-2.5 inline-flex items-center gap-1.5 h-7 ps-1 pe-2.5 rounded-lg bg-card/92 border border-border shadow-sm font-semibold text-[13px] tracking-tight text-foreground hover:bg-card transition-colors duration-[120ms]"
            >
              <Logo size={20} />
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

const labelClass = "flex items-baseline gap-2 text-[12.5px] font-medium text-muted-foreground mb-2";

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
  "w-full h-12 px-4 rounded-xl bg-background border border-border text-[16px] sm:text-[15px] text-foreground placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-200 focus:border-foreground/35 focus:ring-4 focus:ring-foreground/[0.06]";

export const primaryButtonClass =
  "cursor-pointer w-full h-12 rounded-full bg-foreground text-background font-medium text-[14px] transition-[background-color,transform,opacity] duration-200 hover:bg-foreground/90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2";
