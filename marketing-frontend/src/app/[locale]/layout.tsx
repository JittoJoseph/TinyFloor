import { SITE_URL } from "@/lib/site";
import { localeMetadata } from "@/shell/locale-layout";

// The marketing site's document; both sites share it (web-shared/src/shell), each at its own address.
export { default, generateStaticParams } from "@/shell/locale-layout";
export const generateMetadata = localeMetadata(SITE_URL);
