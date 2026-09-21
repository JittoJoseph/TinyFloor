"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, DoorClosed, Hash, ImagePlus, Link2, MessagesSquare, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFloor } from "@/lib/floor";
import { readIdentity } from "@/lib/identity";
import { OfficeScene } from "@/components/OfficeScene";
import { ActionLink } from "@/components/ui/Action";
import { FaceStack } from "@/components/ui/Face";

/**
 * The lobby's reason to exist: everything you just tried, in a place of your
 * own. One page, one ask — make an office. Paying can wait.
 */
export function YourOfficeView() {
  const t = useTranslations("lobby.yourOffice");
  const { user } = useAuth();
  const everyone = useFloor();
  const character = readIdentity().character;
  const others = everyone.filter((one) => one.id !== user?.id);

  const perks: Array<{ icon: ReactNode; key: "private" | "channels" | "messages" | "team" | "guests" | "attachments" }> = [
    { icon: <DoorClosed />, key: "private" },
    { icon: <Hash />, key: "channels" },
    { icon: <MessagesSquare />, key: "messages" },
    { icon: <Users />, key: "team" },
    { icon: <Link2 />, key: "guests" },
    { icon: <ImagePlus />, key: "attachments" },
  ];

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <section className="grid items-center gap-8 overflow-hidden rounded-3xl border border-border bg-background p-5 sm:p-8 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand/10 px-2.5 text-[12px] font-medium text-brand">
              <Sparkles className="size-3.5" />
              {t("eyebrow")}
            </span>
            <h1 className="mt-4 text-[28px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[34px]">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">{t("body")}</p>
            <div className="mt-6 flex flex-col gap-2.5 sm:max-w-xs">
              <ActionLink href="/create">{t("create")}</ActionLink>
              <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <Check className="size-3.5 text-ok" />
                {t("free")}
              </p>
            </div>
            {others.length > 0 && (
              <p className="mt-6 flex items-center gap-2.5 text-[12.5px] text-muted-foreground [--face-ring:var(--ui-background)]">
                <FaceStack seeds={others.map((one) => one.id)} size={22} max={4} />
                {t("bringThem", { count: others.length })}
              </p>
            )}
          </div>
          <OfficeScene
            className="aspect-[16/11] rounded-2xl border border-border"
            zoom="auto max(520px, 130%)"
            focus="42% 76%"
            occupants={[
              { character, left: "38%", top: "74%", name: t("you"), width: 40 },
              { character: character === "Amelia" ? "Adam" : "Amelia", left: "58%", top: "70%", name: t("teammate"), width: 40, direction: "left" },
              { character: "Bob", left: "70%", top: "84%", width: 40, stroll: { distance: 60, duration: 9, pattern: "b" } },
            ]}
          />
        </section>

        <h2 className="mt-10 text-[15px] font-semibold text-foreground">{t("whatYouGet")}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((perk) => (
            <li key={perk.key} className="flex gap-3 rounded-2xl border border-border bg-background p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground [&_svg]:size-4">
                {perk.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-foreground">{t(`perks.${perk.key}.title`)}</span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">{t(`perks.${perk.key}.body`)}</span>
              </span>
            </li>
          ))}
        </ul>

        <ol className="mt-10 grid gap-3 sm:grid-cols-3">
          {(["name", "invite", "walk"] as const).map((step, index) => (
            <li key={step} className="rounded-2xl bg-muted/60 p-4">
              <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-[11.5px] font-semibold text-background">
                {index + 1}
              </span>
              <p className="mt-3 text-[13.5px] font-semibold text-foreground">{t(`steps.${step}.title`)}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{t(`steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-[14px] text-muted-foreground">{t("ready")}</p>
          <div className="w-full max-w-xs">
            <ActionLink href="/create">{t("create")}</ActionLink>
          </div>
        </div>
      </div>
    </div>
  );
}
