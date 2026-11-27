"use client";

import { useFormatter, useTranslations } from "next-intl";
import { AudioLines, Check } from "web-shared/components/ui/icons";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useFloor } from "@/lib/floor";
import { cn } from "web-shared/lib/utils";

/**
 * Someone asking to talk, in your direct messages with them: a small card set
 * in from the edge, as a meeting's is in #general, rather than words. To the
 * one asked, Talk: answering, while their ask is still ringing, or asking them
 * back once it has rung out, while they're on the floor and you're free. To
 * the one who asked, only that they did.
 */
export function TalkCard({ author, authorName, at, me }: { author: string; authorName: string; at: number; me: string }) {
  const t = useTranslations("chat");
  const tCall = useTranslations("call");
  const format = useFormatter();
  const { incoming, outgoing, peers } = useCall();
  const here = useFloor().some((one) => one.id === author);
  const mine = author === me;
  // Their ask, ringing now: Talk answers it.
  const ringing = !mine && incoming?.id === author;
  const talking = peers.some((one) => one.id === author);
  const free = !incoming && !outgoing && !peers.length;
  const time = format.dateTime(at, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="px-5 pb-1 pt-3 sm:px-6">
      <div className="ms-12 flex w-[22rem] max-w-[calc(100%-3rem)] items-center gap-3 rounded-[20px] border border-border bg-card p-2 ps-2.5 [corner-shape:squircle]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-ok/12 text-ok [corner-shape:squircle]">
          <AudioLines className="size-4" strokeWidth={2.25} />
        </span>
        <p className="min-w-0 flex-1 leading-snug">
          <span className="block truncate text-[13.5px] font-semibold text-foreground">
            {mine ? t("talkAsked") : ringing ? t("talkWants", { name: authorName }) : t("talkWanted", { name: authorName })}
          </span>
          <span className="block text-[12px] tabular-nums text-muted-foreground">{time}</span>
        </p>
        {!mine &&
          (talking ? (
            <span className="flex h-8 shrink-0 items-center gap-1.5 px-1.5 text-[12.5px] font-medium text-muted-foreground">
              <Check className="size-3.5" strokeWidth={2.4} />
              {t("talkTalking")}
            </span>
          ) : ringing || (here && free) ? (
            <button
              type="button"
              onClick={() => (ringing ? void callManager.accept() : callManager.invite(author, authorName))}
              className={cn(
                "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[13px] bg-ok px-3.5 text-[12.5px] font-semibold text-white outline-none transition-[background-color,transform] [corner-shape:squircle]",
                "hover:bg-ok/90 focus-visible:ring-2 focus-visible:ring-ok/50 active:scale-[0.97] dark:text-[rgb(4_32_16)]",
              )}
            >
              <AudioLines className="size-3.5" strokeWidth={2.25} />
              {tCall("accept")}
            </button>
          ) : null)}
      </div>
    </div>
  );
}
