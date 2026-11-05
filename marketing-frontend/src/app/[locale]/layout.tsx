import { SITE_URL } from "web-shared/lib/site";
import { localeMetadata } from "web-shared/shell/locale-layout";

// The marketing site's document; both sites share it (web-shared/src/shell), each at its own address.
export { default, generateStaticParams } from "web-shared/shell/locale-layout";
export const generateMetadata = localeMetadata(SITE_URL);
