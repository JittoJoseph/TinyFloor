import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { SCENES, type SceneName } from "@/components/floor/sceneCatalog";
import { SceneClock } from "./SceneClock";

export const metadata = { robots: { index: false } };

/**
 * One floor scene alone, filling its box, for scripts/scenes.mjs to record.
 * Only in development; the pages show the recordings (SceneMedia).
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const name = (await searchParams).name as SceneName | undefined;
  const scene = name && SCENES[name];
  if (!scene) notFound();
  return (
    <div id="scene" className="overflow-hidden" style={{ width: scene.size[0], height: scene.size[1] }}>
      {scene.draw()}
      <SceneClock />
    </div>
  );
}
