import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { FloorScene } from "@/components/floor/FloorScene";
import { EVERYONE, PEOPLE } from "@/components/floor/scenes";
import { NearbyBar } from "@/components/floor/PlayableYou";
import { Face, FaceStack } from "@/components/ui/Face";
import { LANDINGS } from "@/lib/landings";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";

import { notFound } from "next/navigation";

export const metadata = { robots: { index: false } };

/** Draws a page's social card at 1200 by 630, for scripts/pictures.mjs to photograph. Only in development. */
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { page = "home" } = await searchParams;
  const t = await getTranslations();
  const landing = LANDINGS.find((one) => one.slug === page);
  const raw =
    page === "home"
      ? t.raw("home.hero.title")
      : page === "lobby"
        ? t("home.hero.secondary")
        : page === "invite"
          ? t("metadata.inviteFallbackTitle").replace("TinyFloor", "<em>TinyFloor</em>")
          : page === "neutral"
            ? ""
            : (t.raw(`landings.pages.${landing!.key}.title` as "home.hero.title") as string);
  const title = raw ? emphasised(String(raw), locale, "text-brand") : null;
  // An invite shows someone arriving; every other card, the bar beside someone you've walked up to.
  const over =
    page === "invite" ? (
      <span className="flex h-12 items-center gap-2.5 rounded-full border border-border bg-card pe-5 ps-1.5 text-[16px] font-medium shadow-float [--face-ring:var(--ui-card)]">
        {/* Someone new: not one of the people already on the floor. */}
        <Face seed="nora-3" size={36} />
        {t("home.steps.walkedIn", { name: "Nora" })}
      </span>
    ) : (
      <NearbyBar
        name={PEOPLE.olivia.name}
        seed={PEOPLE.olivia.id}
        labels={{ video: t("home.preview.video"), audio: t("home.preview.audio"), message: t("home.preview.message") }}
      />
    );
  return (
    <div id="card" className="relative h-[630px] w-[1200px] overflow-hidden bg-background font-(family-name:--font-body) text-foreground">
      <Split title={title} over={over} />
    </div>
  );
}

function Mark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3 text-[30px] font-bold tracking-[-0.02em]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="size-11 rounded-[12px]" />
      TinyFloor
    </span>
  );
}

function Split({ title, over }: { title: ReactNode; over: ReactNode }) {
  return (
    <div className="grid h-full grid-cols-[560px_1fr]">
      <div className="flex flex-col justify-between p-16">
        <Mark />
        {title ? (
          <p className="text-balance text-[56px] font-bold leading-[1.04] tracking-[-0.035em] [:lang(ja)_&]:tracking-normal [:lang(ko)_&]:tracking-normal [:lang(zh)_&]:tracking-normal">{title}</p>
        ) : (
          <p className="text-balance text-[56px] font-bold leading-[1.04] tracking-[-0.035em]">
            A virtual office <span className="text-brand">you walk around in.</span>
          </p>
        )}
        <div className="flex items-center gap-3 text-[20px] text-muted-foreground [--face-ring:var(--ui-background)]">
          <FaceStack seeds={Object.values(PEOPLE).map((one) => one.id)} size={34} max={5} />
          tinyfloor.com
        </div>
      </div>
      <div className="relative p-5 ps-0">
        <FloorScene
          {...EVERYONE}
          view={[27, 1, 18, 18]}
          className="h-full w-full rounded-[28px]"
          over={
            <div className="absolute inset-x-0 bottom-8 flex justify-center">{over}</div>
          }
        />
      </div>
    </div>
  );
}
