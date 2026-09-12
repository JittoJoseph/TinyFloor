import { getTranslations } from "next-intl/server";
import { locales } from "@/lib/i18n/routing";
import { absoluteUrl } from "@/lib/structured-data";
import { LANDINGS } from "@/lib/landings";

export const dynamic = "force-static";

/** A plain text guide to the site for AI assistants and answer engines, in English. */
export async function GET() {
  const t = await getTranslations({ locale: "en" });
  const pages: Array<[string, string, string]> = [
    ["SpatialMeet", "/", t("landing.description")],
    [t("metadata.roomsTitle"), "/rooms", t("metadata.roomsDescription")],
    [t("metadata.peopleTitle"), "/people", t("metadata.peopleDescription")],
    [t("metadata.createRoomTitle"), "/create-room", t("metadata.createRoomDescription")],
    ...LANDINGS.map(({ key, slug }): [string, string, string] => [
      t(`landings.pages.${key}.meta.title`),
      `/${slug}`,
      t(`landings.pages.${key}.meta.description`),
    ]),
  ];
  const faqs = t.raw("faq.items") as Array<{ q: string; a: string }>;

  const body = [
    "# SpatialMeet",
    "",
    `> ${t("metadata.description")}`,
    "",
    "## Pages",
    "",
    ...pages.map(([title, path, note]) => `- [${title}](${absoluteUrl("en", path)}): ${note}`),
    "",
    "## Features",
    "",
    ...(t.raw("landing.features") as string[]).map((feature) => `- ${feature}`),
    "",
    "## FAQ",
    "",
    ...faqs.flatMap(({ q, a }) => [`### ${q}`, "", a, ""]),
    "## Languages",
    "",
    ...locales.map(({ code, label }) => `- [${label}](${absoluteUrl(code, "/")})`),
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
