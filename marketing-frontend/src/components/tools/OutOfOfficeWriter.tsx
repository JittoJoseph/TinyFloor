"use client";

import { useState } from "react";
import { Check, Copy } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { STONE } from "@/components/home/Blocks";
import { composeOoo, type OooReason, type OooTone } from "@/lib/tools/out-of-office/compose";
import type { OooContent } from "@/lib/tools/out-of-office";

/**
 * An out-of-office message from a few choices: why you're away, until when,
 * who covers for you, and how formal to be. It writes the email auto-reply and
 * a short status for team chat, as you type; nothing leaves the page.
 */
export function OutOfOfficeWriter({ locale, copy }: { locale: string; copy: OooContent["writer"] }) {
  const [reason, setReason] = useState<OooReason>("vacation");
  const [tone, setTone] = useState<OooTone>("professional");
  const [back, setBack] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState<"email" | "status" | null>(null);

  const message = composeOoo(locale, { reason, tone, back, name, contact, email });

  const copyText = async (which: "email" | "status") => {
    try {
      await navigator.clipboard.writeText(message[which]);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // The text is on screen to copy by hand.
    }
  };

  const chip = (on: boolean) =>
    cn(
      "h-9 cursor-pointer rounded-full px-3.5 text-[13.5px] font-medium transition-colors",
      on ? "bg-foreground text-background" : "bg-background/70 text-muted-foreground hover:text-foreground",
    );
  const label = "text-[13px] font-medium text-muted-foreground";
  const field =
    "mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-[16px] text-foreground outline-none transition-colors focus:border-foreground/35 sm:text-[14.5px]";
  const button = (which: "email" | "status") => (
    <button type="button" onClick={() => copyText(which)} className={cn(STONE, "cursor-pointer")}>
      {copied === which ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied === which ? copy.copied : copy.copy}
    </button>
  );

  return (
    <div className="rounded-[28px] bg-muted/80 p-5 sm:p-8">
      <div className="grid gap-6">
        <div>
          <p className={label}>{copy.reason}</p>
          <div role="group" aria-label={copy.reason} className="mt-2.5 flex flex-wrap gap-2">
            {(Object.keys(copy.reasons) as OooReason[]).map((key) => (
              <button key={key} type="button" aria-pressed={reason === key} onClick={() => setReason(key)} className={chip(reason === key)}>
                {copy.reasons[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{copy.back}</span>
            <input type="date" value={back} onChange={(event) => setBack(event.target.value)} className={field} />
            <span className="mt-1.5 block text-[12.5px] text-faint">{copy.unknown}</span>
          </label>
          <label className="block">
            <span className={label}>
              {copy.name} <span className="font-normal text-faint">{copy.optional}</span>
            </span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} className={field} />
          </label>
          <label className="block">
            <span className={label}>
              {copy.contact} <span className="font-normal text-faint">{copy.optional}</span>
            </span>
            <input value={contact} onChange={(event) => setContact(event.target.value)} maxLength={60} className={field} />
          </label>
          <label className="block">
            <span className={label}>
              {copy.email} <span className="font-normal text-faint">{copy.optional}</span>
            </span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={80} className={field} />
          </label>
        </div>

        <div>
          <p className={label}>{copy.tone}</p>
          <div role="group" aria-label={copy.tone} className="mt-2.5 flex flex-wrap gap-2">
            {(Object.keys(copy.tones) as OooTone[]).map((key) => (
              <button key={key} type="button" aria-pressed={tone === key} onClick={() => setTone(key)} className={chip(tone === key)}>
                {copy.tones[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[20px] bg-background p-5 sm:p-6">
        <p className="text-[13px] font-medium text-muted-foreground">{copy.emailTitle}</p>
        <p aria-live="polite" className="mt-4 whitespace-pre-wrap text-[15.5px] leading-[1.75] text-foreground/85">
          {message.email}
        </p>
        <div className="mt-5">{button("email")}</div>
      </div>

      <div className="mt-3 rounded-[20px] bg-background p-5 sm:p-6">
        <p className="text-[13px] font-medium text-muted-foreground">{copy.statusTitle}</p>
        <p aria-live="polite" className="mt-3 text-[16px] leading-[1.6] text-foreground/85">
          {message.status}
        </p>
        <p className="mt-2 text-[12.5px] text-faint">{copy.statusNote}</p>
        <div className="mt-4">{button("status")}</div>
      </div>
    </div>
  );
}
