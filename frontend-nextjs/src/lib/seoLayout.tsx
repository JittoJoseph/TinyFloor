import type { Messages } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";

type MetadataKey = keyof Messages["metadata"];

/**
 * The metadata and the structured data of an indexable route, from one
 * description of it, so the two never disagree about a page.
 */
export function seoLayout(route: {
  path: string;
  title: MetadataKey;
  description: MetadataKey;
  type?: "WebPage" | "CollectionPage";
}) {
  async function Layout({
    children,
    params,
  }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    const t = await getTranslations({
      locale: locale as Locale,
      namespace: "metadata",
    });

    return (
      <>
        <JsonLd
          schema={pageGraph({
            locale,
            path: route.path,
            name: t(route.title),
            description: t(route.description),
            type: route.type,
          })}
        />
        {children}
      </>
    );
  }

  return { generateMetadata: localizedMetadata(route), Layout };
}
