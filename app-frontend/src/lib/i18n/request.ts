import { siteRequestConfig } from "@/lib/i18n/request-config";

// The app's messages (../messages), over the ones both sites share (web-shared/messages).
export default siteRequestConfig(async (locale) => (await import(`../../../messages/${locale}.json`)).default);
