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
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string; v?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { page = "home", v = "O1" } = await searchParams;
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
      {v === "O1" && <Split title={title} labels={{ video: "Video call", audio: "Voice call", message: "Message" }} />}
      {v === "O2" && <Floating title={title} />}
      {v === "O3" && <Centered title={title} />}
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

function Floating({ title }: { title: ReactNode }) {
  return (
    <>
      <FloorScene {...EVERYONE} view={[12, 1, 34, 22]} className="absolute inset-0" />
      <div className="absolute bottom-10 start-10 max-w-[700px] rounded-[28px] border border-border bg-card/95 p-10 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.5)] backdrop-blur">
        <Mark className="text-[24px]" />
        <p className="mt-6 text-balance text-[48px] font-semibold leading-[1.05] tracking-[-0.035em]">{title}</p>
      </div>
    </>
  );
}

function Centered({ title }: { title: ReactNode }) {
  return (
    <>
      <FloorScene {...EVERYONE} view={[8, 1, 38, 24]} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--ui-background)_28%,transparent_78%)] opacity-95" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-24 text-center">
        <Mark />
        <p className="mt-8 text-balance text-[58px] font-semibold leading-[1.04] tracking-[-0.035em]">{title}</p>
      </div>
    </>
  );
}
