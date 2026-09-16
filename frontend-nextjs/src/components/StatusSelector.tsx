"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronUp } from "lucide-react";
import type { PlayerStatus } from "@/lib/types";

// Labels and descriptions live under `status.<value>` in the messages.
const CHOICES = ["available", "busy", "away"] as const;

/** What the pill can show: a choice, or the call the room put you in. */
type Shown = (typeof CHOICES)[number] | "in_call";

const DOT: Record<Shown, string> = {
  available: "bg-emerald-500",
  busy: "bg-red-500",
  away: "bg-amber-400",
  in_call: "bg-violet-500",
};

const StatusDot: React.FC<{ status: Shown; className?: string }> = ({
  status,
  className = "",
}) => (
  <span
    aria-hidden="true"
    className={`inline-block w-2.5 h-2.5 shrink-0 rounded-full ring-2 ring-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${DOT[status]} ${className}`}
  />
);

interface StatusSelectorProps {
  currentStatus: PlayerStatus;
  onStatusChange: (status: PlayerStatus) => void;
}

/**
 * A presence picker in the spirit of Slack's: a compact pill that says what
 * everyone else sees, and a menu above it. While you are on a call the room
 * shows you as in a call no matter what, so the other choices wait until the
 * call ends rather than pretending to change anything.
 */
export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
}) => {
  const t = useTranslations("status");
  const tControls = useTranslations("controls");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const inCall = currentStatus === "in_call";
  const shown: Shown = inCall
    ? "in_call"
    : (CHOICES as readonly string[]).includes(currentStatus)
      ? (currentStatus as Shown)
      : "available";
  const label = t(`${shown}.label`);

  useEffect(() => {
    if (!open) return;

    const selected = CHOICES.indexOf(currentStatus as (typeof CHOICES)[number]);
    if (inCall) menu.current?.focus();
    else items.current[Math.max(selected, 0)]?.focus();

    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, currentStatus, inCall]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onKey = (event: React.KeyboardEvent) => {
    if (!open) return;
    const enabled = items.current.filter(
      (item): item is HTMLButtonElement => !!item && !item.disabled,
    );
    const at = enabled.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!enabled.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      enabled[(at + step + enabled.length) % enabled.length].focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const choose = (status: PlayerStatus) => {
    onStatusChange(status);
    close();
  };

  return (
    <div className="relative" ref={root} onKeyDown={onKey}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tControls("status", { status: label })}
        title={tControls("status", { status: label })}
        className="cursor-pointer my-1 h-[40px] inline-flex items-center gap-2 ps-3 pe-2 sm:pe-2.5 rounded-full bg-white border border-[rgba(0,0,0,0.06)] shadow-sm text-[var(--color-braun-text)] hover:bg-gray-50 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-braun-text)]/20"
      >
        <StatusDot status={shown} />
        <span className="hidden sm:inline font-body text-[13px] font-semibold whitespace-nowrap">
          {label}
        </span>
        <ChevronUp
          aria-hidden="true"
          className={`w-3.5 h-3.5 opacity-40 transition-transform duration-200 ${
            open ? "" : "rotate-180"
          }`}
        />
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          tabIndex={-1}
          aria-label={tControls("status", { status: label })}
          className="outline-none absolute bottom-full start-0 mb-2.5 w-[16rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-black/10 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.35)] p-1.5 z-50"
        >
          {inCall && (
            <div className="flex items-center gap-3 px-2.5 py-2 mb-1 rounded-xl bg-violet-50">
              <StatusDot status="in_call" />
              <span className="min-w-0">
                <span className="block font-body text-[13px] font-semibold text-[var(--color-braun-text)]">
                  {t("in_call.label")}
                </span>
                <span className="block font-body text-[12px] text-[var(--color-braun-text)] opacity-55">
                  {t("in_call.description")}
                </span>
              </span>
            </div>
          )}

          {CHOICES.map((choice, index) => {
            const selected = currentStatus === choice;
            return (
              <button
                key={choice}
                ref={(node) => {
                  items.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                disabled={inCall}
                onClick={() => choose(choice)}
                className="cursor-pointer w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-start outline-none transition-colors duration-100 hover:bg-[#f5f5f2] focus-visible:bg-[#f5f5f2] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <StatusDot status={choice} />
                <span className="flex-1 min-w-0">
                  <span className="block font-body text-[13px] font-semibold text-[var(--color-braun-text)]">
                    {t(`${choice}.label`)}
                  </span>
                  <span className="block font-body text-[12px] text-[var(--color-braun-text)] opacity-55">
                    {t(`${choice}.description`)}
                  </span>
                </span>
                {selected && (
                  <Check
                    aria-hidden="true"
                    className="w-4 h-4 shrink-0 text-[var(--color-braun-orange)]"
                    strokeWidth={2.5}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
