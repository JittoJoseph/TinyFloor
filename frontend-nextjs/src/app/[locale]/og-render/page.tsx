import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { FloorScene } from "@/components/floor/FloorScene";
import { EVERYONE, PEOPLE } from "@/components/floor/scenes";
import { NearbyBar } from "@/components/floor/PlayableYou";
import { FaceStack } from "@/components/ui/Face";
import { LANDINGS } from "@/lib/landings";
import { cn } from "@/lib/utils";

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
        : page === "neutral"
          ? ""
          : (t.raw(`landings.pages.${landing!.key}.title` as "home.hero.title") as string);
  const title = raw ? highlight(String(raw)) : null;
  return (
    <div id="card" className="relative h-[630px] w-[1200px] overflow-hidden bg-background font-(family-name:--font-body) text-foreground">
      <Split title={title} labels={{ video: t("home.preview.video"), audio: t("home.preview.audio"), message: t("home.preview.message") }} />
    </div>
  );
}

/** Copy's <em> in the brand colour. */
function highlight(text: string): ReactNode {
  return text.split(/<em>|<\/em>/).map((part, i) => (i % 2 ? <span key={i} className="text-brand">{part}</span> : part));
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

function Split({ title, labels }: { title: ReactNode; labels: { video: string; audio: string; message: string } }) {
  return (
    <div className="grid h-full grid-cols-[560px_1fr]">
      <div className="flex flex-col justify-between p-16">
        <Mark />
        {title ? (
          <p className="text-balance text-[56px] font-bold leading-[1.04] tracking-[-0.035em] [:lang(ja)_&]:tracking-normal [:lang(ko)_&]:tracking-normal [:lang(zh)_&]:tracking-normal [:lang(ja)_&]:[word-break:auto-phrase]">{title}</p>
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
            <div className="absolute inset-x-0 bottom-8 flex justify-center">
              <NearbyBar name={PEOPLE.olivia.name} seed={PEOPLE.olivia.id} labels={labels} />
            </div>
          }
        />
      </div>
    </div>
  );
}
