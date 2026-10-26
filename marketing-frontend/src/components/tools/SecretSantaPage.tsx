import { ArticleSections, numberItems } from "@/components/guides/ArticleSections";
import { SECRET_SANTA_PATH } from "@/lib/tools/catalog";
import { SECRET_SANTA_UPDATED, type SantaContent } from "@/lib/tools/secret-santa";
import { SecretSantaDrawer } from "./SecretSantaDrawer";
import { ToolPage } from "./ToolPage";

/** The Secret Santa generator (lib/tools/secret-santa): the draw, then how to run it, the rules and gift ideas. */
export function SecretSantaPage({ locale, content }: { locale: string; content: SantaContent }) {
  return (
    <ToolPage
      locale={locale}
      path={SECRET_SANTA_PATH}
      updated={SECRET_SANTA_UPDATED}
      copy={content}
      tool={<SecretSantaDrawer locale={locale} copy={content.drawer} />}
    >
      <ArticleSections sections={numberItems(content.sections)} />
    </ToolPage>
  );
}
