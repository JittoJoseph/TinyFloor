import { APP_URL } from "@/lib/site";
import { localeMetadata } from "@/shell/locale-layout";

// The app's document; both sites share it (web-shared/src/shell), each at its own address.
export { default, generateStaticParams } from "@/shell/locale-layout";
export const generateMetadata = localeMetadata(APP_URL);
