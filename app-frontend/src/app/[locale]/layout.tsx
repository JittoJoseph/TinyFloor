import { APP_URL } from "web-shared/lib/site";
import { localeMetadata } from "web-shared/shell/locale-layout";

// The app's document; both sites share it (web-shared/src/shell), each at its own address.
export { default, generateStaticParams } from "web-shared/shell/locale-layout";
export const generateMetadata = localeMetadata(APP_URL);
